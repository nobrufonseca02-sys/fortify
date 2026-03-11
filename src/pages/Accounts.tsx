import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RULE_SET_TEMPLATES, TEMPLATE_RULES, MOCK_EVALUATIONS } from '@/data/mockData';
import { TradingAccount } from '@/types/fortify';
import { Plus, Trash2, Wallet, ChevronRight, Shield, AlertTriangle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';

// Re-export for backward compatibility
export { useAccountsStore } from '@/hooks/useAccountsStore';

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

const getSupabaseUrl = () =>
  (import.meta as any)?.env?.VITE_SUPABASE_URL ||
  (import.meta as any)?.env?.VITE_PUBLIC_SUPABASE_URL ||
  (window as any)?.__SUPABASE_URL__;

const getSupabaseAnonKey = () =>
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any)?.env?.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  (window as any)?.__SUPABASE_ANON_KEY__;

function mapTradingAccountsToStoreAccounts(rows: any[]): TradingAccount[] {
  return (rows || []).map((r) => {
    const startBalance = Number(r.start_balance ?? r.startBalance ?? 0);
    const currentBalance = Number(r.current_balance ?? r.currentBalance ?? startBalance);
    const currentEquity = Number(r.current_equity ?? r.currentEquity ?? currentBalance);
    const highestEquityAllTime = Number(r.highest_equity ?? r.highestEquity ?? currentEquity);

    const mapped: TradingAccount = {
      id: String(r.id),
      userId: String(r.user_id ?? r.userId ?? ''),
      nickname: String(r.nickname ?? ''),
      broker: String(r.broker ?? ''),
      baseCurrency: 'USD',
      startBalance,
      currentBalance,
      currentEquity,
      highestEquityAllTime,
      status: (r.status as any) ?? 'active',
      ruleSetId: 'custom',
      createdAt: String((r.created_at ?? r.createdAt ?? new Date().toISOString()).split('T')[0]),

      mt5Server: r.mt5_server ?? r.mt5Server ?? undefined,
      mt5Login: r.mt5_login ?? r.mt5Login ?? undefined,
      accountType: r.account_type ?? r.accountType ?? undefined,
      propFirm: r.prop_firm ?? r.propFirm ?? undefined,
    };

    return mapped;
  });
}

const Accounts = () => {
  const navigate = useNavigate();
  const { accounts, addAccount, removeAccount } = useAccountsStore();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loadingDbAccounts, setLoadingDbAccounts] = useState(false);

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } });
  }, [supabaseUrl, supabaseAnonKey]);

  // Form state
  const [nickname, setNickname] = useState('');
  const [broker, setBroker] = useState('');
  const [origin, setOrigin] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [startBalance, setStartBalance] = useState('');
  const [selectedRuleSetId, setSelectedRuleSetId] = useState(RULE_SET_TEMPLATES[0].id);

  const selectedRules = TEMPLATE_RULES.filter(r => r.ruleSetId === selectedRuleSetId);

  useEffect(() => {
    let cancelled = false;

    const loadFromDb = async () => {
      if (!supabase || !user?.id) return;

      setLoadingDbAccounts(true);
      try {
        const res = await supabase
          .from('trading_accounts')
          .select('id,user_id,nickname,broker,mt5_server,mt5_login,account_type,prop_firm,start_balance,current_balance,current_equity,highest_equity,status,created_at,updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (res.error) throw res.error;

        const mapped = mapTradingAccountsToStoreAccounts(res.data ?? []);
        if (cancelled) return;

        // Keep store as fallback; DB becomes primary
        const existingIds = new Set(accounts.map(a => a.id));
        mapped.forEach(acc => {
          if (!existingIds.has(acc.id)) addAccount(acc);
        });
      } catch {
        // silently keep local store as temporary fallback
      } finally {
        if (!cancelled) setLoadingDbAccounts(false);
      }
    };

    loadFromDb();

    return () => {
      cancelled = true;
    };
    // intentional: run when auth/supabase ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(startBalance);
    if (!nickname || !broker || !startBalance || isNaN(balance)) return;

    // Prefer DB
    if (supabase && user?.id) {
      try {
        const insertRes = await supabase
          .from('trading_accounts')
          .insert({
            user_id: user.id,
            nickname,
            broker: `${broker}${origin ? ` - ${origin}` : ''}`,
            start_balance: balance,
            current_balance: balance,
            current_equity: balance,
            highest_equity: balance,
            status: 'active',
          })
          .select('id,user_id,nickname,broker,mt5_server,mt5_login,account_type,prop_firm,start_balance,current_balance,current_equity,highest_equity,status,created_at,updated_at')
          .single();

        if (insertRes.error) throw insertRes.error;

        const mapped = mapTradingAccountsToStoreAccounts([insertRes.data])[0];
        addAccount({
          ...mapped,
          baseCurrency,
          ruleSetId: selectedRuleSetId,
        });

        toast({ title: 'Conta criada', description: 'Conta real salva em trading_accounts.' });
      } catch {
        // fallback store
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
        toast({ title: 'Conta criada (fallback)', description: 'Supabase indisponível. Conta criada localmente.' });
      }
    } else {
      // fallback store
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
    }

    setShowForm(false);
    setNickname('');
    setBroker('');
    setOrigin('');
    setStartBalance('');
  };

  const fmt = (v: number) => `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Minhas Contas</h1>
          <p className="text-xs text-muted-foreground">Cadastre e gerencie suas contas de trading.</p>
          {loadingDbAccounts && (
            <p className="text-[10px] text-muted-foreground mt-1">Carregando contas reais...</p>
          )}
        </div>
        <button
          onClick={() => navigate('/accounts/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </button>
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
          const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === account.id);
          const pnl = account.currentBalance - account.startBalance;
          const pnlPct = ((pnl / account.startBalance) * 100).toFixed(2);
          const isPositive = pnl >= 0;
          const ruleSet = RULE_SET_TEMPLATES.find(t => t.id === account.ruleSetId);

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
              className="rounded-xl border border-border bg-card p-5 space-y-4 hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => navigate(`/accounts/${account.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{account.nickname}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{account.broker} • {ruleSet?.name || 'Personalizado'}</p>
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

              <div className="flex items-center justify-between pt-1">
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
                <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Abrir Painel <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Conta" para começar.</p>
        </div>
      )}
    </div>
  );
};

export default Accounts;
