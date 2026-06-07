import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { RULE_SET_TEMPLATES, TEMPLATE_RULES } from '@/data/mockData';
import { TradingAccount, type Mt5ConnectionStatus } from '@/types/fortify';
import { Plus, Trash2, Wallet, ChevronRight, Shield, AlertTriangle, XCircle, BookOpen, Link2, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { useAllRuleEvaluations } from '@/hooks/useRuleEvaluations';
import { mapRowsForAccount } from '@/lib/ruleEvaluationView';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { GuidedEmptyState } from '@/components/BetaReadinessChecklist';
import { getRulesStatusMeta, getSyncErrorMessage, getSyncStatusMeta, maskLogin } from '@/lib/betaReadiness';

// Re-export for backward compatibility
export { useAccountsStore } from '@/hooks/useAccountsStore';

const mt5StatusConfig: Record<Mt5ConnectionStatus, { label: string; icon: typeof Link2; className: string }> = {
  disconnected: { label: 'Desconectada', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  connecting: { label: 'Conectando', icon: RefreshCw, className: 'bg-warning/15 text-warning' },
  connected: { label: 'Conectada', icon: Link2, className: 'bg-success/15 text-success' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'bg-primary/15 text-primary' },
  auth_error: { label: 'Erro de autenticação', icon: AlertTriangle, className: 'bg-destructive/15 text-destructive' },
};

const StatusBadge = ({ status }: { status: 'SAFE' | 'WARNING' | 'VIOLATED' }) => {
  const config = {
    SAFE: { label: 'SEGURO', icon: Shield, className: 'bg-success/15 text-success' },
    WARNING: { label: 'ATENÇÃO', icon: AlertTriangle, className: 'bg-warning/15 text-warning' },
    VIOLATED: { label: 'VIOLADO', icon: XCircle, className: 'bg-destructive/15 text-destructive' },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${c.className}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
};

const Accounts = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accounts, addAccount, removeAccount } = useAccountsStore();
  const { data: ruleRows = [] } = useAllRuleEvaluations();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  // MT5 connections state
  const [mt5Connections, setMt5Connections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Form state
  const [nickname, setNickname] = useState('');
  const [broker, setBroker] = useState('');
  const [origin, setOrigin] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [startBalance, setStartBalance] = useState('');
  const [selectedRuleSetId, setSelectedRuleSetId] = useState(RULE_SET_TEMPLATES[0].id);

  const selectedRules = useMemo(() => TEMPLATE_RULES.filter(r => r.ruleSetId === selectedRuleSetId), [selectedRuleSetId]);

  // Load MT5 connections from Supabase
  useEffect(() => {
    const loadMt5Connections = async () => {
      setLoadingConnections(true);
      try {
        const { data, error } = await supabase
          .from('mt5_connections')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMt5Connections(data || []);
      } catch (error) {
        console.error('Failed to load MT5 connections:', error);
      } finally {
        setLoadingConnections(false);
      }
    };

    loadMt5Connections();
  }, []);

  // Helper to get MT5 connection for an account
  const getMt5Connection = (accountId: string) => {
    return mt5Connections.find(conn => conn.trading_account_id === accountId);
  };

  const handleSyncNow = async (event: React.MouseEvent, account: TradingAccount, mt5Connection?: any) => {
    event.stopPropagation();
    if (!mt5Connection?.id || !user?.id) {
      toast({
        title: 'Sync indisponível',
        description: 'Conecte o MT5 e confirme a sessão do usuário antes de sincronizar.',
        variant: 'destructive',
      });
      return;
    }

    setSyncingId(account.id);
    try {
      const gatewayUrl = import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/metaapi/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: mt5Connection.id, userId: user.id }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({ title: 'Sync falhou', description: getSyncErrorMessage(body), variant: 'destructive' });
        return;
      }

      toast({ title: 'Sync concluído', description: 'Saldo, posições, trades e regras foram atualizados.' });
      queryClient.invalidateQueries({ queryKey: ['trading_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['rule_evaluations'] });

      const { data } = await supabase
        .from('mt5_connections')
        .select('*')
        .order('created_at', { ascending: false });
      setMt5Connections(data || []);
    } catch (error: any) {
      toast({ title: 'Sync falhou', description: error?.message || 'Não foi possível chamar o gateway local.', variant: 'destructive' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(startBalance);
    if (!nickname || !broker || !startBalance || isNaN(balance)) return;

    // Lovable Cloud is the official backend; keep local store behavior here.
    const newAccount: TradingAccount = {
      id: `acc-${Date.now()}`,
      userId: user?.id || 'u1',
      nickname,
      broker: `${broker}${origin ? ` - ${origin}` : ''}`,
      baseCurrency,
      startBalance: balance,
      currentBalance: balance,
      currentEquity: balance,
      highestEquityAllTime: balance,
      status: 'active',
      ruleSetId: selectedRuleSetId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    addAccount(newAccount);
    toast({ title: 'Conta criada', description: 'Conta adicionada localmente.' });

    setShowForm(false);
    setNickname('');
    setBroker('');
    setOrigin('');
    setStartBalance('');
  };

  const fmt = (v: number) => `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="rounded-2xl hero-surface edge-top p-7 md:p-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Portfolio · Contas</p>
          <h1 className="display-editorial-sm text-gradient-steel">Minhas <span className="text-gradient-primary">Contas</span></h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 max-w-md leading-relaxed">
            Cadastre, monitore e proteja cada conta de prop firm em uma única superfície.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/library')} className="pill-btn">
            <BookOpen className="w-4 h-4" />
            Prop Firm Library
          </button>
          <button onClick={() => navigate('/accounts/new')} className="pill-btn pill-btn-primary">
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Cadastrar Nova Conta</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome da Conta</label>
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Ex.: FTMO 100k Challenge" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Corretora / Plataforma</label>
              <input type="text" value={broker} onChange={e => setBroker(e.target.value)} placeholder="Ex.: MT5, cTrader" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Origem / Mesa Proprietária</label>
              <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Ex.: FTMO, Topstep, Hantec" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Moeda Base</label>
              <select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="BRL">BRL</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Saldo Inicial</label>
              <input type="number" value={startBalance} onChange={e => setStartBalance(e.target.value)} placeholder="Ex.: 100000" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" required min="0" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Conjunto de Regras</label>
              <select value={selectedRuleSetId} onChange={e => setSelectedRuleSetId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {RULE_SET_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.firmName ? `(${t.firmName})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedRules.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Regras que serão aplicadas:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedRules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${rule.severity === 'hard' ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'}`}>
                      {rule.severity}
                    </span>
                    <span className="text-xs text-foreground">{rule.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Cadastrar Conta</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((account, i) => {
          const evals = mapRowsForAccount(ruleRows, account.id);
          const pnl = account.currentBalance - account.startBalance;
          const pnlPct = account.startBalance > 0 ? ((pnl / account.startBalance) * 100).toFixed(2) : '0.00';
          const isPositive = pnl >= 0;
          const ruleSet = RULE_SET_TEMPLATES.find(t => t.id === account.ruleSetId);
          
          // MT5 connection info
          const mt5Connection = getMt5Connection(account.id);
          const rawConnectionStatus = mt5Connection?.connection_status ?? 'disconnected';
          const connectionStatus = (rawConnectionStatus || 'disconnected') as Mt5ConnectionStatus;
          const mt5Status = mt5StatusConfig[connectionStatus] || mt5StatusConfig.disconnected;
          const Mt5StatusIcon = mt5Status.icon;
          const syncStatus = getSyncStatusMeta(mt5Connection?.sync_status, mt5Connection?.last_sync_at || account.mt5LastSyncAt, mt5Connection?.sync_error || account.mt5SyncError);
          const rulesStatus = getRulesStatusMeta({
            account: {
              ...account,
              rule_selection_status: account.ruleSelectionStatus,
              rule_set_id: account.ruleSetId,
            },
          });
          const loginLabel = maskLogin(account.mt5Login || mt5Connection?.mt5_login);
          const serverLabel = account.mt5Server || mt5Connection?.mt5_server || 'Servidor não informado';
          const detectedBroker = account.detectedBroker || mt5Connection?.broker_name || account.broker || 'Broker não detectado';

          // Compute account health
          const hasViolation = evals.some(e => e.status === 'VIOLATED');
          const hasWarning = evals.some(e => e.status === 'WARNING');
          const healthStatus = hasViolation ? 'VIOLATED' as const : hasWarning ? 'WARNING' as const : 'SAFE' as const;

          // Key metrics
          const dailyLoss = evals.find(e => e.rule.type === 'MAX_DAILY_LOSS');
          const totalLoss = evals.find(e => e.rule.type === 'MAX_TOTAL_LOSS') || evals.find(e => e.rule.type === 'TRAILING_MAX_LOSS');
          const profitTarget = evals.find(e => e.rule.type === 'PROFIT_TARGET');

          const dailyRemaining = dailyLoss ? Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue) : null;
          const maxLossRemaining = totalLoss ? Math.max(0, totalLoss.limitValue - totalLoss.currentValue) : null;

          // Closest to violation
          const closest = evals
            .filter(e => e.status !== 'VIOLATED' && e.progressPct > 0)
            .sort((a, b) => b.progressPct - a.progressPct)[0];

          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="card-soft lift p-5 space-y-4 cursor-pointer group"
              onClick={() => navigate(`/accounts/${account.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{account.nickname}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{detectedBroker} • {ruleSet?.name || (account.ruleSetId ? 'Regras configuradas' : 'Sem regras')}</p>
                  {mt5Connection && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${mt5Status.className}`}>
                        <Mt5StatusIcon className={`w-2.5 h-2.5 ${connectionStatus === 'connecting' || connectionStatus === 'syncing' ? 'animate-spin' : ''}`} />
                        {mt5Status.label}
                      </span>
                      <span className={`inline-flex items-center text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${syncStatus.className}`}>
                        {syncStatus.label}
                      </span>
                      <span className={`inline-flex items-center text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${rulesStatus.className}`}>
                        {rulesStatus.label}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[10px] text-muted-foreground">
                    <span>Login {loginLabel} · {serverLabel}</span>
                    {account.detectedPropFirm ? <span>Mesa detectada: {account.detectedPropFirm}</span> : null}
                    <span>Último sync: {mt5Connection?.last_sync_at ? new Date(mt5Connection.last_sync_at).toLocaleString('pt-BR') : 'nunca'}</span>
                  </div>
                </div>
                <StatusBadge status={healthStatus} />
              </div>

              {/* Balance & P&L */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Inicial</p>
                  <p className="font-mono text-sm text-muted-foreground">{fmt(account.startBalance)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity Atual</p>
                  <p className="font-mono font-bold text-foreground">{fmt(account.currentEquity)}</p>
                  <p className={`text-xs font-mono font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{pnlPct}%
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                {profitTarget && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground uppercase tracking-wider">Meta de Lucro</span>
                      <span className="font-mono text-foreground">{profitTarget.progressPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, profitTarget.progressPct)}%` }} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {dailyRemaining !== null && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Perda Diária Restante</p>
                      <p className="font-mono font-bold text-sm text-warning">{fmt(dailyRemaining)}</p>
                    </div>
                  )}
                  {maxLossRemaining !== null && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Perda Máx. Restante</p>
                      <p className="font-mono font-bold text-sm text-foreground">{fmt(maxLossRemaining)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Closest to violation */}
              {closest && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Regra mais próxima da violação</p>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0" />
                    <span className="text-xs text-foreground truncate">{closest.rule.name}</span>
                    <span className="text-xs font-mono text-warning ml-auto">{closest.progressPct}%</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                      Excluir
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A conta "{account.nickname}" será movida para o histórico. Você poderá restaurá-la depois.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAccount(account.id);
                          toast({ title: 'Conta excluída', description: `"${account.nickname}" foi movida para o histórico.` });
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={(e) => handleSyncNow(e, account, mt5Connection)}
                    disabled={!mt5Connection?.id || syncingId === account.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
                  >
                    {syncingId === account.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Sync now
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/accounts/${account.id}/rules`);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <Shield className="w-3 h-3" />
                    {account.ruleSetId ? 'View rules' : 'Configure rules'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/accounts/${account.id}`);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3" />
                    Risk plan
                  </button>
                  <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Abrir Painel <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <GuidedEmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description="Comece conectando uma conta MT5 demo real ou criando uma conta pela biblioteca. O beta precisa de uma conta, regras e primeiro sync para liberar o painel de risco."
          actionLabel="Nova Conta"
          onAction={() => navigate('/accounts/new')}
        />
      )}
    </div>
  );
};

export default Accounts;
