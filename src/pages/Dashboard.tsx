import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, CreditCard, Loader2, Shield, ShieldAlert, ShieldX, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { useAuth } from '@/hooks/useAuth';
import { useAllRuleEvaluations, useSyncAndEvaluate, type RuleEvaluationRow } from '@/hooks/useRuleEvaluations';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { getAccountEvaluationSummary } from '@/lib/ruleEvaluationView';
import { confirmCheckoutSession } from '@/lib/billing';
import { supabase } from '@/integrations/supabase/client';
import { MarketTicker } from '@/components/MarketTicker';
import type { TradingAccount } from '@/types/fortify';

type HealthStatus = 'safe' | 'warning' | 'critical' | 'nodata';

type HealthRow = {
  account: TradingAccount;
  connection: any | null;
  evaluations: RuleEvaluationRow[];
  status: HealthStatus;
  statusLabel: string;
  equityLabel: string;
  dailyRemainingLabel: string;
  drawdownRemainingLabel: string;
  openPositions: number;
  negativeFloatingPnl: number;
  lastSyncLabel: string;
  stale: boolean;
  hasViolation: boolean;
  hasWarning: boolean;
  hasSyncError: boolean;
  bufferPct: number | null;
};

const statusStyle: Record<HealthStatus, { label: string; icon: typeof Shield; className: string; pill: string }> = {
  safe: {
    label: 'Seguro',
    icon: Shield,
    className: 'border-success/20 bg-success/5',
    pill: 'bg-success/15 text-success border-success/20',
  },
  warning: {
    label: 'Atenção',
    icon: ShieldAlert,
    className: 'border-warning/25 bg-warning/5',
    pill: 'bg-warning/15 text-warning border-warning/25',
  },
  critical: {
    label: 'Crítico',
    icon: ShieldX,
    className: 'border-destructive/25 bg-destructive/5',
    pill: 'bg-destructive/15 text-destructive border-destructive/25',
  },
  nodata: {
    label: 'Sem dados',
    icon: AlertTriangle,
    className: 'border-border bg-card',
    pill: 'bg-muted text-muted-foreground border-border',
  },
};

function money(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return 'Sem dados';
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function isStale(value: string | null | undefined) {
  if (!value) return true;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return true;
  return Date.now() - parsed > 6 * 60 * 60 * 1000;
}

function relativeSync(value: string | null | undefined) {
  if (!value) return 'Sem sincronização';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'Sem dados';
  const minutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  return new Date(parsed).toLocaleDateString('pt-BR');
}

function accountConnection(account: TradingAccount, connections: any[]) {
  return connections.find((connection) => connection.trading_account_id === account.id) || null;
}

function buildHealthRow(account: TradingAccount, connection: any | null, evaluations: RuleEvaluationRow[], positions: any[]): HealthRow {
  const summary = getAccountEvaluationSummary(account, evaluations);
  const hasViolation = summary.evals.some((evaluation) => evaluation.status === 'VIOLATED');
  const hasWarning = summary.evals.some((evaluation) => evaluation.status === 'WARNING');
  const connectionStatus = String(connection?.connection_status || '').toLowerCase();
  const syncStatus = String(connection?.sync_status || '').toLowerCase();
  const hasSyncError =
    Boolean(connection?.sync_error) ||
    ['auth_error', 'error', 'failed', 'suspension_pending'].includes(connectionStatus) ||
    ['auth_error', 'error', 'failed', 'suspension_pending'].includes(syncStatus);
  const bufferPct = summary.closestRule ? Math.max(0, 100 - Number(summary.closestRule.progressPct || 0)) : null;
  const stale = isStale(connection?.last_sync_at || account.mt5LastSyncAt);
  const accountPositions = connection
    ? positions.filter((position) => position.connection_id === connection.id)
    : [];
  const negativeFloatingPnl = accountPositions.reduce((sum, position) => {
    const pnl = Number(position.floating_pnl ?? position.profit ?? 0);
    return pnl < 0 ? sum + pnl : sum;
  }, 0);

  let status: HealthStatus = 'safe';
  if (!connection || summary.evals.length === 0) status = 'nodata';
  else if (hasSyncError || hasViolation || (bufferPct !== null && bufferPct <= 10)) status = 'critical';
  else if (hasWarning || stale || (bufferPct !== null && bufferPct <= 30)) status = 'warning';

  return {
    account,
    connection,
    evaluations,
    status,
    statusLabel: statusStyle[status].label,
    equityLabel: money(account.currentEquity),
    dailyRemainingLabel: summary.dailyLoss ? money(summary.dailyRemaining) : 'Sem dados suficientes',
    drawdownRemainingLabel: summary.totalLoss ? money(summary.maxLossRemaining) : 'Sem dados suficientes',
    openPositions: accountPositions.length,
    negativeFloatingPnl,
    lastSyncLabel: relativeSync(connection?.last_sync_at || account.mt5LastSyncAt),
    stale,
    hasViolation,
    hasWarning,
    hasSyncError,
    bufferPct,
  };
}

function summaryStatus(rows: HealthRow[]) {
  if (rows.length === 0 || rows.every((row) => row.status === 'nodata')) return 'Sem dados';
  if (rows.some((row) => row.status === 'critical')) return 'Crítico';
  if (rows.some((row) => row.status === 'warning')) return 'Atenção';
  return 'Seguro';
}

function fortifyScore(rows: HealthRow[]) {
  if (rows.length === 0) return 'Sem dados';
  const score = rows.reduce((sum, row) => {
    if (row.status === 'safe') return sum + 100;
    if (row.status === 'warning') return sum + 68;
    if (row.status === 'critical') return sum + 28;
    return sum + 45;
  }, 0) / rows.length;
  return `${Math.round(score)}/100`;
}

function latestSyncLabel(rows: HealthRow[]) {
  const latest = rows
    .map((row) => row.connection?.last_sync_at || row.account.mt5LastSyncAt)
    .filter(Boolean)
    .map((value) => Date.parse(String(value)))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  if (!latest) return 'Não sincronizado';
  return relativeSync(new Date(latest).toISOString());
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accounts } = useAccountsStore();
  const { user, session } = useAuth();
  const { data: ruleRows = [] } = useAllRuleEvaluations();
  const { accountLimit, activeAccountCount, hasActivePlan } = useSubscriptionPlan();
  const syncMutation = useSyncAndEvaluate();
  const [mt5Connections, setMt5Connections] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutConfirming, setCheckoutConfirming] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const checkoutSessionId = searchParams.get('session_id');

  useEffect(() => {
    async function loadConnections() {
      if (!user?.id) {
        setMt5Connections([]);
        return;
      }
      const { data, error } = await supabase
        .from('mt5_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setMt5Connections((data || []).filter((connection: any) => connection.sync_status !== 'removed'));
    }
    loadConnections();
  }, [user?.id]);

  useEffect(() => {
    async function loadPositions() {
      const ids = mt5Connections.map((connection) => connection.id).filter(Boolean);
      if (ids.length === 0) {
        setPositions([]);
        return;
      }
      const { data, error } = await supabase
        .from('mt5_positions')
        .select('*')
        .in('connection_id', ids)
        .order('updated_at', { ascending: false });
      if (!error) setPositions(data || []);
    }
    loadPositions();
  }, [mt5Connections]);

  useEffect(() => {
    if (!checkoutSuccess || !checkoutSessionId || !session?.access_token) return;
    let active = true;
    setCheckoutConfirming(true);
    confirmCheckoutSession(checkoutSessionId, session.access_token)
      .then(() => {
        if (active) setCheckoutMessage('Pagamento confirmado. Seu plano foi ativado.');
      })
      .catch((error) => {
        if (active) setCheckoutMessage(error?.message || 'Pagamento recebido. Seu plano será ativado em instantes.');
      })
      .finally(() => {
        if (active) setCheckoutConfirming(false);
      });
    return () => {
      active = false;
    };
  }, [checkoutSessionId, checkoutSuccess, session?.access_token]);

  const rows = useMemo(() => {
    return accounts.map((account) => {
      const connection = accountConnection(account, mt5Connections);
      const evaluations = ruleRows.filter((row) => row.trading_account_id === account.id);
      return buildHealthRow(account, connection, evaluations, positions);
    });
  }, [accounts, mt5Connections, positions, ruleRows]);

  const riskyAccount = rows.find((row) => row.status === 'critical') || rows.find((row) => row.status === 'warning') || null;
  const riskyAccountsCount = rows.filter((row) => row.status === 'critical' || row.status === 'warning').length;
  const openPositions = rows.reduce((sum, row) => sum + row.openPositions, 0);
  const negativeFloating = rows.some((row) => row.negativeFloatingPnl < 0);
  const failedSyncRow = rows.find((row) => row.hasSyncError);
  const staleRow = rows.find((row) => row.stale && row.connection);
  const noConnectedAccounts = mt5Connections.filter((connection) => ['connected', 'syncing'].includes(String(connection.connection_status))).length === 0;
  const overall = summaryStatus(rows);
  const score = fortifyScore(rows);
  const latestSync = latestSyncLabel(rows);

  const recommendedAction = useMemo(() => {
    const violated = rows.find((row) => row.hasViolation);
    const critical = rows.find((row) => row.status === 'critical');
    if (accounts.length === 0) {
      return {
        message: 'Conecte sua primeira conta MT5 para iniciar o monitoramento.',
        label: 'Conectar conta MT5',
        onClick: () => navigate('/mt5'),
      };
    }
    if (failedSyncRow) {
      return {
        message: 'Revise a conexão MT5 antes de operar.',
        label: 'Ver conta',
        onClick: () => navigate(`/accounts/${failedSyncRow.account.id}`),
      };
    }
    if (noConnectedAccounts) {
      return {
        message: 'Sincronize suas contas antes do próximo trade.',
        label: 'Conectar conta MT5',
        onClick: () => navigate('/mt5'),
      };
    }
    if (staleRow) {
      return {
        message: 'Sincronize suas contas antes do próximo trade.',
        label: syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar agora',
        onClick: () => staleRow.connection?.id && syncMutation.mutate(staleRow.connection.id),
      };
    }
    if (violated) {
      return {
        message: 'Conta em zona de atenção. Reduza risco antes de operar.',
        label: 'Ver conta',
        onClick: () => navigate(`/accounts/${violated.account.id}`),
      };
    }
    if (critical) {
      return {
        message: 'Conta em zona de atenção. Reduza risco antes de operar.',
        label: 'Ver regras',
        onClick: () => navigate(`/accounts/${critical.account.id}/rules`),
      };
    }
    if (negativeFloating) {
      return {
        message: 'Há operações abertas com perda flutuante. Verifique se ainda existe margem segura antes de manter o trade.',
        label: 'Ver posições',
        onClick: () => navigate('/mt5'),
      };
    }
    return {
      message: 'Tudo certo. Suas contas estão dentro dos limites monitorados.',
      label: 'Ver contas',
      onClick: () => navigate('/accounts'),
    };
  }, [accounts.length, failedSyncRow, navigate, negativeFloating, noConnectedAccounts, rows, staleRow, syncMutation]);

  const insights = useMemo(() => {
    const items: string[] = [];
    if (accounts.length === 0) items.push('Nenhuma conta conectada');
    rows.forEach((row) => {
      if (row.hasSyncError) items.push(`${row.account.nickname}: erro de autenticação ou sync`);
      if (row.hasViolation) items.push(`${row.account.nickname}: regra violada`);
      if (row.bufferPct !== null && row.bufferPct <= 30) items.push(`${row.account.nickname}: conta próxima do limite diário`);
      if (row.hasWarning) items.push(`${row.account.nickname}: drawdown total em atenção`);
      if (row.negativeFloatingPnl < 0) items.push(`${row.account.nickname}: operação aberta em prejuízo`);
      if (row.stale && row.connection) items.push(`${row.account.nickname}: conta sem sincronização recente`);
      if (row.evaluations.length === 0) items.push(`${row.account.nickname}: conta sem regra configurada`);
    });
    return Array.from(new Set(items)).slice(0, 6);
  }, [accounts.length, rows]);

  const summaryCards = [
    { label: 'Fortify Score', value: score, detail: overall, icon: overall === 'Crítico' ? ShieldX : overall === 'Atenção' ? ShieldAlert : Shield },
    { label: 'Contas monitoradas', value: `${rows.length}/${accountLimit || 0}`, detail: `${activeAccountCount} ativas no plano`, icon: CreditCard },
    { label: 'Contas em risco', value: String(riskyAccountsCount), detail: riskyAccount?.account.nickname || 'Sem risco crítico', icon: AlertTriangle },
    { label: 'Posições abertas', value: `${openPositions} abertas`, icon: Zap },
    { label: 'Última sincronização', value: latestSync, detail: staleRow ? 'Revisar antes de operar' : 'Dados recentes', icon: Loader2 },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <MarketTicker />

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl hero-surface edge-top p-5 md:p-6"
      >
        <p className="eyebrow mb-3">Console operacional</p>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Painel de saúde das contas</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Veja risco, drawdown, posições abertas e regras críticas antes do próximo trade.
        </p>
      </motion.header>

      {checkoutSuccess && (
        <div className="rounded-xl border border-success/25 bg-success/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            {checkoutConfirming ? 'Confirmando pagamento com a Stripe...' : checkoutMessage || 'Pagamento recebido. Seu plano será ativado em instantes.'}
          </p>
        </div>
      )}

      {!hasActivePlan && (
        <section className="rounded-xl border border-warning/25 bg-warning/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm text-foreground">Escolha um plano para liberar o monitoramento de contas.</p>
          <button type="button" onClick={() => navigate('/pricing')} className="pill-btn pill-btn-primary">
            Ver planos
          </button>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4 min-h-[104px]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">{card.label}</p>
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground mt-3">{card.value}</p>
              {'detail' in card && card.detail && <p className="text-[11px] text-muted-foreground mt-1 truncate">{card.detail}</p>}
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-mono">Próxima ação recomendada</p>
          <p className="text-sm md:text-base font-semibold text-foreground mt-2">{recommendedAction.message}</p>
        </div>
        <button type="button" onClick={recommendedAction.onClick} disabled={syncMutation.isPending} className="pill-btn pill-btn-primary">
          {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          {recommendedAction.label}
        </button>
      </section>

      {accounts.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-6 text-center">
          <Shield className="w-9 h-9 text-primary mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">Nenhuma conta MT5 conectada ainda.</p>
          <button type="button" onClick={() => navigate('/mt5')} className="pill-btn pill-btn-primary mt-4">
            Conectar conta MT5
          </button>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border/60">
            <h2 className="text-sm font-bold text-foreground">Saúde por conta</h2>
            <p className="text-xs text-muted-foreground mt-1">Status operacional de cada conta monitorada.</p>
          </div>
          <div className="divide-y divide-border/60">
            {rows.map((row) => {
              const style = statusStyle[row.status];
              const Icon = style.icon;
              return (
                <div key={row.account.id} className={`p-4 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr_auto] gap-3 lg:items-center ${style.className}`}>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{row.account.nickname}</p>
                    <p className="text-xs text-muted-foreground">{row.account.broker || row.connection?.mt5_server || 'Mesa/servidor não informado'}</p>
                  </div>
                  <div className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 ${style.pill}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{row.statusLabel}</span>
                  </div>
                  <Metric label="Equity" value={row.equityLabel} />
                  <Metric label="Posições abertas" value={String(row.openPositions)} />
                  <Metric label="Última sincronização" value={row.lastSyncLabel} />
                  <button type="button" onClick={() => navigate(row.status === 'safe' ? `/accounts/${row.account.id}` : `/accounts/${row.account.id}/rules`)} className="pill-btn">
                    {row.status === 'safe' ? 'Ver conta' : 'Ver regras'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">Insights rápidos</h2>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">Sem alertas críticos no momento.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {insights.map((insight) => (
              <div key={insight} className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{insight}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="pt-4 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground/50 font-mono">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </p>
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-xs font-semibold text-foreground mt-1">{value}</p>
    </div>
  );
}

export default Dashboard;
