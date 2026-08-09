import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { type Mt5ConnectionStatus } from '@/types/fortify';
import {
  Plus, Trash2, Wallet, ChevronRight, Shield, AlertTriangle, XCircle, BookOpen, Link2,
  RefreshCw, Loader2, Cloud, Settings2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { useAllRuleEvaluations } from '@/hooks/useRuleEvaluations';
import { mapRowsForAccount } from '@/lib/ruleEvaluationView';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { GuidedEmptyState } from '@/components/BetaReadinessChecklist';
import { getConnectErrorMessage } from '@/lib/betaReadiness';
import { gatewayJsonHeaders } from '@/lib/gateway';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { RuleBindingSelector } from '@/components/rules/RuleBindingSelector';
import {
  accountCurrencyValue,
  emptyRuleBindingDraft,
  fetchActiveRuleBindings,
  initialBalanceValue,
  isRuleBindingDraftComplete,
  saveAccountRuleBinding,
  type AccountRuleBindingRow,
  type RuleBindingDraft,
} from '@/lib/ruleBinding';
import { parseLibraryRuleSelection, LibraryRuleSelectionNotice } from '@/lib/libraryRuleSelection';
import { provisionAndConnectTradingAccount } from '@/lib/accountProvisioning';

// Re-export for backward compatibility
export { useAccountsStore } from '@/hooks/useAccountsStore';

const mt5StatusConfig: Record<Mt5ConnectionStatus, { label: string; icon: typeof Link2; className: string }> = {
  disconnected: { label: 'Desconectada', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  connecting: { label: 'Conectando', icon: RefreshCw, className: 'bg-warning/15 text-warning' },
  connected: { label: 'Conectada', icon: Link2, className: 'bg-success/15 text-success' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'bg-primary/15 text-primary' },
  auth_error: { label: 'Erro de autenticação', icon: AlertTriangle, className: 'bg-destructive/15 text-destructive' },
};

const PROVIDER_META = {
  metaapi: { label: 'MetaApi', icon: Cloud },
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
  const location = useLocation();
  const queryClient = useQueryClient();
  const { accounts, removeAccount } = useAccountsStore();
  const { data: ruleRows = [] } = useAllRuleEvaluations();
  const { user, session } = useAuth();
  const userId = user?.id;
  const plan = useSubscriptionPlan();

  const librarySelection = useMemo(
    () => parseLibraryRuleSelection(location.search),
    [location.search],
  );
  const libraryResolved = librarySelection.status === 'valid' ? librarySelection.resolved : undefined;

  // MT5 connections state
  const [mt5Connections, setMt5Connections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [ruleBindings, setRuleBindings] = useState<Record<string, AccountRuleBindingRow>>({});

  // Connect form state
  const [showConnectForm, setShowConnectForm] = useState(() => librarySelection.status !== 'none');
  const [saving, setSaving] = useState(false);
  const [accountName, setAccountName] = useState(() => libraryResolved
    ? `${libraryResolved.program.firm} ${libraryResolved.accountSize.label}`
    : '');
  const [mt5Login, setMt5Login] = useState('');
  const [mt5Server, setMt5Server] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [mt5Password, setMt5Password] = useState('');
  const [ruleBindingDraft, setRuleBindingDraft] = useState<RuleBindingDraft>(() =>
    librarySelection.status === 'valid'
      ? { ...librarySelection.initialSelection, manualRuleAcknowledgement: false }
      : emptyRuleBindingDraft(),
  );

  const canConnectNewAccount = plan.hasActivePlan && plan.remainingAccounts > 0;

  const openConnectForm = () => {
    if (!canConnectNewAccount) {
      toast({
        title: 'Plano Fortify necessário',
        description: plan.hasActivePlan ? 'Você atingiu o limite de contas do seu plano.' : 'Escolha um plano ou solicite acesso beta em Planos.',
        variant: 'destructive',
      });
      return;
    }
    setShowConnectForm(true);
  };

  // Load MT5 connections + rule bindings from Supabase
  const refreshConnectionData = async () => {
    if (!userId) {
      setMt5Connections([]);
      return;
    }
    setLoadingConnections(true);
    try {
      const { data, error } = await supabase
        .from('mt5_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMt5Connections((data || []).filter((conn: any) => conn.sync_status !== 'removed'));
      try {
        const bindings = await fetchActiveRuleBindings(userId);
        setRuleBindings(
          Object.fromEntries(
            bindings
              .filter((binding) => binding.trading_account_id)
              .map((binding) => [binding.trading_account_id as string, binding]),
          ),
        );
      } catch (bindingError) {
        console.warn('Failed to load account rule bindings:', bindingError);
        setRuleBindings({});
      }
    } catch (error) {
      console.error('Failed to load MT5 connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  useEffect(() => {
    refreshConnectionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Helper to get MT5 connection for an account
  const getMt5Connection = (accountId: string) => {
    return mt5Connections.find(conn => conn.trading_account_id === accountId);
  };

  const resetConnectForm = () => {
    setShowConnectForm(false);
    setAccountName('');
    setMt5Login('');
    setMt5Server('');
    setBrokerName('');
    setMt5Password('');
    setRuleBindingDraft(emptyRuleBindingDraft());
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!accountName || !mt5Login || !mt5Server || !brokerName || !mt5Password) return;
    if (!isRuleBindingDraftComplete(ruleBindingDraft)) {
      toast({
        title: 'Vínculo de regras obrigatório',
        description: 'Complete a regra oficial e confirme os itens manuais antes de conectar.',
        variant: 'destructive',
      });
      return;
    }
    if (!session?.access_token) {
      toast({ title: 'Sessão necessária', description: 'Faça login novamente antes de conectar o MT5.', variant: 'destructive' });
      return;
    }
    if (!canConnectNewAccount) {
      toast({
        title: 'Plano Fortify necessário',
        description: plan.hasActivePlan ? 'Você atingiu o limite de contas do seu plano.' : 'Escolha um plano ou solicite acesso beta antes de conectar.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const gatewayUrl = import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';

    // Both branches below only ever close the form and refresh this page's
    // own data on completion — never navigate away. The RuleBindingSelector
    // already forces a completed, acknowledged binding before submit is even
    // enabled, so by the time either branch finishes, the account (and its
    // rule binding, when it succeeds) already exists; the trader should just
    // see it appear here, including a degraded "Erro de autenticação" card
    // state if MetaApi rejected the credentials, rather than being routed
    // off this page.
    if (libraryResolved) {
      const result = await provisionAndConnectTradingAccount({
        supabase,
        userId,
        accessToken: session.access_token,
        gatewayUrl,
        resolvedBinding: libraryResolved,
        ruleBindingDraft,
        accountName,
        startBalance: parseFloat(initialBalanceValue(libraryResolved.accountSize.initialBalance)) || 0,
        currency: accountCurrencyValue(libraryResolved.accountSize.initialBalance, libraryResolved.accountSize.currency),
        accountType: libraryResolved.program.programType,
        mt5Login,
        mt5Server,
        mt5Broker: brokerName,
        mt5Password,
      });

      setSaving(false);

      if (!result.tradingAccountId) {
        toast({ title: 'Erro ao registrar conta', description: result.insertMessage || 'Não foi possível salvar a conta.', variant: 'destructive' });
        return;
      }

      if (result.connectOk) {
        toast({ title: 'Conta MetaApi registrada', description: 'Conexão e vínculo versionado de regras salvos com sucesso.' });
      } else {
        toast({ title: 'Conta criada, MetaApi falhou', description: result.connectMessage || 'Erro ao provisionar MetaApi', variant: 'destructive' });
      }

      if (!result.bindingOk) {
        toast({
          title: 'Conta criada com regra pendente',
          description: result.bindingMessage || 'Abra a conta para concluir o vínculo de regras.',
          variant: 'destructive',
        });
      }
    } else {
      // Plain connect flow (no Library selection): the gateway creates the
      // trading_accounts row itself when tradingAccountId is null.
      try {
        const res = await fetch(`${gatewayUrl}/metaapi/connect`, {
          method: 'POST',
          headers: gatewayJsonHeaders(session.access_token),
          body: JSON.stringify({
            accountName,
            mt5Login,
            mt5Server,
            brokerName,
            mt5Password,
            tradingAccountId: null,
            userId,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          setSaving(false);
          console.error('MetaApi connection failed:', data);
          toast({ title: 'Erro ao registrar conta', description: getConnectErrorMessage(data), variant: 'destructive' });
          return;
        }

        if (!data?.tradingAccountId || !data?.connection?.id) {
          setSaving(false);
          toast({
            title: 'Conta criada com regra pendente',
            description: 'O gateway não retornou os identificadores necessários para salvar o vínculo.',
            variant: 'destructive',
          });
        } else {
          try {
            await saveAccountRuleBinding({
              userId,
              tradingAccountId: data.tradingAccountId,
              mt5ConnectionId: data.connection.id,
              draft: ruleBindingDraft,
            });
            toast({ title: 'Conta MetaApi registrada', description: 'Conexão e vínculo versionado de regras salvos com sucesso.' });
          } catch (error: any) {
            toast({
              title: 'Conta criada com regra pendente',
              description: error?.message || 'Abra a conta para concluir o vínculo de regras.',
              variant: 'destructive',
            });
          }
        }
        setSaving(false);
      } catch (err: any) {
        setSaving(false);
        console.error('MetaApi connection error:', err);
        toast({ title: 'Erro ao registrar conta', description: err?.message || 'Erro de conexão com o backend', variant: 'destructive' });
        return;
      }
    }

    resetConnectForm();
    queryClient.invalidateQueries({ queryKey: ['trading_accounts'] });
    refreshConnectionData();
  };

  // Currency-aware formatting (falls back to the previous hardcoded "$" only
  // if the account's currency code is missing/invalid) — display-only change,
  // does not touch any stored or computed value.
  const fmt = (v: number, currency?: string) => {
    const code = (currency || 'USD').toUpperCase();
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(v);
    } catch {
      return `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
    }
  };

  // Same per-account derivation the card grid already did inline, hoisted so
  // the header summary strip and the cards read from one computed source
  // instead of duplicating (and risking drifting from) the logic.
  const accountsView = useMemo(() => {
    return accounts.map((account) => {
      const evals = mapRowsForAccount(ruleRows, account.id);
      const pnl = account.currentBalance - account.startBalance;
      const pnlPct = account.startBalance > 0 ? ((pnl / account.startBalance) * 100).toFixed(2) : '0.00';
      const isPositive = pnl >= 0;

      const mt5Connection = getMt5Connection(account.id);
      const rawConnectionStatus = mt5Connection?.connection_status ?? 'disconnected';
      const connectionStatus = (rawConnectionStatus || 'disconnected') as Mt5ConnectionStatus;
      const mt5Status = mt5StatusConfig[connectionStatus] || mt5StatusConfig.disconnected;
      const ruleBinding = ruleBindings[account.id];
      const propFirmName = ruleBinding?.rule_snapshot?.propFirm?.name || account.detectedPropFirm || null;

      const hasViolation = evals.some(e => e.status === 'VIOLATED');
      const hasWarning = evals.some(e => e.status === 'WARNING');
      const healthStatus = hasViolation ? 'VIOLATED' as const : hasWarning ? 'WARNING' as const : 'SAFE' as const;

      return { account, pnl, pnlPct, isPositive, mt5Connection, connectionStatus, mt5Status, ruleBinding, propFirmName, healthStatus };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, ruleRows, mt5Connections, ruleBindings]);

  const violatedCount = accountsView.filter(v => v.healthStatus === 'VIOLATED').length;
  const warningCount = accountsView.filter(v => v.healthStatus === 'WARNING').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-[1.75rem] font-bold text-foreground tracking-tight">Minhas Contas</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Conecte sua conta MT5 e acompanhe a saúde dela em um só lugar.
          </p>
          {accounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
                <strong className="font-mono font-semibold text-foreground tabular-nums">{accounts.length}</strong>
                {accounts.length === 1 ? 'conta conectada' : 'contas conectadas'}
              </span>
              {violatedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {violatedCount} {violatedCount === 1 ? 'conta violada' : 'contas violadas'}
                </span>
              )}
              {warningCount > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium text-warning">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  {warningCount} em atenção
                </span>
              )}
              {violatedCount === 0 && warningCount === 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium text-success">
                  <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                  Tudo dentro dos limites
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
          <button
            onClick={openConnectForm}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Conectar Conta
          </button>
          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => navigate('/library')} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              Biblioteca de mesas
            </button>
            <button onClick={() => navigate('/accounts/new')} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
              Configuração avançada
            </button>
          </div>
        </div>
      </div>

      {showConnectForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleConnect}
          className="rounded-xl border border-border bg-card p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground">Conectar conta MT5</h2>
          <LibraryRuleSelectionNotice status={librarySelection.status} />
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sua conta Fortify é usada para acessar o dashboard. O login, servidor e senha MT5 são enviados somente ao backend local para provisionar a MetaApi; a senha não é exibida novamente nem salva em texto puro no Supabase. Use senha investidor/read-only quando a corretora permitir.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-primary bg-primary/5 p-3">
            <Cloud className="w-4 h-4 mt-0.5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">{PROVIDER_META.metaapi.label}</div>
              <div className="text-[11px] text-muted-foreground">Sincronização cloud automática.</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome da conexão</label>
              <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Ex.: FTMO 100k" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Login MT5</label>
              <Input value={mt5Login} onChange={e => setMt5Login(e.target.value)} placeholder="Ex.: 12345678" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Servidor</label>
              <Input value={mt5Server} onChange={e => setMt5Server(e.target.value)} placeholder="Ex.: ICMarketsSC-Live" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Broker</label>
              <Input value={brokerName} onChange={e => setBrokerName(e.target.value)} placeholder="Ex.: IC Markets" required />
            </div>
            <div className="space-y-1.5 md:col-span-4">
              <label className="text-xs font-medium text-muted-foreground">Senha MT5</label>
              <Input
                type="password"
                value={mt5Password}
                onChange={e => setMt5Password(e.target.value)}
                placeholder="Digite a senha MT5"
                autoComplete="off"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Use a senha de acesso da conta MT5 fornecida pela mesa para sincronização via MetaApi.
              </p>
            </div>
          </div>

          <RuleBindingSelector
            value={ruleBindingDraft}
            onChange={setRuleBindingDraft}
            platformConstraint="MT5"
            disabled={saving}
            initialSelection={librarySelection.status === 'valid' ? librarySelection.initialSelection : undefined}
          />

          <div className="flex items-center gap-3">
            <Button type="submit" variant="solid" disabled={saving || !isRuleBindingDraftComplete(ruleBindingDraft)}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={resetConnectForm}>Cancelar</Button>
          </div>
        </motion.form>
      )}

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accountsView.map(({ account, pnlPct, isPositive, mt5Connection, connectionStatus, mt5Status, propFirmName, healthStatus }) => {
          const Mt5StatusIcon = mt5Status.icon;

          return (
            <div
              key={account.id}
              className="group rounded-xl border border-border bg-card p-5 space-y-4 cursor-pointer transition-colors hover:border-primary/30 hover:bg-accent/20 focus-within:border-primary/30"
              onClick={() => navigate(`/accounts/${account.id}`)}
            >
              {/* Header: nome, mesa proprietária em destaque, saúde */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{account.nickname}</h3>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                          aria-label={`Excluir conta ${account.nickname}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                  </div>
                  {propFirmName ? (
                    <p className="text-xs font-medium text-primary mt-1 truncate">{propFirmName}</p>
                  ) : (
                    <p className="inline-flex items-center gap-1 text-xs font-medium text-warning mt-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                      Vincular regra da mesa
                    </p>
                  )}
                </div>
                <StatusBadge status={healthStatus} />
              </div>

              {/* Conexão MT5 + frescor do dado (só o essencial) */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] min-h-[22px]">
                {loadingConnections && !mt5Connection ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    Verificando conexão
                  </span>
                ) : mt5Connection ? (
                  <>
                    <span className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${mt5Status.className}`}>
                      <Mt5StatusIcon className={`w-3 h-3 ${connectionStatus === 'connecting' || connectionStatus === 'syncing' ? 'animate-spin' : ''}`} aria-hidden="true" />
                      {mt5Status.label}
                    </span>
                    {mt5Connection.last_sync_at && (
                      <span className="text-muted-foreground">
                        Sincronizado {new Date(mt5Connection.last_sync_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                  </>
                ) : null}
              </div>

              {/* Equity + P&L */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Equity</span>
                <div className="text-right">
                  <span className="font-mono font-bold text-foreground tabular-nums">{fmt(account.currentEquity, account.baseCurrency)}</span>
                  <span className={`ml-2 inline-flex items-center gap-0.5 text-xs font-mono font-semibold tabular-nums ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" aria-hidden="true" /> : <ArrowDownRight className="w-3 h-3" aria-hidden="true" />}
                    {isPositive ? '+' : ''}{pnlPct}%
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/accounts/${account.id}`);
                }}
                className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1 -mx-1 py-1"
              >
                Ver detalhes
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <GuidedEmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description="Conecte uma conta MT5 demo real pra começar. Assim que conectar, você já vê a mesa proprietária vinculada e a saúde da conta aqui."
          actionLabel="Conectar Conta"
          onAction={openConnectForm}
        />
      )}
    </div>
  );
};

export default Accounts;
