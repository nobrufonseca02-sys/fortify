import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { type Mt5ConnectionStatus } from '@/types/fortify';
import {
  Plus, Trash2, Wallet, ChevronRight, Shield, AlertTriangle, XCircle, BookOpen, Link2,
  RefreshCw, Loader2, Settings2, ArrowUpRight, ArrowDownRight, HelpCircle,
} from 'lucide-react';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { useAllRuleEvaluations } from '@/hooks/useRuleEvaluations';
import { mapRowsForAccount } from '@/lib/ruleEvaluationView';
import { hasServerMonitoringGap, SERVER_MONITORING_GAP_LABEL } from '@/lib/betaReadiness';
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
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import {
  fetchActiveRuleBindings,
  emptyRuleBindingDraft,
  isRuleBindingDraftComplete,
  getAccountRuleBindingStatus,
  resolveRuleBinding,
  initialBalanceValue,
  accountCurrencyValue,
  type AccountRuleBindingRow,
  type RuleBindingDraft,
} from '@/lib/ruleBinding';
import { RuleBindingSelector } from '@/components/rules/RuleBindingSelector';
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

// NO_DATA is not a cosmetic fourth state. An account with no mt5_connections
// row, or with zero rule evaluations (which is every fast-connected account
// until its rule binding is completed), is *not being monitored* — rendering it
// as SEGURO would assert a safety guarantee Fortify is not actually providing.
// Same trigger Dashboard.tsx's buildHealthRow already uses for its 'nodata'.
type AccountHealthStatus = 'SAFE' | 'WARNING' | 'VIOLATED' | 'NO_DATA';

const StatusBadge = ({ status }: { status: AccountHealthStatus }) => {
  const config: Record<AccountHealthStatus, { label: string; icon: typeof Shield; className: string }> = {
    SAFE: { label: 'SEGURO', icon: Shield, className: 'bg-success/15 text-success' },
    WARNING: { label: 'ATENÇÃO', icon: AlertTriangle, className: 'bg-warning/15 text-warning' },
    VIOLATED: { label: 'VIOLADO', icon: XCircle, className: 'bg-destructive/15 text-destructive' },
    NO_DATA: { label: 'SEM DADOS', icon: HelpCircle, className: 'bg-muted text-muted-foreground' },
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
    setMt5Password('');
    setRuleBindingDraft(emptyRuleBindingDraft());
  };

  // Fast connect: only account name + MT5 login/server/password are required
  // to activate an account. When arriving from the Library with a firm/program
  // already picked (libraryResolved), that specific binding is still saved
  // right away — the trader already made that choice, it's not extra
  // friction. Otherwise the audited rule binding is deliberately deferred:
  // the account is created and shows up here immediately, and the "Vincular
  // regra da mesa" prompt on its card takes the trader to /accounts/:id/rules
  // (AccountRuleManagement) to finish it whenever they're ready. This never
  // auto-fills or auto-acknowledges a binding — that only ever happens
  // through RuleBindingSelector's own manual checkbox.
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!accountName || !mt5Login || !mt5Server || !mt5Password) return;
    // `libraryResolved` is only the *initial* suggestion parsed out of the URL:
    // the trader can freely edit the pre-filled RuleBindingSelector before
    // submitting. Resolve the draft as it actually stands at submit time — the
    // same guard CreateAccount.handleCreate uses — so the trading_accounts row
    // (prop_firm/program/account_type/start_balance/currency) and the
    // account_rule_bindings snapshot can never describe different firms/sizes.
    const submittedBinding = libraryResolved ? resolveRuleBinding(ruleBindingDraft) : null;
    if (libraryResolved && (!isRuleBindingDraftComplete(ruleBindingDraft) || !submittedBinding)) {
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

    const result = await provisionAndConnectTradingAccount({
      supabase,
      userId,
      accessToken: session.access_token,
      gatewayUrl,
      resolvedBinding: submittedBinding,
      ruleBindingDraft: submittedBinding ? ruleBindingDraft : null,
      accountName,
      startBalance: submittedBinding ? parseFloat(initialBalanceValue(submittedBinding.accountSize.initialBalance)) || 0 : undefined,
      currency: submittedBinding ? accountCurrencyValue(submittedBinding.accountSize.initialBalance, submittedBinding.accountSize.currency) : undefined,
      accountType: submittedBinding?.program.programType,
      mt5Login,
      mt5Server,
      mt5Password,
    });

    setSaving(false);

    if (!result.tradingAccountId) {
      toast({ title: 'Erro ao registrar conta', description: result.insertMessage || 'Não foi possível salvar a conta.', variant: 'destructive' });
      return;
    }

    if (result.connectOk) {
      toast({
        title: 'Conta conectada',
        description: result.bindingDeferred
          ? 'Conta ativa. Vincule a regra da mesa quando puder para acompanhar os limites corretos.'
          : 'Conexão e vínculo versionado de regras salvos com sucesso.',
      });
    } else {
      toast({ title: 'Conta criada, MetaApi falhou', description: result.connectMessage || 'Erro ao provisionar MetaApi', variant: 'destructive' });
    }

    if (!result.bindingDeferred && !result.bindingOk) {
      toast({
        title: 'Conta criada com regra pendente',
        description: result.bindingMessage || 'Abra a conta para concluir o vínculo de regras.',
        variant: 'destructive',
      });
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
      // Only the audited account_rule_bindings row counts as "bound".
      // account.detectedPropFirm is a medium-confidence substring guess the
      // gateway makes from the MT5 server name (its own detection_notes ask the
      // trader to confirm program/phase/size), so it must never silence the
      // binding prompt nor be rendered like a confirmed binding.
      const bindingStatus = getAccountRuleBindingStatus(ruleBinding);
      const boundPropFirmName = ruleBinding?.rule_snapshot?.propFirm?.name || null;
      const detectedPropFirmName = account.detectedPropFirm || null;
      const isRuleBound = bindingStatus.code === 'linked' && Boolean(boundPropFirmName);
      // Genuinely bound, but the server evaluator cannot run for it. This is a
      // known cause, so it earns a specific message instead of collapsing into
      // the generic NO_DATA "sync me" reading.
      const serverMonitoringGap = hasServerMonitoringGap({ account, hasActiveBinding: isRuleBound });

      const hasViolation = evals.some(e => e.status === 'VIOLATED');
      const hasWarning = evals.some(e => e.status === 'WARNING');
      // No connection row or no evaluations => nothing is being monitored, so
      // the card must say so instead of collapsing to SAFE.
      const healthStatus: AccountHealthStatus = (!mt5Connection || evals.length === 0)
        ? 'NO_DATA'
        : hasViolation ? 'VIOLATED' : hasWarning ? 'WARNING' : 'SAFE';

      return {
        account, pnl, pnlPct, isPositive, mt5Connection, connectionStatus, mt5Status,
        ruleBinding, bindingStatus, boundPropFirmName, detectedPropFirmName, isRuleBound, healthStatus,
        serverMonitoringGap,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, ruleRows, mt5Connections, ruleBindings]);

  const violatedCount = accountsView.filter(v => v.healthStatus === 'VIOLATED').length;
  const warningCount = accountsView.filter(v => v.healthStatus === 'WARNING').length;
  const noDataCount = accountsView.filter(v => v.healthStatus === 'NO_DATA').length;

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
              {noDataCount > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                  <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {noDataCount} {noDataCount === 1 ? 'conta sem monitoramento' : 'contas sem monitoramento'}
                </span>
              )}
              {/* Only claim "tudo dentro dos limites" when every account is
                  actually being evaluated — an unmonitored account is not a
                  compliant one. */}
              {violatedCount === 0 && warningCount === 0 && noDataCount === 0 && (
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
          className="rounded-lg border border-border bg-card p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground">Conectar conta MT5</h2>
          <LibraryRuleSelectionNotice
            status={librarySelection.status}
            invalidHint="Conecte a conta agora e vincule a regra da mesa logo em seguida."
          />
          <p className="text-[11px] text-muted-foreground">
            Senha MT5 vai só pro backend, provisiona a MetaApi e não é salva em texto puro. Use senha investidor/read-only quando a corretora permitir.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome da conta</label>
              <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Ex.: 100k Challenge Express" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Login MT5</label>
              <Input value={mt5Login} onChange={e => setMt5Login(e.target.value)} placeholder="Ex.: 12345678" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Servidor</label>
              <Input value={mt5Server} onChange={e => setMt5Server(e.target.value)} placeholder="Ex.: ICMarketsSC-Live" required />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">Senha MT5</label>
              <Input
                type="password"
                value={mt5Password}
                onChange={e => setMt5Password(e.target.value)}
                placeholder="Digite a senha MT5"
                autoComplete="off"
                required
              />
            </div>
          </div>

          {libraryResolved && (
            <RuleBindingSelector
              value={ruleBindingDraft}
              onChange={setRuleBindingDraft}
              platformConstraint="MT5"
              disabled={saving}
              initialSelection={librarySelection.status === 'valid' ? librarySelection.initialSelection : undefined}
            />
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="solid"
              disabled={saving || (Boolean(libraryResolved) && !isRuleBindingDraftComplete(ruleBindingDraft))}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Conectar
            </Button>
            <Button type="button" variant="outline" onClick={resetConnectForm}>Cancelar</Button>
          </div>
          {/* The invalid-link notice above already says the binding comes
              later, so don't repeat it in that case. */}
          {!libraryResolved && librarySelection.status !== 'invalid' && (
            <p className="text-[11px] text-muted-foreground">
              O vínculo com a regra da mesa fica pra logo em seguida, depois que a conta conectar.
            </p>
          )}
        </motion.form>
      )}

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accountsView.map(({ account, pnlPct, isPositive, mt5Connection, connectionStatus, mt5Status, bindingStatus, boundPropFirmName, detectedPropFirmName, isRuleBound, healthStatus, serverMonitoringGap }) => {
          const Mt5StatusIcon = mt5Status.icon;

          return (
            <div
              key={account.id}
              className="group rounded-lg border border-border bg-card p-5 space-y-4 cursor-pointer transition-colors hover:border-primary/30 hover:bg-accent/20 focus-within:border-primary/30"
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
                  {isRuleBound ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs font-medium text-primary truncate">{boundPropFirmName}</p>
                      {/* The binding is real and audited — but nothing on the
                          server evaluates it, so saying only "SEM DADOS" here
                          would read as "sync pending" when the actual cause is
                          known and permanent until the account also gets a
                          legacy rule set. */}
                      {serverMonitoringGap && (
                        <p className="flex items-start gap-1 text-[11px] text-warning">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-[1px]" aria-hidden="true" />
                          <span>{SERVER_MONITORING_GAP_LABEL}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/accounts/${account.id}/rules`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-warning hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                        {bindingStatus.actionLabel}
                      </button>
                      {/* The gateway's server-name guess can still be useful
                          context, but only labelled as the guess it is. */}
                      {bindingStatus.code === 'pending' && detectedPropFirmName && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {detectedPropFirmName} (detectado, não vinculado)
                        </p>
                      )}
                    </div>
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
                ) : (
                  /* Several gateway failure paths return before ever inserting
                     an mt5_connections row. Rendering nothing here used to let a
                     card show equity 0, no connection indicator at all and a
                     green shield at the same time. */
                  <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    <XCircle className="w-3 h-3" aria-hidden="true" />
                    Sem conexão MT5
                  </span>
                )}
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
