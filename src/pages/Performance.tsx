import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { AccountSelector } from '@/components/AccountSelector';
import { TradingAccount } from '@/types/fortify';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { useRuleEvaluations } from '@/hooks/useRuleEvaluations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { mapRuleEvaluationRow } from '@/lib/ruleEvaluationView';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  TrendingUp, TrendingDown, Calendar, BarChart3, Shield, Activity, Target,
  ArrowUpRight, ArrowDownRight, Minus, Wallet, RefreshCw, Info,
} from 'lucide-react';
import { GuidedEmptyState } from '@/components/BetaReadinessChecklist';

/* ── helpers ─────────────────────────────────────────────── */
const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

interface DayData {
  day: string;
  date: string;
  balance: number;
  equity: number;
  drawdownLimit: number;
  drawdown: number;
  dailyPnl: number;
}

type MT5Snapshot = Tables<'mt5_account_snapshots'>;
type MT5Trade = Pick<Tables<'mt5_trades'>, 'id' | 'symbol' | 'side' | 'open_time' | 'close_time' | 'volume' | 'profit'>;

function formatDayLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dt = new Date(year, (month || 1) - 1, day || 1);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function mapSnapshotData(account: TradingAccount, snapshots: MT5Snapshot[], maxLossLimit: number): DayData[] {
  const drawdownFloor = account.startBalance - maxLossLimit;
  return snapshots.map(snapshot => ({
    day: formatDayLabel(snapshot.date),
    date: snapshot.date,
    balance: Number(snapshot.balance ?? 0),
    equity: Number(snapshot.equity ?? 0),
    drawdownLimit: Math.round(drawdownFloor),
    drawdown: Number(snapshot.drawdown ?? 0),
    dailyPnl: Number(snapshot.daily_pnl ?? 0),
  }));
}

/* ── sub-components ──────────────────────────────────────── */
type Tone = 'success' | 'destructive' | 'warning' | 'muted';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/10 text-warning',
  muted: 'bg-muted text-muted-foreground',
};

function PillBadge({ tone, icon: Icon, children }: {
  tone: Tone; icon?: React.ElementType; children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold font-mono tabular-nums ${TONE_CLASSES[tone]}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

function MetricHint({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label={`Como calculamos: ${label}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">{hint}</TooltipContent>
    </Tooltip>
  );
}

function StatCard({ icon: Icon, label, value, badge, hint }: {
  icon: React.ElementType; label: string; value: string; badge?: React.ReactNode; hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {hint && <MetricHint label={label} hint={hint} />}
          <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
      </div>
      <p className="text-xl font-bold font-mono tabular-nums text-foreground">{value}</p>
      {badge}
    </div>
  );
}

function HeroStatCard({ className, totalPnl, returnPct, startBalance, sparklineData, successColor, destructiveColor }: {
  className?: string;
  totalPnl: number;
  returnPct: number;
  startBalance: number;
  sparklineData: DayData[];
  successColor: string;
  destructiveColor: string;
}) {
  const isFlat = Math.abs(totalPnl) < 0.005;
  const isPositive = totalPnl >= 0;
  const TrendIcon = isFlat ? Minus : isPositive ? TrendingUp : TrendingDown;
  const BadgeIcon = isFlat ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const lineColor = isPositive ? successColor : destructiveColor;
  const hasSpark = sparklineData.length >= 2;

  return (
    <div className={`rounded-lg border border-border bg-card p-4 flex flex-col gap-2 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">Lucro Total</span>
        <div className="flex items-center gap-1.5">
          <MetricHint label="Lucro Total" hint="Equity atual menos o saldo inicial da conta. O gráfico mostra a curva de equity dos últimos pontos sincronizados." />
          <TrendIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className={`text-2xl font-bold font-mono tabular-nums ${isFlat ? 'text-foreground' : isPositive ? 'text-success' : 'text-destructive'}`}>
          {fmt(totalPnl)}
        </p>
        <PillBadge tone={isFlat ? 'muted' : isPositive ? 'success' : 'destructive'} icon={BadgeIcon}>
          {fmtPct(returnPct)}
        </PillBadge>
      </div>
      <p className="text-xs text-muted-foreground">desde o saldo inicial de {fmt(startBalance)}</p>
      <div className="h-12 mt-1">
        {hasSpark ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
              <Line
                type="monotone"
                dataKey="equity"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 2, fill: lineColor, strokeWidth: 0 }}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center text-[11px] text-muted-foreground/70">
            Histórico insuficiente para o gráfico
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function DayResultCard({ data, successColor, destructiveColor, mutedColor, tooltipContentStyle, tooltipLabelStyle }: {
  data: DayData[];
  successColor: string;
  destructiveColor: string;
  mutedColor: string;
  tooltipContentStyle: React.CSSProperties;
  tooltipLabelStyle: React.CSSProperties;
}) {
  const recent = data.slice(-20);
  const positiveDays = data.filter(d => d.dailyPnl > 0).length;
  const negativeDays = data.filter(d => d.dailyPnl < 0).length;
  const daysWithResult = positiveDays + negativeDays;
  const winRatePct = daysWithResult > 0 ? (positiveDays / daysWithResult) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado por Dia</h2>
          <MetricHint
            label="Resultado por Dia"
            hint="Cada barra é o resultado (dailyPnl) de um dia com snapshot. Verde = dia positivo, vermelho = dia negativo."
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-xl font-bold font-mono tabular-nums text-foreground">
            {positiveDays}/{daysWithResult || 0}
          </p>
          <PillBadge tone={daysWithResult === 0 ? 'muted' : winRatePct >= 50 ? 'success' : 'destructive'}>
            {daysWithResult === 0 ? 'sem dados' : `${winRatePct.toFixed(0)}% positivos`}
          </PillBadge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">últimos {recent.length} dias com snapshot</p>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={recent} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="day" hide />
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
              formatter={(value: number) => [fmt(value), 'Resultado do dia']}
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
            />
            <Bar dataKey="dailyPnl" radius={[2, 2, 2, 2]} isAnimationActive={false}>
              {recent.map((d, i) => (
                <Cell key={`${d.date}-${i}`} fill={d.dailyPnl > 0 ? successColor : d.dailyPnl < 0 ? destructiveColor : mutedColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecentTradesTable({ trades }: { trades: MT5Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground">Nenhum trade recente sincronizado</p>
        <p className="text-xs text-muted-foreground mt-1">
          Os últimos trades desta conta aparecem aqui após o próximo sync MT5.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-3 font-medium uppercase tracking-wide text-[10px] text-muted-foreground">Ativo</th>
            <th className="py-2 pr-3 font-medium uppercase tracking-wide text-[10px] text-muted-foreground">Direção</th>
            <th className="py-2 pr-3 font-medium uppercase tracking-wide text-[10px] text-muted-foreground">Volume</th>
            <th className="py-2 pr-3 font-medium uppercase tracking-wide text-[10px] text-muted-foreground">Abertura</th>
            <th className="py-2 pr-3 font-medium uppercase tracking-wide text-[10px] text-muted-foreground">Fechamento</th>
            <th className="py-2 pl-3 font-medium uppercase tracking-wide text-[10px] text-muted-foreground text-right">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {trades.map(trade => (
            <tr key={trade.id} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-3 font-medium text-foreground">{trade.symbol}</td>
              <td className="py-2 pr-3">
                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${trade.side === 'buy' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                  {trade.side === 'buy' ? 'Compra' : trade.side === 'sell' ? 'Venda' : trade.side}
                </span>
              </td>
              <td className="py-2 pr-3 font-mono tabular-nums text-muted-foreground">{trade.volume}</td>
              <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatDateTime(trade.open_time)}</td>
              <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                {trade.close_time ? formatDateTime(trade.close_time) : 'Em aberto'}
              </td>
              <td className={`py-2 pl-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${trade.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {fmt(trade.profit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarGrid({ data }: { data: DayData[] }) {
  // Build a simple month-view calendar for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const pnlMap = new Map<number, number>();
  data.forEach(d => {
    const dt = new Date(d.date);
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      pnlMap.set(dt.getDate(), d.dailyPnl);
    }
  });

  const cells: React.ReactNode[] = [];
  // Empty cells for offset
  for (let i = 0; i < firstDow; i++) {
    cells.push(<div key={`empty-${i}`} className="h-10" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const pnl = pnlMap.get(d);
    let bgClass = 'bg-muted/50';
    let textColor = 'text-muted-foreground';
    if (pnl !== undefined) {
      if (pnl > 0) { bgClass = 'bg-success/20'; textColor = 'text-success'; }
      else if (pnl < 0) { bgClass = 'bg-destructive/20'; textColor = 'text-destructive'; }
    }
    cells.push(
      <div key={d} className={`h-10 rounded-lg ${bgClass} flex flex-col items-center justify-center gap-0.5`}>
        <span className="text-[10px] text-muted-foreground">{d}</span>
        {pnl !== undefined && (
          <span className={`text-[10px] font-mono font-semibold ${textColor}`}>
            {pnl >= 0 ? '+' : ''}{fmt(pnl)}
          </span>
        )}
      </div>
    );
  }

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-3">{monthNames[month]} {year}</p>
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map(w => (
          <div key={w} className="text-[10px] text-center text-muted-foreground uppercase font-medium pb-1">{w}</div>
        ))}
        {cells}
      </div>
    </div>
  );
}

function PerformanceHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="font-mono text-[11px] uppercase tracking-widest text-primary font-medium">Console de performance</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Performance</h1>
      <p className="mt-1.5 max-w-md text-xs text-muted-foreground">Análise completa de desempenho e risco da conta.</p>
    </motion.div>
  );
}

/* ── main page ───────────────────────────────────────────── */
const Performance = () => {
  const { accounts } = useAccountsStore();
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | undefined>(accounts[0]);
  const [snapshots, setSnapshots] = useState<MT5Snapshot[]>([]);
  const [recentTrades, setRecentTrades] = useState<MT5Trade[]>([]);
  const [totalTradesCount, setTotalTradesCount] = useState(0);
  const { data: ruleRows = [] } = useRuleEvaluations(selectedAccount?.id);

  // Resolved once from src/index.css tokens (see useThemeColors) so Recharts' SVG
  // stroke/fill — which can't reliably resolve `var(--token)` on their own — actually
  // repaint when the AppLayout.tsx theme toggle flips light/dark.
  const chartColors = useThemeColors({
    info: '--info',
    destructive: '--destructive',
    success: '--success',
    border: '--border',
    mutedForeground: '--muted-foreground',
    popover: '--popover',
    popoverForeground: '--popover-foreground',
  });

  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0]);
      return;
    }
    if (selectedAccount && accounts.length > 0 && !accounts.some(account => account.id === selectedAccount.id)) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  useEffect(() => {
    let isActive = true;

    async function loadPerformanceData() {
      if (!selectedAccount?.id) {
        if (isActive) {
          setSnapshots([]);
          setRecentTrades([]);
          setTotalTradesCount(0);
        }
        return;
      }

      const { data: connection, error: connectionError } = await supabase
        .from('mt5_connections')
        .select('id')
        .eq('trading_account_id', selectedAccount.id)
        .eq('user_id', selectedAccount.userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isActive) return;

      if (connectionError || !connection?.id) {
        setSnapshots([]);
        setRecentTrades([]);
        setTotalTradesCount(0);
        return;
      }

      const [snapshotsResult, tradesCountResult, recentTradesResult] = await Promise.all([
        supabase
          .from('mt5_account_snapshots')
          .select('*')
          .eq('connection_id', connection.id)
          .order('date', { ascending: true }),
        supabase
          .from('mt5_trades')
          .select('id', { count: 'exact', head: true })
          .eq('connection_id', connection.id),
        supabase
          .from('mt5_trades')
          .select('id, symbol, side, open_time, close_time, volume, profit')
          .eq('connection_id', connection.id)
          .order('open_time', { ascending: false })
          .limit(10),
      ]);

      if (!isActive) return;

      setSnapshots(snapshotsResult.error ? [] : snapshotsResult.data ?? []);
      setTotalTradesCount(tradesCountResult.error ? 0 : tradesCountResult.count ?? 0);
      setRecentTrades(recentTradesResult.error ? [] : recentTradesResult.data ?? []);
    }

    loadPerformanceData();

    return () => {
      isActive = false;
    };
  }, [selectedAccount?.id]);

  const account = selectedAccount;
  const evals = ruleRows.map(mapRuleEvaluationRow);
  const maxLossEval = evals.find(e =>
    e.rule.type === 'MAX_TOTAL_LOSS' || e.rule.type === 'TRAILING_MAX_LOSS'
  );
  const dailyLossEval = evals.find(e => e.rule.type === 'MAX_DAILY_LOSS');
  const maxLossLimit = maxLossEval?.limitValue ?? (account ? account.startBalance * 0.1 : 0);
  const dailyLossLimit = dailyLossEval?.limitValue ?? (account ? account.startBalance * 0.05 : 0);
  const data = useMemo(() => {
    if (!account) return [];
    return mapSnapshotData(account, snapshots, maxLossLimit);
  }, [account, maxLossLimit, snapshots]);

  const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: chartColors.popover,
    border: `1px solid ${chartColors.border}`,
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    color: chartColors.popoverForeground,
  };
  const tooltipLabelStyle: React.CSSProperties = { color: chartColors.mutedForeground };

  if (!account) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <PerformanceHeader />
        <GuidedEmptyState
          icon={Wallet}
          title="Nenhuma conta para analisar"
          description="Crie ou conecte uma conta MT5 primeiro. A página de performance precisa de snapshots reais para mostrar equity, drawdown e histórico."
        />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <PerformanceHeader />

        <AccountSelector accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />

        <GuidedEmptyState
          icon={RefreshCw}
          title="Performance ainda sem histórico"
          description="Nenhum snapshot real foi encontrado para esta conta. Execute o primeiro sync MT5 para criar histórico de balance/equity e liberar a análise."
        />
      </div>
    );
  }

  const totalPnl = account.currentEquity - account.startBalance;
  const returnPct = account.startBalance > 0 ? (totalPnl / account.startBalance) * 100 : 0;
  const maxDrawdownValue = Math.max(...data.map(d => d.drawdown));
  const currentDrawdown = data[data.length - 1]?.drawdown ?? 0;
  const tradingDays = data.filter(d => d.dailyPnl !== 0).length;

  const drawdownRemaining = maxLossLimit - currentDrawdown;
  const ddUsagePct = maxLossLimit > 0 ? (maxDrawdownValue / maxLossLimit) * 100 : 0;
  const ddTone: Tone = ddUsagePct >= 80 ? 'destructive' : ddUsagePct >= 50 ? 'warning' : 'muted';

  // Recovery
  const isNegative = totalPnl < 0;
  const recoveryNeeded = isNegative ? Math.abs(totalPnl) : 0;
  const recoveryPct = isNegative ? (recoveryNeeded / account.currentEquity) * 100 : 0;

  // Profit target
  const profitEval = evals.find(e => e.rule.type === 'PROFIT_TARGET');
  const profitTarget = profitEval?.limitValue ?? account.startBalance * 0.1;
  const profitRemaining = Math.max(profitTarget - Math.max(totalPnl, 0), 0);
  const goalPct = profitTarget > 0 ? Math.min((Math.max(totalPnl, 0) / profitTarget) * 100, 100) : 0;
  const goalTone: Tone = goalPct >= 75 ? 'success' : 'muted';

  // Risk usage
  const dailyPnls = data.map(d => d.dailyPnl);
  const biggestLoss = Math.min(...dailyPnls);
  const biggestWin = Math.max(...dailyPnls);
  const avgDailyUsage = dailyPnls.reduce((a, b) => a + Math.abs(Math.min(b, 0)), 0) / dailyPnls.length;
  const maxDailyUsage = Math.abs(biggestLoss);

  // Survival
  const avgDailyResult = dailyPnls.reduce((a, b) => a + b, 0) / dailyPnls.length;
  const daysToTarget = avgDailyResult > 0 ? Math.ceil(profitRemaining / avgDailyResult) : Infinity;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Performance</h1>
        <p className="text-xs text-muted-foreground">Análise completa de desempenho e risco da conta.</p>
      </div>

      <AccountSelector accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />

      {/* ── RESUMO ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <HeroStatCard
          className="col-span-2 sm:col-span-3 lg:col-span-2"
          totalPnl={totalPnl}
          returnPct={returnPct}
          startBalance={account.startBalance}
          sparklineData={data.slice(-14)}
          successColor={chartColors.success}
          destructiveColor={chartColors.destructive}
        />
        <StatCard
          icon={TrendingDown}
          label="Drawdown Máx."
          value={fmt(maxDrawdownValue)}
          badge={<PillBadge tone={ddTone}>{ddUsagePct.toFixed(0)}% do limite</PillBadge>}
          hint="Maior drawdown já registrado nesta conta, comparado ao limite de perda máxima configurado nas regras."
        />
        <StatCard
          icon={BarChart3}
          label="Trades Totais"
          value={String(totalTradesCount)}
          hint="Total de trades sincronizados para esta conta (contagem exata via Supabase, não apenas os exibidos na tabela abaixo)."
        />
        <StatCard
          icon={Calendar}
          label="Dias Operados"
          value={String(tradingDays)}
          hint="Dias com pelo menos um resultado diário diferente de zero, com base nos snapshots sincronizados."
        />
        <StatCard
          icon={Target}
          label="Meta Restante"
          value={fmt(profitRemaining)}
          badge={<PillBadge tone={goalTone}>{goalPct.toFixed(0)}% da meta</PillBadge>}
          hint="Quanto falta, em dólares, para atingir a meta de lucro configurada para esta conta."
        />
      </div>

      {totalTradesCount === 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">Conta sincronizada, mas sem trades fechados</p>
          <p className="text-xs text-muted-foreground mt-1">
            A curva de equity já pode ser acompanhada, mas métricas de consistência e histórico de performance ficam limitadas até existirem trades.
          </p>
        </div>
      )}

      {/* ── EQUITY CURVE + RESULTADO POR DIA ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Curva de Equity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.info} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={chartColors.info} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ddFloorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.destructive} stopOpacity={0.16} />
                  <stop offset="95%" stopColor={chartColors.destructive} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: chartColors.mutedForeground }}
                axisLine={{ stroke: chartColors.border }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: chartColors.mutedForeground }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <RechartsTooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(value: number, name: string) => [fmt(value), name]}
              />
              {/* Danger floor first so the equity area layers on top of it (soft overlapping fills) */}
              <Area
                type="monotone"
                dataKey="drawdownLimit"
                stroke={chartColors.destructive}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                fill="url(#ddFloorGrad)"
                name="Limite de Drawdown"
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={chartColors.info}
                fill="url(#eqGrad)"
                strokeWidth={2}
                name="Equity"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-info" /> Equity
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-destructive" /> Limite de Drawdown
            </span>
          </div>
        </section>

        <DayResultCard
          data={data}
          successColor={chartColors.success}
          destructiveColor={chartColors.destructive}
          mutedColor={chartColors.mutedForeground}
          tooltipContentStyle={tooltipContentStyle}
          tooltipLabelStyle={tooltipLabelStyle}
        />
      </div>

      {/* ── ANALISE DE DRAWDOWN ──────────────────────────── */}
      <section className="rounded-lg border border-border bg-card p-5 space-y-5">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">Análise de Drawdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Drawdown Atual</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-destructive">{fmt(currentDrawdown)}</p>
            <ProgressBar value={currentDrawdown} max={maxLossLimit} color="hsl(var(--destructive))" />
            <p className="text-xs text-muted-foreground">de {fmt(maxLossLimit)} permitidos</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Drawdown Máximo Histórico</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-warning">{fmt(maxDrawdownValue)}</p>
            <ProgressBar value={maxDrawdownValue} max={maxLossLimit} color="hsl(var(--warning))" />
            <p className="text-xs text-muted-foreground">de {fmt(maxLossLimit)} permitidos</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Margem Restante</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-success">{fmt(drawdownRemaining)}</p>
            <ProgressBar value={drawdownRemaining} max={maxLossLimit} color="hsl(var(--success))" />
            <p className="text-xs text-muted-foreground">disponível antes da violação</p>
          </div>
        </div>
      </section>

      {/* ── RECOVERY ANALYSIS ──────────────────────────── */}
      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">Análise de Recuperação</h2>
        {isNegative ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground uppercase">Perda Atual</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-destructive">{fmt(totalPnl)}</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground uppercase">Precisa Recuperar</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-warning">{fmt(recoveryNeeded)}</p>
              <p className="text-xs text-muted-foreground">
                ({fmtPct(recoveryPct)} sobre o equity atual de {fmt(account.currentEquity)})
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground uppercase">Lucro Atual</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-success">{fmt(totalPnl)}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase">Faltam para a Meta</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-primary">{fmt(profitRemaining)}</p>
              <p className="text-xs text-muted-foreground">
                Meta total: {fmt(profitTarget)} — já alcançou {fmt(Math.max(totalPnl, 0))}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── RISCO UTILIZADO ────────────────────────────── */}
      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risco Utilizado</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Maior Perda Diária</p>
            <p className="text-lg font-bold font-mono tabular-nums text-destructive">{fmt(biggestLoss)}</p>
            <ProgressBar value={Math.abs(biggestLoss)} max={dailyLossLimit} color="hsl(var(--destructive))" />
            <p className="text-[10px] text-muted-foreground">Limite: {fmt(dailyLossLimit)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Maior Lucro Diário</p>
            <p className="text-lg font-bold font-mono tabular-nums text-success">{fmt(biggestWin)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Uso Médio do Limite</p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground">{fmt(avgDailyUsage)}</p>
            <ProgressBar value={avgDailyUsage} max={dailyLossLimit} color="hsl(var(--warning))" />
            <p className="text-[10px] text-muted-foreground">de {fmt(dailyLossLimit)}/dia</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Uso Máximo do Limite</p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground">{fmt(maxDailyUsage)}</p>
            <ProgressBar value={maxDailyUsage} max={dailyLossLimit} color="hsl(var(--destructive))" />
            <p className="text-[10px] text-muted-foreground">de {fmt(dailyLossLimit)}/dia</p>
          </div>
        </div>
      </section>

      {/* ── TRADES RECENTES ─────────────────────────────── */}
      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trades Recentes</h2>
          <span className="text-[11px] text-muted-foreground">{totalTradesCount} no total</span>
        </div>
        <RecentTradesTable trades={recentTrades} />
      </section>

      {/* ── CALENDÁRIO ─────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Calendário de Performance</h2>
        <CalendarGrid data={data} />
        <div className="flex gap-4 mt-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-success/40" /> Lucro</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-destructive/40" /> Perda</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-muted/60" /> Sem trade</span>
        </div>
      </section>

      {/* ── ANÁLISE DE SOBREVIVÊNCIA ───────────────────── */}
      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">Análise de Sobrevivência</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Risk level */}
          <InsightRow
            icon={Activity}
            label="Risco atual da conta"
            value={currentDrawdown > maxLossLimit * 0.7
              ? 'ALTO'
              : currentDrawdown > maxLossLimit * 0.4
                ? 'MODERADO'
                : 'BAIXO'}
            detail={`Usando ${fmt(currentDrawdown)} de ${fmt(maxLossLimit)} do limite de drawdown`}
            color={currentDrawdown > maxLossLimit * 0.7
              ? 'text-destructive'
              : currentDrawdown > maxLossLimit * 0.4
                ? 'text-warning'
                : 'text-success'}
          />
          {/* Avg daily result */}
          <InsightRow
            icon={BarChart3}
            label="Média diária de resultado"
            value={fmt(Math.round(avgDailyResult))}
            detail={avgDailyResult > 0
              ? `Resultado positivo — lucro médio de ${fmt(Math.round(avgDailyResult))} por dia`
              : `Resultado negativo — perda média de ${fmt(Math.abs(Math.round(avgDailyResult)))} por dia`}
            color={avgDailyResult >= 0 ? 'text-success' : 'text-destructive'}
          />
          {/* Daily limit usage */}
          <InsightRow
            icon={TrendingDown}
            label="Uso do limite diário"
            value={fmt(Math.round(avgDailyUsage))}
            detail={`Média de uso de ${fmt(Math.round(avgDailyUsage))} do limite de ${fmt(dailyLossLimit)} por dia`}
            color="text-foreground"
          />
          {/* Days to target */}
          <InsightRow
            icon={Target}
            label="Projeção para a meta"
            value={daysToTarget === Infinity ? '—' : `${daysToTarget} dias`}
            detail={daysToTarget === Infinity
              ? 'Média negativa — não é possível projetar'
              : `Mantendo ${fmt(Math.round(avgDailyResult))}/dia, faltam ${daysToTarget} dias para atingir a meta de ${fmt(profitTarget)}`}
            color={daysToTarget <= 15 ? 'text-success' : daysToTarget <= 30 ? 'text-warning' : 'text-muted-foreground'}
          />
        </div>
      </section>
    </div>
  );
};

function InsightRow({ icon: Icon, label, value, detail, color }: {
  icon: React.ElementType; label: string; value: string; detail: string; color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-bold font-mono tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export default Performance;
