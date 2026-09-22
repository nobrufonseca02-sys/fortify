import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Command, RefreshCw, Search, Shield, ShieldAlert, ShieldX } from 'lucide-react';
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

const statusIcon: Record<HealthStatus, typeof Shield> = {
  safe: Shield,
  warning: ShieldAlert,
  critical: ShieldX,
  nodata: AlertTriangle,
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

/** Last `limit` real equity readings for one connection, oldest first — the
 * exact same mt5_account_snapshots table Performance.tsx charts, just
 * trimmed down to bare numbers for an inline sparkline instead of a full
 * chart. Returns [] (never fabricated points) when there's no history yet. */
function sparklinePoints(connectionId: string | null | undefined, snapshots: any[], limit = 14): number[] {
  if (!connectionId) return [];
  return snapshots
    .filter((snapshot) => snapshot.connection_id === connectionId)
    .slice(-limit)
    .map((snapshot) => Number(snapshot.equity) || 0);
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
    evals: summary.evals,
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

/** Counts + percentages per HealthStatus across all rows — the real
 * distribution behind the single "overall" badge already shown in the hero. */
function healthBreakdown(rows: HealthRow[]) {
  const counts: Record<HealthStatus, number> = { safe: 0, warning: 0, critical: 0, nodata: 0 };
  rows.forEach((row) => {
    counts[row.status] += 1;
  });
  const total = rows.length;
  return (['safe', 'warning', 'critical', 'nodata'] as HealthStatus[]).map((status) => ({
    status,
    count: counts[status],
    pct: total > 0 ? Math.round((counts[status] / total) * 100) : 0,
  }));
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
  const { accountLimit, hasActivePlan, plans } = useSubscriptionPlan();
  const shouldReduceMotion = useReducedMotion();
  const [mt5Connections, setMt5Connections] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutConfirming, setCheckoutConfirming] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);
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

  // ⌘K / Ctrl+K focuses the account search — the shortcut the badge advertises
  // actually works instead of being decorative.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const rows = useMemo(() => {
    return accounts.map((account) => {
      const connection = accountConnection(account, mt5Connections);
      const evaluations = ruleRows.filter((row) => row.trading_account_id === account.id);
      return buildHealthRow(account, connection, evaluations, positions);
    });
  }, [accounts, mt5Connections, positions, ruleRows]);

  const riskyAccount = rows.find((row) => row.status === 'critical') || rows.find((row) => row.status === 'warning') || null;
  const riskyAccountsCount = rows.filter((row) => row.status === 'critical' || row.status === 'warning').length;
  const criticalAccountsCount = rows.filter((row) => row.status === 'critical').length;
  const openPositions = rows.reduce((sum, row) => sum + row.openPositions, 0);
  const negativePositions = positions.filter((position) => Number(position?.floating_pnl ?? position?.profit ?? 0) < 0).length;
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

  const breakdown = useMemo(() => healthBreakdown(rows), [rows]);
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

  const query = search.trim().toLowerCase();
  const visibleRows = query
    ? rows.filter((row) =>
        [row.account.nickname, row.account.broker, row.connection?.mt5_server, row.statusLabel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      )
    : rows;

  const kpis = [
    {
      label: 'Fortify Score',
      value: score,
      status: overallStatus,
      badge: overall,
      points: equitySeries.map((point) => point.equity),
    },
    {
      label: 'P&L aberto total',
      value: hasOpenPnlData ? signedMoney(totalOpenPnl) : 'Sem dados',
      status: (!hasOpenPnlData ? 'nodata' : totalOpenPnl >= 0 ? 'safe' : 'critical') as HealthStatus,
      badge: hasOpenPnlData ? formatPositionCount(openPositions) : 'Sem posição',
    },
    {
      label: 'Contas monitoradas',
      value: formatAccountCount(rows.length, accountLimit || 0),
      status: (rows.length > 0 ? 'safe' : 'nodata') as HealthStatus,
      badge: formatSyncedCount(syncedAccountsCount),
    },
    {
      label: 'Contas em risco',
      value: String(riskyAccountsCount),
      status: (criticalAccountsCount > 0 ? 'critical' : riskyAccountsCount > 0 ? 'warning' : 'safe') as HealthStatus,
      badge: riskyAccount?.account.nickname || 'Sem risco ativo',
    },
    {
      label: 'Risco utilizado',
      value: riskUsage ? `${riskUsage.usedPct}%` : 'Sem dados',
      status: (!riskUsage ? 'nodata' : riskUsage.usedPct >= 90 ? 'critical' : riskUsage.usedPct >= 70 ? 'warning' : 'safe') as HealthStatus,
      badge: riskUsage?.account.nickname || 'Sem regra ativa',
    },
  ];

  const headlineStats = [
    {
      label: 'Contas em risco',
      value: String(riskyAccountsCount),
      status: (criticalAccountsCount > 0 ? 'critical' : riskyAccountsCount > 0 ? 'warning' : 'safe') as HealthStatus,
      hint: criticalAccountsCount > 0 ? `${criticalAccountsCount} crítica${criticalAccountsCount > 1 ? 's' : ''}` : 'nenhuma crítica',
    },
    {
      label: 'Posições abertas',
      value: String(openPositions),
      status: (negativePositions > 0 ? 'warning' : 'safe') as HealthStatus,
      hint: negativePositions > 0 ? `${negativePositions} no prejuízo` : 'nenhuma no prejuízo',
    },
    {
      label: 'Contas conectadas',
      value: String(rows.length),
      status: (rows.length > 0 ? 'safe' : 'nodata') as HealthStatus,
      hint: `limite ${accountLimit || 0}`,
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
      {/* Ticker de cotações em tempo real — preservado, só reemoldurado */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60 px-4 py-2">
        <MarketTicker />
      </div>

      {checkoutSuccess && (
        <div className="rounded-xl border border-success/25 bg-success/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            {checkoutConfirming ? 'Confirmando pagamento com a Stripe...' : checkoutMessage || 'Pagamento recebido. Seu plano será ativado em instantes.'}
          </p>
        </div>
      )}

      {/* Command Center */}
      <motion.header variants={revealGroup} initial="hidden" animate="visible" className="space-y-5">
        <motion.div variants={revealItem} className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Console Operacional</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Acompanhe risco, drawdown e regras das suas contas antes do próximo trade.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar conta..."
                aria-label="Buscar conta monitorada"
                className="h-10 w-full rounded-full border border-border bg-card/60 pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
                <Command className="h-3 w-3" aria-hidden="true" />K
              </span>
            </div>

            <div className="flex items-center gap-5">
              {headlineStats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', healthBarColor[stat.status])}>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/90" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-xl font-bold leading-none tabular-nums text-foreground">{stat.value}</p>
                    <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Faixa de KPIs */}
        <motion.div
          variants={revealItem}
          className="grid grid-cols-2 divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60 sm:grid-cols-3 xl:grid-cols-5 xl:divide-x"
        >
          {kpis.map((kpi) => (
            <div key={kpi.label} className="border-b border-border/60 p-4 last:border-b-0 xl:border-b-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <p className="font-mono text-2xl font-bold tabular-nums text-foreground">{kpi.value}</p>
                {kpi.points && kpi.points.length > 1 && <Sparkline points={kpi.points} className="h-8 w-16" />}
              </div>
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
          className="rounded-xl border border-border bg-card/60 p-5 lg:col-span-5"
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

        {/* Saúde por conta */}
        <motion.section
          variants={revealItem}
          initial="hidden"
          animate="visible"
          className="overflow-hidden rounded-xl border border-border bg-card/60 lg:col-span-4"
        >
          {rows.length > 1 && (
            <div className="flex h-1 w-full">
              {breakdown.filter((entry) => entry.count > 0).map((entry) => (
                <span key={entry.status} className={cn('h-full', healthBarColor[entry.status])} style={{ width: `${entry.pct}%` }} />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 p-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">Saúde por conta</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {rows.length === 0 ? 'Nenhuma conta conectada' : `${visibleRows.length} de ${rows.length} exibidas`}
              </p>
            </div>
            <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', statusPill[overallStatus])}>
              {overall}
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="p-5">
              <p className="text-sm text-muted-foreground">Conecte uma conta MT5 para acompanhar a saúde dela aqui.</p>
              <button type="button" onClick={() => navigate('/mt5')} className="pill-btn pill-btn-primary mt-4">
                Conectar conta MT5
              </button>
            </div>
          ) : visibleRows.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Nenhuma conta corresponde a "{search}".</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {visibleRows.map((row) => (
                <AccountHealthRow
                  key={row.account.id}
                  row={row}
                  points={sparklinePoints(row.connection?.id, snapshots)}
                  onAction={() => navigate(row.hasSyncError || row.stale || !row.connection ? '/mt5' : `/accounts/${row.account.id}/rules`)}
                />
              ))}
            </ul>
          )}
        </motion.section>

        {/* CTA + atividade recente */}
        <div className="space-y-4 lg:col-span-3">
          <motion.div variants={revealItem} initial="hidden" animate="visible">
            <DashboardPromoPanel
              hasActivePlan={hasActivePlan}
              accountsCount={accounts.length}
              accountLimit={accountLimit || 0}
              onPricing={() => navigate('/pricing')}
              onConnect={() => navigate('/mt5')}
            />
          </motion.div>

          <motion.section
            variants={revealItem}
            initial="hidden"
            animate="visible"
            className="overflow-hidden rounded-xl border border-border bg-card/60"
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

/** Minimal inline trend line — plain SVG rather than a second Recharts
 * instance per KPI cell. Colors resolve live CSS custom properties, so it
 * stays correct in both themes. */
function Sparkline({ points, className }: { points: number[]; className?: string }) {
  if (points.length < 2) {
    return <div className={cn('h-8 rounded-md bg-muted/40', className)} aria-hidden="true" />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = 100 / (points.length - 1);
  const path = points
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${(index * stepX).toFixed(2)},${(100 - ((value - min) / range) * 100).toFixed(2)}`)
    .join(' ');
  const trendUp = points[points.length - 1] >= points[0];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn('h-8 w-full', className)} aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={trendUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Signed % change between the last two real equity readings — null (never
 * fabricated) when there isn't at least a two-point history yet. */
function equityDeltaPct(points: number[]): number | null {
  if (points.length < 2) return null;
  const prev = points[points.length - 2];
  const last = points[points.length - 1];
  if (!prev) return null;
  return ((last - prev) / Math.abs(prev)) * 100;
}

function AccountHealthRow({ row, points, onAction }: { row: HealthRow; points: number[]; onAction: () => void }) {
  const StatusIcon = statusIcon[row.status];
  const needsConnectionFix = row.hasSyncError || row.stale || !row.connection;
  const hasNegativePnl = row.negativeFloatingPnl < 0;
  const deltaPct = equityDeltaPct(points);

  return (
    <li className="flex items-center gap-3 p-4">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', healthBarColor[row.status])}>
        <StatusIcon className="h-5 w-5 text-white" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{row.account.nickname}</p>
          <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', statusPill[row.status])}>
            {row.statusLabel}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {row.account.broker || row.connection?.mt5_server || 'Mesa não informada'} · {row.lastSyncLabel}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{row.equityLabel}</p>
        <p className={cn('font-mono text-[11px] tabular-nums', hasNegativePnl ? 'text-destructive' : 'text-muted-foreground')}>
          {deltaPct !== null ? `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(2)}%` : formatPositionCount(row.openPositions)}
        </p>
      </div>

      <button
        type="button"
        onClick={onAction}
        aria-label={needsConnectionFix ? `Corrigir conexão de ${row.account.nickname}` : `Ver regras de ${row.account.nickname}`}
        className="shrink-0 rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </li>
  );
}

/** The one promo/CTA panel — real plan + account-limit state drives which of
 * the three messages shows, same logic the two banners it replaced had
 * (no plan / no accounts / room for more accounts). */
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
    <div className="flex h-full flex-col justify-between rounded-xl border border-primary/30 bg-primary/10 p-5">
      <div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-base font-bold leading-snug text-foreground">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5 space-y-2">
        <button type="button" onClick={onClick} className="pill-btn pill-btn-primary w-full justify-center">
          {ctaLabel}
        </button>
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="pill-btn w-full justify-center border-transparent bg-transparent hover:bg-primary/10"
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
