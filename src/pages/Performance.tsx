import { useEffect, useState, useMemo } from 'react';
import { AccountSelector } from '@/components/AccountSelector';
import { TradingAccount } from '@/types/fortify';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { useRuleEvaluations } from '@/hooks/useRuleEvaluations';
import { mapRuleEvaluationRow } from '@/lib/ruleEvaluationView';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Calendar, BarChart3, Shield, Activity, Target,
  ArrowUpRight, ArrowDownRight, Minus, Wallet, RefreshCw,
} from 'lucide-react';
import { GuidedEmptyState } from '@/components/BetaReadinessChecklist';

/* ── helpers ─────────────────────────────────────────────── */
const fmt = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

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
type MT5Trade = Pick<Tables<'mt5_trades'>, 'id'>;

function formatDayLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dt = new Date(year, (month || 1) - 1, day || 1);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
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
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" style={color ? { color } : undefined} />
        <span className="text-xs uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold font-mono text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
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

/* ── tooltip ─────────────────────────────────────────────── */
const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(220, 22%, 9%)',
    border: '1px solid hsl(220, 16%, 16%)',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, monospace',
  },
  labelStyle: { color: 'hsl(215, 15%, 50%)' },
};

/* ── main page ───────────────────────────────────────────── */
const Performance = () => {
  const { accounts } = useAccountsStore();
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | undefined>(accounts[0]);
  const [snapshots, setSnapshots] = useState<MT5Snapshot[]>([]);
  const [trades, setTrades] = useState<MT5Trade[]>([]);
  const { data: ruleRows = [] } = useRuleEvaluations(selectedAccount?.id);

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
          setTrades([]);
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
        setTrades([]);
        return;
      }

      const [snapshotsResult, tradesResult] = await Promise.all([
        supabase
          .from('mt5_account_snapshots')
          .select('*')
          .eq('connection_id', connection.id)
          .order('date', { ascending: true }),
        supabase
          .from('mt5_trades')
          .select('id')
          .eq('connection_id', connection.id),
      ]);

      if (!isActive) return;

      setSnapshots(snapshotsResult.error ? [] : snapshotsResult.data ?? []);
      setTrades(tradesResult.error ? [] : tradesResult.data ?? []);
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

  if (!account) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
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
        <div>
          <h1 className="text-lg font-bold text-foreground">Performance</h1>
          <p className="text-xs text-muted-foreground">Análise completa de desempenho e risco da conta.</p>
        </div>

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
  const totalTrades = trades.length;

  const drawdownRemaining = maxLossLimit - currentDrawdown;

  // Recovery
  const isNegative = totalPnl < 0;
  const recoveryNeeded = isNegative ? Math.abs(totalPnl) : 0;
  const recoveryPct = isNegative ? (recoveryNeeded / account.currentEquity) * 100 : 0;

  // Profit target
  const profitEval = evals.find(e => e.rule.type === 'PROFIT_TARGET');
  const profitTarget = profitEval?.limitValue ?? account.startBalance * 0.1;
  const profitRemaining = Math.max(profitTarget - Math.max(totalPnl, 0), 0);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          label="Lucro Total"
          value={fmt(totalPnl)}
          sub={fmtPct(returnPct)}
          color={totalPnl >= 0 ? 'hsl(152, 69%, 46%)' : 'hsl(0, 72%, 51%)'}
        />
        <StatCard icon={TrendingDown} label="Drawdown Máx." value={fmt(maxDrawdownValue)} color="hsl(0, 72%, 51%)" />
        <StatCard icon={BarChart3} label="Trades Totais" value={String(totalTrades)} />
        <StatCard icon={Calendar} label="Dias Operados" value={String(tradingDays)} />
        <StatCard icon={Target} label="Meta Restante" value={fmt(profitRemaining)} />
      </div>

      {totalTrades === 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">Conta sincronizada, mas sem trades fechados</p>
          <p className="text-xs text-muted-foreground mt-1">
            A curva de equity já pode ser acompanhada, mas métricas de consistência e histórico de performance ficam limitadas até existirem trades.
          </p>
        </div>
      )}

      {/* ── EQUITY CURVE ───────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Curva de Equity</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(187, 85%, 53%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(187, 85%, 53%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 16%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [fmt(value), name]} />
            <Area type="monotone" dataKey="equity" stroke="hsl(187, 85%, 53%)" fill="url(#eqGrad)" strokeWidth={2} name="Equity" />
            <Area type="monotone" dataKey="drawdownLimit" stroke="hsl(0, 72%, 51%)" fill="transparent" strokeWidth={1.5} strokeDasharray="6 3" name="Limite de Drawdown" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(187, 85%, 53%)' }} /> Equity
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ backgroundColor: 'hsl(0, 72%, 51%)' }} /> Limite de Drawdown
          </span>
        </div>
      </section>

      {/* ── DRAWDOWN ANALYSIS ──────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drawdown Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Drawdown Atual</p>
            <p className="text-2xl font-bold font-mono text-destructive">{fmt(currentDrawdown)}</p>
            <ProgressBar value={currentDrawdown} max={maxLossLimit} color="hsl(0, 72%, 51%)" />
            <p className="text-xs text-muted-foreground">de {fmt(maxLossLimit)} permitidos</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Drawdown Máximo Histórico</p>
            <p className="text-2xl font-bold font-mono text-warning">{fmt(maxDrawdownValue)}</p>
            <ProgressBar value={maxDrawdownValue} max={maxLossLimit} color="hsl(38, 92%, 50%)" />
            <p className="text-xs text-muted-foreground">de {fmt(maxLossLimit)} permitidos</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Margem Restante</p>
            <p className="text-2xl font-bold font-mono text-success">{fmt(drawdownRemaining)}</p>
            <ProgressBar value={drawdownRemaining} max={maxLossLimit} color="hsl(152, 69%, 46%)" />
            <p className="text-xs text-muted-foreground">disponível antes da violação</p>
          </div>
        </div>
      </section>

      {/* ── RECOVERY ANALYSIS ──────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Análise de Recuperação</h2>
        {isNegative ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground uppercase">Perda Atual</span>
              </div>
              <p className="text-2xl font-bold font-mono text-destructive">{fmt(totalPnl)}</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground uppercase">Precisa Recuperar</span>
              </div>
              <p className="text-2xl font-bold font-mono text-warning">{fmt(recoveryNeeded)}</p>
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
              <p className="text-2xl font-bold font-mono text-success">{fmt(totalPnl)}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase">Faltam para a Meta</span>
              </div>
              <p className="text-2xl font-bold font-mono text-primary">{fmt(profitRemaining)}</p>
              <p className="text-xs text-muted-foreground">
                Meta total: {fmt(profitTarget)} — já alcançou {fmt(Math.max(totalPnl, 0))}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── RISCO UTILIZADO ────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risco Utilizado</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Maior Perda Diária</p>
            <p className="text-lg font-bold font-mono text-destructive">{fmt(biggestLoss)}</p>
            <ProgressBar value={Math.abs(biggestLoss)} max={dailyLossLimit} color="hsl(0, 72%, 51%)" />
            <p className="text-[10px] text-muted-foreground">Limite: {fmt(dailyLossLimit)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Maior Lucro Diário</p>
            <p className="text-lg font-bold font-mono text-success">{fmt(biggestWin)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Uso Médio do Limite</p>
            <p className="text-lg font-bold font-mono text-foreground">{fmt(avgDailyUsage)}</p>
            <ProgressBar value={avgDailyUsage} max={dailyLossLimit} color="hsl(38, 92%, 50%)" />
            <p className="text-[10px] text-muted-foreground">de {fmt(dailyLossLimit)}/dia</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Uso Máximo do Limite</p>
            <p className="text-lg font-bold font-mono text-foreground">{fmt(maxDailyUsage)}</p>
            <ProgressBar value={maxDailyUsage} max={dailyLossLimit} color="hsl(0, 72%, 51%)" />
            <p className="text-[10px] text-muted-foreground">de {fmt(dailyLossLimit)}/dia</p>
          </div>
        </div>
      </section>

      {/* ── CALENDÁRIO ─────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Calendário de Performance</h2>
        <CalendarGrid data={data} />
        <div className="flex gap-4 mt-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-success/40" /> Lucro</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-destructive/40" /> Perda</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-muted/60" /> Sem trade</span>
        </div>
      </section>

      {/* ── ANÁLISE DE SOBREVIVÊNCIA ───────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Análise de Sobrevivência</h2>
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
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export default Performance;
