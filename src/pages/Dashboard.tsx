import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
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
  profitTargetLabel: string;
  /** Raw numbers behind the *Label strings above, so the hero KPIs can sum
   * them across every connected account instead of re-deriving the same
   * canonical/legacy lookups a second time. null means "no data", never 0. */
  dailyRemainingValue: number | null;
  drawdownRemainingValue: number | null;
  profitTargetCurrentValue: number | null;
  profitTargetLimitValue: number | null;
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

/** Fully-round translucent status pill (the reference dashboards' badge
 * language) expressed with the project's own status tokens instead of raw
 * Tailwind palette colors, so both themes stay correct. */
const statusPill: Record<HealthStatus, string> = {
  safe: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  critical: 'border-destructive/35 bg-destructive/10 text-destructive',
  nodata: 'border-border bg-muted/40 text-muted-foreground',
};

/** Literal Tailwind class per status, kept as its own map so the JIT scanner
 * can actually see and keep these background-color utilities. */
const healthBarColor: Record<HealthStatus, string> = {
  safe: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
  nodata: 'bg-muted-foreground/30',
};

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
  const status = healthBucket(statusView);

  const dailyRemainingValue = binding.hasActiveBinding
    ? canonical?.dailyLoss?.remainingValue ?? null
    : summary.dailyLoss ? summary.dailyRemaining : null;
  const drawdownRemainingValue = binding.hasActiveBinding
    ? canonical?.maxDrawdown?.remainingValue ?? null
    : summary.totalLoss ? summary.maxLossRemaining : null;

  // Progresso em direção à meta (não é uma "folga" como as demais — por isso
  // guarda o que já foi alcançado sobre o alvo, em vez de uma distância até a
  // violação). limitValue <= 0 é tratado como "sem meta numérica confiável",
  // o mesmo critério que o motor canônico usa pra marcar a regra como
  // not_monitorable.
  const profitTargetRule = binding.hasActiveBinding ? canonical?.profitTarget ?? null : summary.profitTarget ?? null;
  const profitTargetLimitRaw = Number(profitTargetRule?.limitValue);
  const profitTargetLimitValue = profitTargetRule && Number.isFinite(profitTargetLimitRaw) && profitTargetLimitRaw > 0
    ? profitTargetLimitRaw
    : null;
  const profitTargetCurrentValue = profitTargetLimitValue !== null
    ? Math.max(0, Number(profitTargetRule?.currentValue) || 0)
    : null;

  return {
    account,
    connection,
    evaluations,
    evals: summary.evals,
    status,
    statusLabel: statusView.label,
    equityLabel: money(account.currentEquity),
    dailyRemainingLabel: dailyRemainingValue !== null ? money(dailyRemainingValue) : 'Sem dados suficientes',
    drawdownRemainingLabel: drawdownRemainingValue !== null ? money(drawdownRemainingValue) : 'Sem dados suficientes',
    profitTargetLabel: profitTargetLimitValue !== null
      ? `${money(profitTargetCurrentValue)} de ${money(profitTargetLimitValue)}`
      : 'Sem dados suficientes',
    dailyRemainingValue,
    drawdownRemainingValue,
    profitTargetCurrentValue,
    profitTargetLimitValue,
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
  const { accountLimit, plans } = useSubscriptionPlan();
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
  const staleRow = rows.find((row) => row.stale && row.connection);
  const latestSync = latestSyncInfo(rows, Boolean(staleRow));
  const assetSummaries = useMemo(() => buildAssetRiskSummary(positions), [positions]);
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

  const recentActivity = useMemo(() => buildRecentActivity(rows), [rows]);
  const equitySeries = useMemo(() => aggregateEquitySeries(snapshots), [snapshots]);
  const equityDelta = useMemo(() => {
    if (equitySeries.length < 2) return null;
    const previous = equitySeries[equitySeries.length - 2].equity;
    const last = equitySeries[equitySeries.length - 1].equity;
    if (!previous) return null;
    return { pct: ((last - previous) / Math.abs(previous)) * 100, abs: last - previous };
  }, [equitySeries]);

  // Somas reais sobre `rows` — nunca inventa um total quando nenhuma conta tem
  // o dado: null em vez de 0, pra "Sem dados" não virar um falso "$0".
  const sumAvailable = (values: (number | null)[]) => {
    const present = values.filter((value): value is number => value !== null);
    return present.length > 0 ? { total: present.reduce((sum, value) => sum + value, 0), count: present.length } : null;
  };
  const totalEquity = rows.length > 0 ? rows.reduce((sum, row) => sum + (Number(row.account.currentEquity) || 0), 0) : null;
  const totalDailyRemaining = sumAvailable(rows.map((row) => row.dailyRemainingValue));
  const totalDrawdownRemaining = sumAvailable(rows.map((row) => row.drawdownRemainingValue));
  const totalFloatingLoss = rows.length > 0 ? rows.reduce((sum, row) => sum + row.negativeFloatingPnl, 0) : null;
  const profitTargetRowsWithData = rows.filter((row) => row.profitTargetLimitValue !== null);
  const totalProfitTarget = profitTargetRowsWithData.length > 0
    ? {
        current: profitTargetRowsWithData.reduce((sum, row) => sum + (row.profitTargetCurrentValue || 0), 0),
        limit: profitTargetRowsWithData.reduce((sum, row) => sum + (row.profitTargetLimitValue || 0), 0),
        count: profitTargetRowsWithData.length,
      }
    : null;

  const kpis = [
    {
      label: 'Saldo',
      value: totalEquity !== null ? money(totalEquity) : 'Sem dados',
      status: (totalEquity !== null ? 'safe' : 'nodata') as HealthStatus,
      badge: rows.length > 0 ? formatAccountCount(rows.length, accountLimit || 0) + ' contas' : 'Nenhuma conta',
    },
    {
      label: 'Drawdown diário restante',
      value: totalDailyRemaining ? money(totalDailyRemaining.total) : 'Sem dados',
      status: (totalDailyRemaining ? 'safe' : 'nodata') as HealthStatus,
      badge: totalDailyRemaining ? `${totalDailyRemaining.count} de ${rows.length} contas` : 'Sem regra ativa',
    },
    {
      label: 'Drawdown máximo restante',
      value: totalDrawdownRemaining ? money(totalDrawdownRemaining.total) : 'Sem dados',
      status: (totalDrawdownRemaining ? 'safe' : 'nodata') as HealthStatus,
      badge: totalDrawdownRemaining ? `${totalDrawdownRemaining.count} de ${rows.length} contas` : 'Sem regra ativa',
    },
    {
      label: 'Perda flutuante',
      value: totalFloatingLoss !== null ? signedMoney(totalFloatingLoss) : 'Sem dados',
      status: (totalFloatingLoss === null ? 'nodata' : totalFloatingLoss < 0 ? 'critical' : 'safe') as HealthStatus,
      badge: formatPositionCount(openPositions),
    },
    {
      label: 'Profit Target',
      value: totalProfitTarget ? `${money(totalProfitTarget.current)} de ${money(totalProfitTarget.limit)}` : 'Sem dados',
      status: (totalProfitTarget ? 'safe' : 'nodata') as HealthStatus,
      badge: totalProfitTarget ? `${totalProfitTarget.count} de ${rows.length} contas` : 'Sem meta definida',
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
          className="grid grid-cols-2 divide-x divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0"
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
        {/* Curva de saldo consolidado */}
        <motion.section
          variants={revealItem}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-border bg-card/60 p-5 lg:order-2 lg:col-span-12"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Saldo consolidado</h2>
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
                    formatter={(value: number) => [money(value), 'Saldo']}
                  />
                  <Area type="monotone" dataKey="equity" stroke={chartColors.primary} strokeWidth={2} fill="url(#dashEquityFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.section>

        {/* Uma bolha por conta: mesmos números do total acima, nível conta. */}
        <div className="lg:order-1 lg:col-span-12">
          <h2 className="text-sm font-bold text-foreground">Contas conectadas</h2>
          {rows.length === 0 ? (
            <div className="mt-3 rounded-xl border border-border bg-card/60 p-5">
              <p className="text-sm text-muted-foreground">Conecte uma conta MT5 para ver as métricas dela aqui.</p>
              <button type="button" onClick={() => navigate('/accounts')} className="pill-btn pill-btn-primary mt-4">
                Conectar conta MT5
              </button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <motion.div
                  key={row.account.id}
                  variants={revealItem}
                  initial="hidden"
                  animate="visible"
                  className="rounded-xl border border-border bg-card/60 p-4"
                >
                  <p className="truncate text-sm font-semibold text-foreground">{row.account.nickname}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.account.broker || row.connection?.mt5_server || 'Mesa não informada'}</p>
                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Saldo</dt>
                      <dd className="font-mono font-semibold tabular-nums text-foreground">{row.equityLabel}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Drawdown diário restante</dt>
                      <dd className="font-mono font-semibold tabular-nums text-foreground">{row.dailyRemainingLabel}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Drawdown máximo restante</dt>
                      <dd className="font-mono font-semibold tabular-nums text-foreground">{row.drawdownRemainingLabel}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Perda flutuante</dt>
                      <dd className={cn('font-mono font-semibold tabular-nums', row.negativeFloatingPnl < 0 ? 'text-destructive' : 'text-foreground')}>
                        {signedMoney(row.negativeFloatingPnl)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Profit Target</dt>
                      <dd className="font-mono font-semibold tabular-nums text-foreground">{row.profitTargetLabel}</dd>
                    </div>
                  </dl>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Atividade recente. */}
        <div className="lg:order-3 lg:col-span-12">
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
