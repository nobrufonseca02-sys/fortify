import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { useAuth } from '@/hooks/useAuth';
import { useAllRuleEvaluations, type RuleEvaluationRow } from '@/hooks/useRuleEvaluations';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getAccountEvaluationSummary, type MappedRuleEvaluation } from '@/lib/ruleEvaluationView';
import { confirmCheckoutSession } from '@/lib/billing';
import { trackPurchase } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { MarketTicker } from '@/components/MarketTicker';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support';
import { fortifyMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useLatestCanonicalEvaluations } from '@/hooks/useCanonicalRuleEvaluations';
import { fetchActiveRuleBindings } from '@/lib/ruleBinding';
import {
  currentCanonicalEvaluation,
  summarizeCanonicalEvaluation,
  type CanonicalRuleEvaluationRow,
} from '@/lib/canonicalEvaluationView';
import {
  assessConnectionHealth,
  resolveAccountStatus,
  ruleStatusFromLegacyEvaluations,
  type AccountStatusView,
} from '@/lib/accountHealth';
import type { TradingAccount } from '@/types/fortify';

type HealthStatus = 'safe' | 'warning' | 'critical' | 'nodata';

type HealthRow = {
  account: TradingAccount;
  connection: any | null;
  evaluations: RuleEvaluationRow[];
  /** Same evaluations, mapped to their human-readable rule name/message —
   * the exact shape getAccountEvaluationSummary() already computes below.
   * Kept alongside the raw rows purely so the recent-activity feed doesn't
   * need to re-derive it; nothing about the evaluation logic changes. */
  evals: MappedRuleEvaluation[];
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

type AssetRiskSummary = {
  symbol: string;
  openPositions: number;
  floatingPnl: number;
};

const statusStyle: Record<HealthStatus, { label: string; className: string; textClass: string }> = {
  safe: {
    label: 'Seguro',
    className: 'border-success/20 bg-success/5',
    textClass: 'text-success',
  },
  warning: {
    label: 'Atenção',
    className: 'border-warning/25 bg-warning/5',
    textClass: 'text-warning',
  },
  critical: {
    label: 'Crítico',
    className: 'border-destructive/25 bg-destructive/5',
    textClass: 'text-destructive',
  },
  nodata: {
    label: 'Sem dados',
    className: 'border-border bg-card',
    textClass: 'text-muted-foreground',
  },
};

/** Fully-round translucent status pill (the reference dashboards' badge
 * language) expressed with the project's own status tokens instead of raw
 * Tailwind palette colors, so both themes stay correct. */
const statusPill: Record<HealthStatus, string> = {
  safe: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  critical: 'border-destructive/35 bg-destructive/10 text-destructive',
  nodata: 'border-border bg-muted/40 text-muted-foreground',
};

/** Literal Tailwind class per status, kept as its own map (rather than
 * deriving from statusStyle.textClass at runtime) so the JIT scanner can
 * actually see and keep these background-color utilities. */
const healthBarColor: Record<HealthStatus, string> = {
  safe: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
  nodata: 'bg-muted-foreground/30',
};

/** Presentation-only helper: maps the translated label returned by
 * `summaryStatus()` back to its `statusStyle` entry, so the hero badge can
 * reuse the exact same status vocabulary/colors as the per-account rows
 * without touching `summaryStatus()` itself. */
function statusStyleFromLabel(label: string): HealthStatus {
  const entry = (Object.entries(statusStyle) as [HealthStatus, (typeof statusStyle)[HealthStatus]][]).find(
    ([, style]) => style.label === label,
  );
  return entry ? entry[0] : 'nodata';
}

function money(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return 'Sem dados';
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function signedMoney(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return 'Sem dados';
  const amount = Number(value);
  const formatted = Math.abs(amount).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

/** Agrupa o status detalhado de resolveAccountStatus nas 4 faixas visuais do
 * painel. "Seguro" só sai de uma conta realmente segura; conexão com erro ou
 * sync travado contam como crítico; parcial/sem dados/não monitorável ficam
 * na faixa neutra. */
function healthBucket(view: AccountStatusView): HealthStatus {
  if (view.tone === 'success') return 'safe';
  if (view.tone === 'danger') return 'critical';
  if (view.tone === 'warning') return 'warning';
  return 'nodata';
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

function relativeDelay(value: number) {
  const minutes = Math.max(0, Math.round((Date.now() - value) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

function formatAccountCount(count: number, limit: number) {
  return `${count}/${limit || 0}`;
}

function formatSyncedCount(count: number) {
  return count === 1 ? '1 sincronizada' : `${count} sincronizadas`;
}

function formatPositionCount(count: number) {
  return count === 1 ? '1 posição' : `${count} posições`;
}

function formatPercent(value: number | null | undefined, maximumFractionDigits = 2) {
  if (!Number.isFinite(Number(value))) return 'Sem dados';
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits })}%`;
}

function getPositionSymbol(position: any) {
  return String(position?.symbol || position?.instrument || 'Sem ativo').trim().toUpperCase();
}

function buildAssetRiskSummary(positions: any[]): AssetRiskSummary[] {
  const bySymbol = new Map<string, AssetRiskSummary>();

  positions.forEach((position) => {
    const symbol = getPositionSymbol(position);
    const current = bySymbol.get(symbol) || { symbol, openPositions: 0, floatingPnl: 0 };
    current.openPositions += 1;
    current.floatingPnl += Number(position?.floating_pnl ?? position?.profit ?? 0) || 0;
    bySymbol.set(symbol, current);
  });

  return Array.from(bySymbol.values()).sort((a, b) => Math.abs(b.floatingPnl) - Math.abs(a.floatingPnl));
}

function accountConnection(account: TradingAccount, connections: any[]) {
  return connections.find((connection) => connection.trading_account_id === account.id) || null;
}

function shortDayLabel(value: string) {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return String(value);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

/** Consolidated equity per day across every connected account — real
 * mt5_account_snapshots rows summed by date, so the chart shows the whole
 * portfolio instead of one account. */
function aggregateEquitySeries(snapshots: any[], limit = 30) {
  const byDate = new Map<string, number>();
  snapshots.forEach((snapshot) => {
    const date = String(snapshot?.date || '');
    if (!date) return;
    byDate.set(date, (byDate.get(date) || 0) + (Number(snapshot?.equity) || 0));
  });
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-limit)
    .map(([date, equity]) => ({ date, label: shortDayLabel(date), equity }));
}

function buildHealthRow(
  account: TradingAccount,
  connection: any | null,
  evaluations: RuleEvaluationRow[],
  positions: any[],
  binding: { hasActiveBinding: boolean; canonical: CanonicalRuleEvaluationRow | null },
): HealthRow {
  // Conta vinculada: status e margens vêm só da avaliação canônica do servidor.
  // Sem vínculo, o catálogo antigo é o fallback explícito.
  if (binding.hasActiveBinding) evaluations = [];
  const canonical = binding.canonical ? summarizeCanonicalEvaluation(binding.canonical) : null;
  const summary = getAccountEvaluationSummary(account, evaluations);
  const hasViolation = summary.evals.some((evaluation) => evaluation.status === 'VIOLATED');
  const hasWarning = summary.evals.some((evaluation) => evaluation.status === 'WARNING');
  const health = assessConnectionHealth(connection, { fallbackLastSyncAt: account.mt5LastSyncAt });
  const hasSyncError = health.state === 'connection_error' || health.state === 'sync_stuck';
  const bufferPct = binding.hasActiveBinding
    ? canonical?.worstLossPercentage != null ? Math.max(0, 100 - canonical.worstLossPercentage) : null
    : summary.closestRule ? Math.max(0, 100 - Number(summary.closestRule.progressPct || 0)) : null;
  const stale = health.state === 'stale' || health.state === 'no_data';
  const accountPositions = connection
    ? positions.filter((position) => position.connection_id === connection.id)
    : [];
  const negativeFloatingPnl = accountPositions.reduce((sum, position) => {
    const pnl = Number(position.floating_pnl ?? position.profit ?? 0);
    return pnl < 0 ? sum + pnl : sum;
  }, 0);

  let ruleStatus = binding.hasActiveBinding
    ? canonical?.overallStatus ?? null
    : ruleStatusFromLegacyEvaluations(summary.evals);
  // O motor canônico já classifica pelas faixas 70/85/100%; o reforço por
  // margem vale só para o catálogo antigo.
  if (!binding.hasActiveBinding && ruleStatus === 'safe' && bufferPct !== null && bufferPct <= 10) ruleStatus = 'critical';
  else if (!binding.hasActiveBinding && ruleStatus === 'safe' && bufferPct !== null && bufferPct <= 30) ruleStatus = 'warning';
  const statusView = resolveAccountStatus({
    health,
    hasRuleBinding: binding.hasActiveBinding || summary.evals.length > 0,
    ruleStatus,
  });
  const remainingLabel = (rule: { remainingValue: number | null } | null) =>
    rule && rule.remainingValue !== null ? money(rule.remainingValue) : 'Sem dados suficientes';
  const status = healthBucket(statusView);

  return {
    account,
    connection,
    evaluations,
    evals: summary.evals,
    status,
    statusLabel: statusView.label,
    equityLabel: money(account.currentEquity),
    dailyRemainingLabel: binding.hasActiveBinding
      ? remainingLabel(canonical?.dailyLoss ?? null)
      : summary.dailyLoss ? money(summary.dailyRemaining) : 'Sem dados suficientes',
    drawdownRemainingLabel: binding.hasActiveBinding
      ? remainingLabel(canonical?.maxDrawdown ?? null)
      : summary.totalLoss ? money(summary.maxLossRemaining) : 'Sem dados suficientes',
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
  // Uma conta sem confirmação (parcial, sem dados, não monitorável) impede o
  // resumo geral de afirmar "Seguro".
  if (rows.some((row) => row.status !== 'safe')) return 'Sem dados';
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

function latestSyncInfo(rows: HealthRow[], hasStaleSync: boolean) {
  const latest = rows
    .map((row) => row.connection?.last_sync_at || row.account.mt5LastSyncAt)
    .filter(Boolean)
    .map((value) => Date.parse(String(value)))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  if (!latest) return { value: 'Não sincronizado', detail: 'Conecte ou sincronize uma conta' };
  const date = new Date(latest);
  return {
    value: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    detail: hasStaleSync ? `Sync atrasado - ${relativeDelay(latest)}` : `Atualizado ${relativeDelay(latest)}`,
  };
}

/** The account whose closest rule has the least buffer left (bufferPct is
 * already computed per row in buildHealthRow — this just finds the minimum
 * across accounts that have a rule to measure against). */
function riskBudgetUsage(rows: HealthRow[]) {
  const withBuffer = rows.filter((row): row is HealthRow & { bufferPct: number } => row.bufferPct !== null);
  if (withBuffer.length === 0) return null;
  const worst = withBuffer.reduce((min, row) => (row.bufferPct < min.bufferPct ? row : min), withBuffer[0]);
  return { usedPct: Math.max(0, Math.min(100, 100 - worst.bufferPct)), account: worst.account, bufferPct: worst.bufferPct };
}

type ActivityEvent = {
  id: string;
  accountName: string;
  ruleName: string;
  message: string;
  status: MappedRuleEvaluation['status'];
  computedAt: string;
};

/** Flattens every account's already-computed rule evaluations into one feed,
 * newest first — real computed_at timestamps and messages, nothing invented. */
function buildRecentActivity(rows: HealthRow[], limit = 6): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  rows.forEach((row) => {
    row.evals.forEach((evaluation) => {
      if (!evaluation.computedAt) return;
      events.push({
        id: evaluation.id,
        accountName: row.account.nickname,
        ruleName: evaluation.rule.name,
        message: evaluation.message || 'Regra avaliada.',
        status: evaluation.status,
        computedAt: evaluation.computedAt,
      });
    });
  });
  return events.sort((a, b) => Date.parse(b.computedAt) - Date.parse(a.computedAt)).slice(0, limit);
}

const activityStatus: Record<MappedRuleEvaluation['status'], HealthStatus> = {
  APPROVING: 'safe',
  WARNING: 'warning',
  VIOLATED: 'critical',
  NOT_MET: 'nodata',
};

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accounts } = useAccountsStore();
  const { user, session } = useAuth();
  const { data: ruleRows = [] } = useAllRuleEvaluations();
  const { data: canonicalByAccount = {} } = useLatestCanonicalEvaluations();
  const { data: activeBindings = [] } = useQuery({
    queryKey: ['account_rule_bindings', session?.user?.id, 'active'],
    queryFn: () => fetchActiveRuleBindings(session!.user.id),
    enabled: !!session?.user?.id,
    staleTime: 60 * 1000,
  });
  const { accountLimit, hasActivePlan, plans } = useSubscriptionPlan();
  const shouldReduceMotion = useReducedMotion();
  const [mt5Connections, setMt5Connections] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutConfirming, setCheckoutConfirming] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const checkoutSessionId = searchParams.get('session_id');

  // Recharts renders stroke/fill as raw SVG attributes, which don't resolve
  // var(--token) — useThemeColors reads the computed token values and
  // re-reads them when the theme toggle flips data-theme.
  const chartColors = useThemeColors({
    primary: '--primary',
    success: '--success',
    destructive: '--destructive',
    border: '--border',
    muted: '--muted-foreground',
    popover: '--popover',
    popoverForeground: '--popover-foreground',
  });

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
    async function loadSnapshots() {
      const ids = mt5Connections.map((connection) => connection.id).filter(Boolean);
      if (ids.length === 0) {
        setSnapshots([]);
        return;
      }
      // Same table Performance.tsx charts (mt5_account_snapshots) — here we
      // only need connection_id/date/equity for the consolidated curve and
      // the per-account sparklines.
      const { data, error } = await supabase
        .from('mt5_account_snapshots')
        .select('connection_id, date, equity')
        .in('connection_id', ids)
        .order('date', { ascending: true });
      if (!error) setSnapshots(data || []);
    }
    loadSnapshots();
  }, [mt5Connections]);

  useEffect(() => {
    if (!checkoutSuccess || !checkoutSessionId || !session?.access_token) return;
    let active = true;
    setCheckoutConfirming(true);
    confirmCheckoutSession(checkoutSessionId, session.access_token)
      .then(() => {
        if (!active) return;
        setCheckoutMessage('Pagamento confirmado. Seu plano foi ativado.');
        const trackedKey = `fortify_tracked_purchase_${checkoutSessionId}`;
        if (!window.sessionStorage.getItem(trackedKey)) {
          window.sessionStorage.setItem(trackedKey, '1');
          const pendingPlanSlug = window.sessionStorage.getItem('fortify_pending_plan_slug') || '';
          const purchasedPlan = plans.find((p) => (p.slug || p.id) === pendingPlanSlug);
          trackPurchase({
            transactionId: checkoutSessionId,
            valueCents: purchasedPlan?.price_amount,
            currency: purchasedPlan?.currency,
            planSlug: pendingPlanSlug || purchasedPlan?.id || 'unknown',
          });
        }
      })
      .catch((error) => {
        if (active) setCheckoutMessage(error?.message || 'Pagamento recebido. Seu plano será ativado em instantes.');
      })
      .finally(() => {
        if (active) {
          setCheckoutConfirming(false);
          navigate(location.pathname, { replace: true });
        }
      });
    return () => {
      active = false;
    };
  }, [checkoutSessionId, checkoutSuccess, session?.access_token, plans, navigate, location.pathname]);

  const rows = useMemo(() => {
    return accounts.map((account) => {
      const connection = accountConnection(account, mt5Connections);
      const evaluations = ruleRows.filter((row) => row.trading_account_id === account.id);
      const activeBinding = activeBindings.find((item) => item.trading_account_id === account.id) ?? null;
      return buildHealthRow(account, connection, evaluations, positions, {
        hasActiveBinding: Boolean(activeBinding),
        canonical: currentCanonicalEvaluation(canonicalByAccount[account.id], activeBinding?.id),
      });
    });
  }, [accounts, mt5Connections, positions, ruleRows, activeBindings, canonicalByAccount]);

  const openPositions = rows.reduce((sum, row) => sum + row.openPositions, 0);
  const syncedAccountsCount = rows.filter((row) => row.connection?.last_sync_at && !row.hasSyncError).length;
  const staleRow = rows.find((row) => row.stale && row.connection);
  const overall = summaryStatus(rows);
  const overallStatus = statusStyleFromLabel(overall);
  const score = fortifyScore(rows);
  const latestSync = latestSyncInfo(rows, Boolean(staleRow));
  const assetSummaries = useMemo(() => buildAssetRiskSummary(positions), [positions]);
  const totalOpenPnl = useMemo(
    () => positions.reduce((sum, position) => sum + (Number(position?.floating_pnl ?? position?.profit ?? 0) || 0), 0),
    [positions],
  );
  const hasOpenPnlData = accounts.length > 0;
  const biggestAssetLoss = assetSummaries.filter((asset) => asset.floatingPnl < 0).sort((a, b) => a.floatingPnl - b.floatingPnl)[0] || null;
  const biggestAssetProfit = assetSummaries.filter((asset) => asset.floatingPnl > 0).sort((a, b) => b.floatingPnl - a.floatingPnl)[0] || null;
  const mostExposedAsset = [...assetSummaries].sort((a, b) => b.openPositions - a.openPositions)[0] || null;

  const assetRiskMessages = useMemo(() => {
    if (assetSummaries.length === 0) return ['Ainda não há dados suficientes para gerar análise.'];
    const messages: string[] = [];
    if (biggestAssetLoss) messages.push(`${biggestAssetLoss.symbol} concentra a maior parte do prejuízo aberto.`);
    if (mostExposedAsset && mostExposedAsset.openPositions >= 3) messages.push(`${mostExposedAsset.symbol} concentra muitas posições abertas. Atenção ao overtrade.`);
    if (messages.length === 0) messages.push('Nenhum padrão crítico identificado nas posições abertas.');
    return messages;
  }, [assetSummaries.length, biggestAssetLoss, mostExposedAsset]);

  const riskUsage = useMemo(() => riskBudgetUsage(rows), [rows]);
  const recentActivity = useMemo(() => buildRecentActivity(rows), [rows]);
  const equitySeries = useMemo(() => aggregateEquitySeries(snapshots), [snapshots]);
  const equityDelta = useMemo(() => {
    if (equitySeries.length < 2) return null;
    const previous = equitySeries[equitySeries.length - 2].equity;
    const last = equitySeries[equitySeries.length - 1].equity;
    if (!previous) return null;
    return { pct: ((last - previous) / Math.abs(previous)) * 100, abs: last - previous };
  }, [equitySeries]);

  const kpis = [
    {
      label: 'Fortify Score',
      value: score,
      status: overallStatus,
      badge: overall,
    },
    {
      label: 'Risco utilizado',
      value: riskUsage ? formatPercent(riskUsage.usedPct) : 'Sem dados',
      status: (!riskUsage ? 'nodata' : riskUsage.usedPct >= 90 ? 'critical' : riskUsage.usedPct >= 70 ? 'warning' : 'safe') as HealthStatus,
      badge: riskUsage?.account.nickname || 'Sem regra ativa',
    },
    {
      label: 'P&L aberto',
      value: hasOpenPnlData ? signedMoney(totalOpenPnl) : 'Sem dados',
      status: (!hasOpenPnlData ? 'nodata' : totalOpenPnl >= 0 ? 'safe' : 'critical') as HealthStatus,
      badge: hasOpenPnlData ? formatPositionCount(openPositions) : 'Sem posição',
    },
    {
      label: 'Contas',
      value: formatAccountCount(rows.length, accountLimit || 0),
      status: (rows.length > 0 ? 'safe' : 'nodata') as HealthStatus,
      badge: formatSyncedCount(syncedAccountsCount),
    },
  ];

  const revealGroup: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05, delayChildren: shouldReduceMotion ? 0 : 0.04 } },
  };
  const revealItem: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: { opacity: 1, y: 0, transition: fortifyMotion.reveal },
  };
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
      {/* Uma única moldura para a esteira evita competir com o conteúdo operacional. */}
      <div className="overflow-hidden border-y border-border/60">
        <MarketTicker />
      </div>

      {checkoutSuccess && (
        <div className="rounded-xl border border-success/25 bg-success/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            {checkoutConfirming ? 'Confirmando pagamento com a Stripe...' : checkoutMessage || 'Pagamento recebido. Seu plano será ativado em instantes.'}
          </p>
        </div>
      )}

      {/* Visão operacional */}
      <motion.header variants={revealGroup} initial="hidden" animate="visible" className="space-y-5">
        <motion.div variants={revealItem} className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Painel</h1>
        </motion.div>

        {/* Indicadores essenciais. */}
        <motion.div
          variants={revealItem}
          className="grid grid-cols-2 divide-x divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60 lg:grid-cols-4 lg:divide-y-0"
        >
          {kpis.map((kpi) => (
            <div key={kpi.label} className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">{kpi.value}</p>
              <span className={cn('mt-2 inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold', statusPill[kpi.status])}>
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', healthBarColor[kpi.status])} aria-hidden="true" />
                <span className="truncate">{kpi.badge}</span>
              </span>
            </div>
          ))}
        </motion.div>
      </motion.header>

      {/* Grid central */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Curva de equity consolidada */}
        <motion.section
          variants={revealItem}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-border bg-card/60 p-5 lg:order-1 lg:col-span-12"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Equity consolidada</h2>
              <p className="mt-1 text-xs text-muted-foreground">Soma diária de todas as contas sincronizadas.</p>
            </div>
            {equityDelta && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                  equityDelta.pct >= 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', equityDelta.pct >= 0 ? 'bg-success' : 'bg-destructive')} aria-hidden="true" />
                {equityDelta.pct >= 0 ? '+' : ''}{equityDelta.pct.toFixed(2)}%
              </span>
            )}
          </div>

          {equitySeries.length < 2 ? (
            <p className="mt-8 text-sm text-muted-foreground">
              Ainda sem histórico suficiente. A curva aparece após algumas sincronizações da conta.
            </p>
          ) : (
            <div className="mt-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equitySeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashEquityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chartColors.muted, fontSize: 11 }} stroke={chartColors.border} tickLine={false} />
                  <YAxis tick={{ fill: chartColors.muted, fontSize: 11 }} stroke={chartColors.border} tickLine={false} width={64} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.popover,
                      border: `1px solid ${chartColors.border}`,
                      borderRadius: 8,
                      color: chartColors.popoverForeground,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [money(value), 'Equity']}
                  />
                  <Area type="monotone" dataKey="equity" stroke={chartColors.primary} strokeWidth={2} fill="url(#dashEquityFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.section>

        {/* Capacidade e atividade permanecem disponíveis, sem disputar o foco principal. */}
        <div className="grid gap-4 md:grid-cols-3 lg:order-3 lg:col-span-12">
          <motion.div variants={revealItem} initial="hidden" animate="visible" className="md:col-span-1">
            <DashboardPromoPanel
              hasActivePlan={hasActivePlan}
              accountsCount={accounts.length}
              accountLimit={accountLimit || 0}
              onPricing={() => navigate('/pricing')}
              onConnect={() => navigate('/accounts')}
            />
          </motion.div>

          <motion.section
            variants={revealItem}
            initial="hidden"
            animate="visible"
            className="overflow-hidden rounded-xl border border-border bg-card/60 md:col-span-2"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 p-4">
              <h2 className="text-sm font-bold text-foreground">Atividade recente</h2>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                {latestSync.detail}
              </span>
            </div>
            {recentActivity.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">
                Nenhuma avaliação de regra registrada ainda. Os eventos aparecem aqui depois da primeira sincronização.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentActivity.map((event) => {
                  const status = activityStatus[event.status];
                  return (
                    <li key={event.id} className="flex items-start gap-3 p-4">
                      <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', healthBarColor[status])} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">{event.ruleName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{event.accountName}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/80">{event.message}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{relativeSync(event.computedAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.section>
        </div>
      </div>

      {/* Análise rápida por ativo */}
      <motion.section
        variants={revealItem}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-xl border border-border bg-card/60"
      >
        <div className="border-b border-border/60 p-5">
          <h2 className="text-sm font-bold text-foreground">Análise rápida por ativo</h2>
          <p className="mt-1 text-xs text-muted-foreground">Exposição e prejuízo aberto usando as posições já sincronizadas.</p>
        </div>
        {assetSummaries.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Conecte e sincronize uma conta MT5 para visualizar a análise por ativo.</p>
        ) : (
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AssetMetric label="Ativo mais exposto" value={mostExposedAsset?.symbol || 'Sem dados'} detail={mostExposedAsset ? formatPositionCount(mostExposedAsset.openPositions) : 'Sem posições'} />
              <AssetMetric
                label="Maior lucro aberto"
                value={biggestAssetProfit?.symbol || 'Sem lucro aberto'}
                detail={biggestAssetProfit ? signedMoney(biggestAssetProfit.floatingPnl) : 'Sem dados'}
                tone={biggestAssetProfit ? 'positive' : 'neutral'}
              />
              <AssetMetric
                label="Maior prejuízo aberto"
                value={biggestAssetLoss?.symbol || 'Sem prejuízo aberto'}
                detail={biggestAssetLoss ? signedMoney(biggestAssetLoss.floatingPnl) : 'Sem dados'}
                tone={biggestAssetLoss ? 'negative' : 'neutral'}
              />
              <AssetMetric
                label="Risco concentrado"
                value={biggestAssetLoss?.symbol || mostExposedAsset?.symbol || 'Sem padrão'}
                detail={biggestAssetLoss ? 'Maior perda flutuante' : 'Sem concentração crítica'}
              />
            </div>
            <div className="space-y-2">
              {assetRiskMessages.map((message) => (
                <div key={message} className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <p className="text-sm text-foreground">{message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      <footer className="border-t border-border/30 pt-4">
        <p className="text-[11px] text-muted-foreground/70">
          Última sincronização: {latestSync.value} · Atualizado em {new Date().toLocaleString('pt-BR')}
        </p>
      </footer>
    </div>
  );
}

/** Plan capacity is a quiet secondary control. It keeps the real plan-limit
 * logic available without visually competing with account risk. */
function DashboardPromoPanel({
  hasActivePlan,
  accountsCount,
  accountLimit,
  onPricing,
  onConnect,
}: {
  hasActivePlan: boolean;
  accountsCount: number;
  accountLimit: number;
  onPricing: () => void;
  onConnect: () => void;
}) {
  let title = '';
  let description = '';
  let ctaLabel = '';
  let onClick = onConnect;

  if (!hasActivePlan) {
    title = 'Escolha um plano para monitorar contas MT5';
    description = 'O plano define quantas contas você pode conectar e acompanhar por risco, drawdown e regras.';
    ctaLabel = 'Ver planos';
    onClick = onPricing;
  } else if (accountsCount === 0) {
    title = 'Conecte sua primeira conta';
    description = 'Conecte uma conta MT5 para começar a monitorar risco, drawdown e regras da sua prop firm em tempo real.';
    ctaLabel = 'Conectar conta MT5';
    onClick = onConnect;
  } else {
    const remaining = Math.max(0, accountLimit - accountsCount);
    title = remaining > 0 ? `Conecte mais ${remaining} ${remaining === 1 ? 'conta' : 'contas'}` : 'Limite de contas atingido';
    description = remaining > 0
      ? 'Acompanhe as contas conectadas e os limites de cada uma.'
      : 'Faça upgrade do plano para conectar mais contas.';
    ctaLabel = remaining > 0 ? 'Conectar outra conta' : 'Fazer upgrade';
    onClick = remaining > 0 ? onConnect : onPricing;
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Shield className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Capacidade do plano</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
            {formatAccountCount(accountsCount, accountLimit)} <span className="font-sans text-xs font-normal text-muted-foreground">contas conectadas</span>
          </p>
        </div>
      </div>
      <h3 className="mt-4 text-sm font-bold leading-snug text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onClick} className="pill-btn pill-btn-primary justify-center">
          {ctaLabel}
        </button>
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Falar com suporte
        </a>
      </div>
    </div>
  );
}

function AssetMetric({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 truncate font-mono text-sm font-bold text-foreground">{value}</p>
      <p
        className={cn(
          'mt-1 truncate font-mono text-[11px] tabular-nums',
          tone === 'positive' ? 'text-success' : tone === 'negative' ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {detail}
      </p>
    </div>
  );
}

export default Dashboard;
