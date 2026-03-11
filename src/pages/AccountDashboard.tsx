import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_EVALUATIONS, RULE_SET_TEMPLATES } from '@/data/mockData';
import { useAccountsStore } from '@/pages/Accounts';
import { RuleEvaluation, type Mt5ConnectionStatus, type Trade, type OpenPosition, type AccountSnapshot } from '@/types/fortify';
import {
  Shield, ShieldAlert, ShieldX, AlertTriangle, ArrowLeft,
  Lightbulb, Bell, TrendingDown, Target, Activity, Sparkles,
  Link2, RefreshCw, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { RuleExtractor } from '@/components/RuleExtractor';
import type { TemplateRule } from '@/data/propFirmLibrary';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
const fmtSigned = (v: number | undefined | null) => {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  const s = `$${abs.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  return n >= 0 ? `+${s}` : `-${s}`;
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

const statusConfig = {
  SAFE: { label: 'SEGURO', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: Shield },
  WARNING: { label: 'ATENÇÃO', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: ShieldAlert },
  VIOLATED: { label: 'VIOLADO', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: ShieldX },
} as const;

const mt5StatusConfig: Record<Mt5ConnectionStatus, { label: string; icon: typeof Link2; className: string }> = {
  disconnected: { label: 'Desconectada', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  connecting: { label: 'Conectando', icon: RefreshCw, className: 'bg-warning/15 text-warning' },
  connected: { label: 'Conectada', icon: Link2, className: 'bg-success/15 text-success' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'bg-primary/15 text-primary' },
  auth_error: { label: 'Erro de autenticação', icon: AlertTriangle, className: 'bg-destructive/15 text-destructive' },
};

const getSupabaseUrl = () =>
  (import.meta as any)?.env?.VITE_SUPABASE_URL ||
  (import.meta as any)?.env?.VITE_PUBLIC_SUPABASE_URL ||
  (window as any)?.__SUPABASE_URL__;

const getSupabaseAnonKey = () =>
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any)?.env?.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  (window as any)?.__SUPABASE_ANON_KEY__;

const AccountDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accounts, addAccount } = useAccountsStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ai-rules'>('dashboard');
  const [appliedAiRules, setAppliedAiRules] = useState<TemplateRule[]>([]);

  const account = accounts.find(a => a.id === id);

  // Supabase (dados reais - tabelas oficiais)
  const [loadingMt5Data, setLoadingMt5Data] = useState(false);
  const [mt5DataError, setMt5DataError] = useState<string | null>(null);
  const [openPositions, setOpenPositions] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [connection, setConnection] = useState<any | null>(null);
  const [tradingAccountRow, setTradingAccountRow] = useState<any | null>(null);
  const [dbAccountLoaded, setDbAccountLoaded] = useState(false);

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } });
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!supabase || !id) {
        setDbAccountLoaded(true);
        return;
      }

      setLoadingMt5Data(true);
      setMt5DataError(null);

      try {
        const [accRes, connRes, posRes, tradesRes, snapRes] = await Promise.all([
          supabase
            .from('trading_accounts')
            .select('id,nickname,broker,mt5_server,mt5_login,account_type,prop_firm,start_balance,current_balance,current_equity,highest_equity,status')
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('mt5_connections')
            .select('*')
            .eq('trading_account_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('openPositions')
            .select('*')
            .eq('tradingAccountId', id)
            .order('updatedAt', { ascending: false }),
          supabase
            .from('trades')
            .select('*')
            .eq('tradingAccountId', id)
            .order('closeTime', { ascending: false, nullsFirst: false })
            .order('openTime', { ascending: false })
            .limit(200),
          supabase
            .from('accountSnapshots')
            .select('*')
            .eq('tradingAccountId', id)
            .order('date', { ascending: true })
            .limit(365),
        ]);

        if (cancelled) return;

        if (accRes.error) throw accRes.error;
        if (connRes.error) throw connRes.error;
        if (posRes.error) throw posRes.error;
        if (tradesRes.error) throw tradesRes.error;
        if (snapRes.error) throw snapRes.error;

        setTradingAccountRow(accRes.data ?? null);
        setConnection(connRes.data ?? null);
        setOpenPositions((posRes.data ?? []) as OpenPosition[]);
        setRecentTrades((tradesRes.data ?? []) as Trade[]);
        setSnapshots((snapRes.data ?? []) as AccountSnapshot[]);

        if (accRes.data && !account) {
          const r = accRes.data as any;
          const startBalance = Number(r.start_balance ?? 0);
          const currentBalance = Number(r.current_balance ?? startBalance);
          const currentEquity = Number(r.current_equity ?? currentBalance);
          const highestEquityAllTime = Number(r.highest_equity ?? currentEquity);
          addAccount({
            id: String(r.id),
            userId: '',
            nickname: String(r.nickname ?? ''),
            broker: String(r.broker ?? ''),
            baseCurrency: 'USD',
            startBalance,
            currentBalance,
            currentEquity,
            highestEquityAllTime,
            status: (r.status as any) ?? 'active',
            ruleSetId: 'custom',
            createdAt: new Date().toISOString().split('T')[0],
            mt5Server: r.mt5_server ?? undefined,
            mt5Login: r.mt5_login ?? undefined,
            accountType: r.account_type ?? undefined,
            propFirm: r.prop_firm ?? undefined,
          } as any);
        }
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.message || 'Falha ao carregar dados do MT5 via Supabase.';
        setMt5DataError(msg);
      } finally {
        if (!cancelled) {
          setLoadingMt5Data(false);
          setDbAccountLoaded(true);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, id]);

  const effectiveAccount = account || (tradingAccountRow ? {
    id: String(tradingAccountRow.id),
    userId: '',
    nickname: String(tradingAccountRow.nickname ?? ''),
    broker: String(tradingAccountRow.broker ?? ''),
    baseCurrency: 'USD',
    startBalance: Number(tradingAccountRow.start_balance ?? 0),
    currentBalance: Number(tradingAccountRow.current_balance ?? tradingAccountRow.start_balance ?? 0),
    currentEquity: Number(tradingAccountRow.current_equity ?? tradingAccountRow.current_balance ?? 0),
    highestEquityAllTime: Number(tradingAccountRow.highest_equity ?? tradingAccountRow.current_equity ?? 0),
    status: (tradingAccountRow.status as any) ?? 'active',
    ruleSetId: 'custom',
    createdAt: new Date().toISOString().split('T')[0],
    mt5Server: tradingAccountRow.mt5_server ?? undefined,
    mt5Login: tradingAccountRow.mt5_login ?? undefined,
    accountType: tradingAccountRow.account_type ?? undefined,
    propFirm: tradingAccountRow.prop_firm ?? undefined,
  } as any : null);

  if (!effectiveAccount) {
    if (!dbAccountLoaded) {
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Carregando conta...</p>
        </div>
      );
    }

    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Conta não encontrada.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-primary text-sm">Voltar ao Painel</button>
      </div>
    );
  }

  const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === effectiveAccount.id);
  const ruleSet = RULE_SET_TEMPLATES.find(r => r.id === (effectiveAccount as any).ruleSetId);
  const firmName = ruleSet?.firmName || ruleSet?.name || '—';

  const dailyLoss = evals.find(e => e.rule.type === 'MAX_DAILY_LOSS');
  const totalLoss = evals.find(e => e.rule.type === 'MAX_TOTAL_LOSS') || evals.find(e => e.rule.type === 'TRAILING_MAX_LOSS');
  const profitTarget = evals.find(e => e.rule.type === 'PROFIT_TARGET');
  const consistency = evals.find(e => e.rule.type === 'CONSISTENCY_BEST_DAY_CAP');
  const minDays = evals.find(e => e.rule.type === 'MIN_TRADING_DAYS');

  const dailyRemaining = dailyLoss ? Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue) : 0;
  const maxLossRemaining = totalLoss ? Math.max(0, totalLoss.limitValue - totalLoss.currentValue) : 0;

  // Floating loss (simulated as open P&L) - fallback quando snapshot ainda não existe
  const floatingLoss = (effectiveAccount as any).currentEquity - (effectiveAccount as any).currentBalance;
  const floatingLimit = dailyLoss ? dailyLoss.limitValue : 0;

  const riskEvals = evals.filter(e => ['MAX_DAILY_LOSS', 'MAX_TOTAL_LOSS', 'TRAILING_MAX_LOSS'].includes(e.rule.type));
  const avgRisk = riskEvals.length > 0 ? riskEvals.reduce((s, e) => s + e.progressPct, 0) / riskEvals.length : 0;

  const hasViolation = evals.some(e => e.status === 'VIOLATED');
  const hasWarning = evals.some(e => e.status === 'WARNING');
  const status: 'SAFE' | 'WARNING' | 'VIOLATED' = hasViolation ? 'VIOLATED' : hasWarning ? 'WARNING' : 'SAFE';
  const healthScore = Math.max(0, Math.round(100 - avgRisk));
  const sc = statusConfig[status];
  const StatusIcon = sc.icon;

  const connectionStatus = (connection?.connectionStatus || connection?.connection_status || 'disconnected') as Mt5ConnectionStatus;
  const mt5c = mt5StatusConfig[connectionStatus] || mt5StatusConfig.disconnected;
  const Mt5Icon = mt5c.icon;

  const headerNickname = tradingAccountRow?.nickname ?? (effectiveAccount as any).nickname;
  const headerBroker = tradingAccountRow?.broker ?? (effectiveAccount as any).broker;
  const headerServer = tradingAccountRow?.mt5_server ?? tradingAccountRow?.mt5Server ?? connection?.mt5Server ?? connection?.mt5_server ?? (effectiveAccount as any).mt5Server;
  const headerLogin = tradingAccountRow?.mt5_login ?? tradingAccountRow?.mt5Login ?? connection?.mt5Login ?? connection?.mt5_login ?? (effectiveAccount as any).mt5Login;
  const headerAccountType = tradingAccountRow?.account_type ?? tradingAccountRow?.accountType ?? (effectiveAccount as any).accountType;
  const headerPropFirm = tradingAccountRow?.prop_firm ?? tradingAccountRow?.propFirm ?? (effectiveAccount as any).propFirm;
  const lastSyncAt = connection?.lastSyncAt ?? connection?.last_sync_at ?? (effectiveAccount as any).mt5LastSyncAt;
  const provider = connection?.provider ?? '—';
  const lastError = connection?.syncError ?? connection?.sync_error ?? connection?.authError ?? connection?.auth_error ?? connection?.lastError ?? connection?.last_error;

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const currentBalance = Number(latestSnapshot?.balance ?? tradingAccountRow?.current_balance ?? tradingAccountRow?.currentBalance ?? (effectiveAccount as any).currentBalance ?? 0);
  const currentEquity = Number(latestSnapshot?.equity ?? tradingAccountRow?.current_equity ?? tradingAccountRow?.currentEquity ?? (effectiveAccount as any).currentEquity ?? 0);
  const highestEquity = Number(latestSnapshot?.highestEquity ?? (latestSnapshot as any)?.highest_equity ?? tradingAccountRow?.highest_equity ?? tradingAccountRow?.highestEquity ?? (effectiveAccount as any).highestEquityAllTime ?? 0);

  const maxBalanceValue = Number((latestSnapshot as any)?.maxBalance ?? (latestSnapshot as any)?.max_balance ?? currentBalance);
  const dailyPnlValue = Number((latestSnapshot as any)?.dailyPnl ?? (latestSnapshot as any)?.daily_pnl ?? 0);
  const floatingPnlValue = Number((latestSnapshot as any)?.floatingPnl ?? (latestSnapshot as any)?.floating_pnl ?? (currentEquity - currentBalance));
  const drawdownValue = Number((latestSnapshot as any)?.drawdown ?? Math.max(0, highestEquity - currentEquity));

  const usedDailyLossPctValue = (latestSnapshot as any)?.usedDailyLossPct ?? (latestSnapshot as any)?.used_daily_loss_pct;
  const usedTotalLossPctValue = (latestSnapshot as any)?.usedTotalLossPct ?? (latestSnapshot as any)?.used_total_loss_pct;

  // KPIs
  const closedTrades = useMemo(() => recentTrades.filter(t => !!((t as any).closeTime ?? (t as any).close_time)), [recentTrades]);
  const totalTrades = closedTrades.length;
  const wins = closedTrades.filter(t => Number((t as any).profit ?? 0) > 0);
  const losses = closedTrades.filter(t => Number((t as any).profit ?? 0) < 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  const totalPnl = closedTrades.reduce((s, t) => s + Number((t as any).profit ?? 0), 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + Number((t as any).profit ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(Number((t as any).profit ?? 0)), 0) / losses.length : 0;
  const payoff = avgLoss > 0 ? avgWin / avgLoss : 0;

  const maxDrawdown = useMemo(() => {
    if (snapshots.length === 0) return drawdownValue;
    return snapshots.reduce((m, s) => Math.max(m, Number((s as any).drawdown ?? 0)), 0);
  }, [snapshots, drawdownValue]);

  const currentDrawdown = drawdownValue;
  const recoveryNeeded = currentDrawdown;

  // Recommendations
  const recommendations: string[] = [];
  recommendations.push(`Você ainda pode perder hoje: ${fmt(dailyRemaining)}`);
  if (dailyLoss && dailyLoss.progressPct > 70) {
    const usedDaily = dailyLoss.currentValue;
    const remainDaily = Math.max(0, dailyLoss.limitValue - usedDaily);
    recommendations.push(`Risco diário alto, você já perdeu ${fmt(usedDaily)} e só pode perder mais ${fmt(remainDaily)}. Considere reduzir lote`);
  } else if (dailyLoss && dailyLoss.progressPct > 40) {
    const usedDaily = dailyLoss.currentValue;
    const remainDaily = Math.max(0, dailyLoss.limitValue - usedDaily);
    recommendations.push(`Você já usou ${fmt(usedDaily)} do limite diário de ${fmt(dailyLoss.limitValue)}. Restam ${fmt(remainDaily)}`);
  }
  if (profitTarget && profitTarget.currentValue < 0) {
    const neededValue = profitTarget.limitValue - profitTarget.currentValue;
    recommendations.push(`Conta em recuperação, precisa de ${fmt(neededValue)} para voltar ao equilíbrio e atingir a meta`);
  } else if (profitTarget) {
    const remaining = profitTarget.limitValue - Math.max(0, profitTarget.currentValue);
    recommendations.push(`Faltam ${fmt(remaining)} para atingir a meta de lucro de ${fmt(profitTarget.limitValue)}`);
  }
  if (avgRisk > 65) recommendations.push('Considere parar de operar hoje');
  else if (avgRisk > 45) recommendations.push('Reduza o tamanho dos lotes nos próximos trades');
  else recommendations.push('Risco controlado, mantenha a estratégia');

  // Alerts
  const alerts: { text: string; severity: 'warning' | 'danger' | 'info' }[] = [];
  evals.forEach(ev => {
    if (ev.status === 'WARNING') alerts.push({ text: `${ev.rule.name}: ${ev.message}`, severity: 'warning' });
    if (ev.status === 'VIOLATED') alerts.push({ text: `${ev.rule.name}: ${ev.message}`, severity: 'danger' });
    if (ev.status === 'NOT_MET' && ev.progressPct < 50) alerts.push({ text: `${ev.rule.name}: ${ev.message}`, severity: 'info' });
  });

  if ((connectionStatus === 'auth_error' || connectionStatus === 'disconnected') && (connection?.syncError || connection?.sync_error)) {
    alerts.unshift({ text: `MT5: ${connection?.syncError || connection?.sync_error}`, severity: 'danger' });
  }

  if (mt5DataError) {
    alerts.unshift({ text: `Dados MT5/Supabase: ${mt5DataError}`, severity: 'info' });
  }

  const barColorFor = (ev: RuleEvaluation | undefined) =>
    !ev ? 'bg-muted-foreground' :
    ev.status === 'VIOLATED' ? 'bg-destructive' :
    ev.status === 'WARNING' || ev.progressPct > 70 ? 'bg-warning' :
    'bg-success';

  const pnl = currentBalance - Number((effectiveAccount as any).startBalance ?? 0);
  const pnlPct = Number((effectiveAccount as any).startBalance ?? 1) > 0 ? ((pnl / Number((effectiveAccount as any).startBalance)) * 100).toFixed(2) : '0.00';

  const kpiCards = [
    { label: 'Total de Trades', value: totalTrades.toLocaleString('pt-BR') },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%` },
    { label: 'Average Win', value: fmt(avgWin) },
    { label: 'Average Loss', value: fmt(avgLoss) },
    { label: 'Payoff', value: payoff > 0 ? payoff.toFixed(2) : '—' },
    { label: 'Total PnL', value: fmtSigned(totalPnl), valueClass: totalPnl >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Current Drawdown', value: fmt(currentDrawdown), valueClass: currentDrawdown > 0 ? 'text-warning' : 'text-success' },
    { label: 'Max Drawdown', value: fmt(maxDrawdown), valueClass: maxDrawdown > 0 ? 'text-warning' : 'text-success' },
    { label: 'Recovery Needed', value: fmt(recoveryNeeded), valueClass: recoveryNeeded > 0 ? 'text-primary' : 'text-muted-foreground' },
  ] as Array<{ label: string; value: string; valueClass?: string }>;

  const chartData = useMemo(() => {
    return snapshots
      .filter(s => !!((s as any).date))
      .map(s => {
        const d = (s as any).date;
        return {
          date: new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          balance: Number((s as any).balance ?? 0),
          equity: Number((s as any).equity ?? 0),
          drawdown: Number((s as any).drawdown ?? 0),
          dailyPnl: Number((s as any).dailyPnl ?? (s as any).daily_pnl ?? 0),
        };
      });
  }, [snapshots]);

  const hasChartData = chartData.length > 1;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Back + Tabs */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Painel
        </button>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('ai-rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'ai-rules' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Sparkles className="w-3 h-3" />
            Extrair Regras
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (<>
      {/* Header da conta + MT5 status */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${mt5c.className}`}>
          <Mt5Icon className={`w-3 h-3 ${connectionStatus === 'connecting' || connectionStatus === 'syncing' ? 'animate-spin' : ''}`} />
          {mt5c.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground truncate">
            <span className="font-semibold">{headerNickname}</span>
            {headerBroker ? ` • ${headerBroker}` : ''}
            {headerServer ? ` • ${headerServer}` : ''}
            {headerLogin ? ` • ${headerLogin}` : ''}
            {headerPropFirm ? ` • ${headerPropFirm}` : firmName !== '—' ? ` • ${firmName}` : ''}
            {headerAccountType ? ` • ${headerAccountType}` : ''}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {lastSyncAt ? `Última sincronização: ${new Date(lastSyncAt).toLocaleString('pt-BR')}` : 'Sem sincronização registrada'}
            {loadingMt5Data ? ' • Carregando dados...' : ''}
          </p>
        </div>
      </div>

      {/* Bloco consolidado da conexão MT5 (real Supabase: public.mt5_connections) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Conexão MT5</h2>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${mt5c.className}`}>
                <Mt5Icon className={`w-3 h-3 ${connectionStatus === 'connecting' || connectionStatus === 'syncing' ? 'animate-spin' : ''}`} />
                {mt5c.label}
              </span>
              <p className="text-xs font-semibold text-foreground truncate">
                {connection ? 'Conexão vinculada à conta' : 'Conta ainda não conectada ao MT5'}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">public.mt5_connections</p>
          </div>

          {!connection ? (
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Conta ainda não conectada ao MT5. Conecte a conta para iniciar sincronização.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Esta conexão será a base para a futura sincronização automática via backend externo.</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
                <p className="text-sm font-semibold text-foreground mt-1">{mt5c.label}</p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Provider</p>
                <p className="text-sm font-mono font-semibold text-foreground mt-1">{String(provider || '—')}</p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Última sincronização</p>
                <p className="text-sm font-mono font-semibold text-foreground mt-1">{lastSyncAt ? new Date(lastSyncAt).toLocaleString('pt-BR') : '—'}</p>
              </div>

              <div className={`rounded-lg border p-3 ${lastError ? 'border-destructive/30 bg-destructive/5' : 'border-border/60 bg-muted/20'}`}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Último erro</p>
                <p className={`text-sm font-mono font-semibold mt-1 ${lastError ? 'text-destructive' : 'text-muted-foreground'}`}>{lastError ? String(lastError) : '—'}</p>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-[10px] text-muted-foreground">Esta conexão é a base para a futura sincronização automática via backend externo.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* === STATUS DA CONTA (saúde) === */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border ${sc.border} ${sc.bg} p-6 md:p-8`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Status da Conta</p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{headerNickname}</h1>
            </div>
            <p className="text-xs text-muted-foreground">{firmName} • {headerBroker}</p>

            <div className="flex items-center gap-2 mt-3">
              <StatusIcon className={`w-5 h-5 ${sc.color}`} />
              <span className={`text-lg font-bold ${sc.color}`}>{sc.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Inicial</p>
              <p className="font-mono font-bold text-foreground">{fmt(Number((effectiveAccount as any).startBalance ?? 0))}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity Atual</p>
              <p className="font-mono font-bold text-foreground">{fmt(currentEquity)}</p>
              <p className={`text-xs font-mono font-semibold ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                {pnl >= 0 ? '+' : ''}{pnlPct}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Health Score</p>
              <p className={`text-3xl font-mono font-bold ${sc.color}`}>{healthScore}</p>
              <p className="text-[10px] text-muted-foreground">/100</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* === VISÃO GERAL DA CONTA === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Visão geral</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Saldo atual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono font-bold text-foreground">{fmt(currentBalance)}</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Equity atual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono font-bold text-foreground">{fmt(currentEquity)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Floating PnL</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-mono font-bold ${floatingPnlValue >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtSigned(floatingPnlValue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Daily PnL</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-mono font-bold ${dailyPnlValue >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtSigned(dailyPnlValue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Drawdown atual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-mono font-bold ${drawdownValue > 0 ? 'text-warning' : 'text-success'}`}>{fmt(drawdownValue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Highest equity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono font-bold text-foreground">{fmt(highestEquity || currentEquity)}</p>
            </CardContent>
          </Card>
        </div>

        {usedDailyLossPctValue !== undefined || usedTotalLossPctValue !== undefined ? (
          <div className="mt-3 text-[10px] text-muted-foreground">
            {usedDailyLossPctValue !== undefined && usedDailyLossPctValue !== null ? `Perda diária usada: ${Number(usedDailyLossPctValue).toFixed(2)}%` : ''}
            {usedDailyLossPctValue !== undefined && usedDailyLossPctValue !== null && usedTotalLossPctValue !== undefined && usedTotalLossPctValue !== null ? ' • ' : ''}
            {usedTotalLossPctValue !== undefined && usedTotalLossPctValue !== null ? `Perda total usada: ${Number(usedTotalLossPctValue).toFixed(2)}%` : ''}
          </div>
        ) : null}
      </section>

      {/* === POSIÇÕES ABERTAS === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Posições abertas</h2>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{openPositions.length} posição(ões)</p>
            <p className="text-[10px] text-muted-foreground">public.open_positions</p>
          </div>
          {openPositions.length === 0 ? (
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Sem posições abertas (ou ainda não sincronizado).</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Símbolo</TableHead>
                  <TableHead>Lado</TableHead>
                  <TableHead className="text-right">Lote</TableHead>
                  <TableHead>Open time</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Floating PnL</TableHead>
                  <TableHead className="text-right">SL</TableHead>
                  <TableHead className="text-right">TP</TableHead>
                  <TableHead>Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPositions.map((p) => {
                  const fp = Number((p as any).floatingPnl ?? (p as any).floating_pnl ?? 0);
                  const side = (p as any).side;
                  const openTime = (p as any).openTime ?? (p as any).open_time;
                  const updatedAt = (p as any).updatedAt ?? (p as any).updated_at;
                  const openPrice = (p as any).openPrice ?? (p as any).open_price;
                  const currentPrice = (p as any).currentPrice ?? (p as any).current_price;
                  const stopLoss = (p as any).stopLoss ?? (p as any).stop_loss;
                  const takeProfit = (p as any).takeProfit ?? (p as any).take_profit;

                  return (
                    <TableRow key={(p as any).id}>
                      <TableCell className="font-mono text-xs">{(p as any).ticket}</TableCell>
                      <TableCell className="font-mono text-xs">{(p as any).symbol}</TableCell>
                      <TableCell className="text-xs">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${side === 'buy' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {side}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{Number((p as any).volume ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{openTime ? new Date(openTime).toLocaleString('pt-BR') : '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{openPrice ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{currentPrice ?? '—'}</TableCell>
                      <TableCell className={`text-right font-mono text-xs font-semibold ${fp >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtSigned(fp)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{stopLoss ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{takeProfit ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{updatedAt ? new Date(updatedAt).toLocaleString('pt-BR') : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {/* === HISTÓRICO DE TRADES === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Histórico de trades</h2>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Trades fechados recentes</p>
            <p className="text-[10px] text-muted-foreground">public.trades • até 200</p>
          </div>

          {closedTrades.length === 0 ? (
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Sem trades fechados (ou ainda não sincronizado).</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Símbolo</TableHead>
                  <TableHead>Lado</TableHead>
                  <TableHead className="text-right">Lote</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Close</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Swap</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedTrades.slice(0, 50).map((t) => {
                  const profit = Number((t as any).profit ?? 0);
                  const side = (t as any).side;
                  const openTime = (t as any).openTime ?? (t as any).open_time;
                  const closeTime = (t as any).closeTime ?? (t as any).close_time;
                  const openPrice = (t as any).openPrice ?? (t as any).open_price;
                  const closePrice = (t as any).closePrice ?? (t as any).close_price;
                  const swap = (t as any).swap;
                  const commission = (t as any).commission;

                  return (
                    <TableRow key={(t as any).id}>
                      <TableCell className="font-mono text-xs">{(t as any).ticket}</TableCell>
                      <TableCell className="font-mono text-xs">{(t as any).symbol}</TableCell>
                      <TableCell className="text-xs">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${side === 'buy' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {side}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{Number((t as any).volume ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{openTime ? new Date(openTime).toLocaleString('pt-BR') : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{closeTime ? new Date(closeTime).toLocaleString('pt-BR') : '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{openPrice ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{closePrice ?? '—'}</TableCell>
                      <TableCell className={`text-right font-mono text-xs font-semibold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtSigned(profit)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{swap ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{commission ?? '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {closedTrades.length > 50 && (
            <div className="p-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">Exibindo 50 mais recentes (total: {closedTrades.length}).</p>
            </div>
          )}
        </div>
      </section>

      {/* === SNAPSHOTS DA CONTA === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Snapshots da conta</h2>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Histórico diário</p>
            <p className="text-[10px] text-muted-foreground">public.account_snapshots</p>
          </div>

          {snapshots.length === 0 ? (
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Sem snapshots (ou ainda não sincronizado).</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Equity</TableHead>
                  <TableHead className="text-right">Daily PnL</TableHead>
                  <TableHead className="text-right">Floating PnL</TableHead>
                  <TableHead className="text-right">Drawdown</TableHead>
                  <TableHead className="text-right">Max balance</TableHead>
                  <TableHead className="text-right">Used daily loss %</TableHead>
                  <TableHead className="text-right">Used total loss %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.slice(-30).reverse().map((s) => {
                  const date = (s as any).date;
                  const dailyPnl = Number((s as any).dailyPnl ?? (s as any).daily_pnl ?? 0);
                  const floatingPnl = Number((s as any).floatingPnl ?? (s as any).floating_pnl ?? 0);
                  const usedDaily = (s as any).usedDailyLossPct ?? (s as any).used_daily_loss_pct;
                  const usedTotal = (s as any).usedTotalLossPct ?? (s as any).used_total_loss_pct;
                  const maxBal = (s as any).maxBalance ?? (s as any).max_balance;

                  return (
                    <TableRow key={(s as any).id}>
                      <TableCell className="font-mono text-xs">{date ? new Date(date).toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(s as any).balance ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(s as any).equity ?? '—'}</TableCell>
                      <TableCell className={`text-right font-mono text-xs font-semibold ${dailyPnl >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtSigned(dailyPnl)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs font-semibold ${floatingPnl >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtSigned(floatingPnl)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(s as any).drawdown ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{maxBal ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{usedDaily !== undefined && usedDaily !== null ? `${Number(usedDaily).toFixed(2)}%` : '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{usedTotal !== undefined && usedTotal !== null ? `${Number(usedTotal).toFixed(2)}%` : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {snapshots.length > 0 && (
            <div className="p-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">Exibindo últimos 30 dias (total: {snapshots.length}).</p>
            </div>
          )}
        </div>
      </section>

      {/* === KPIs OPERACIONAIS === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">KPIs operacionais</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
          {kpiCards.map((k) => (
            <Card key={k.label} className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-xl font-mono font-bold ${k.valueClass ?? 'text-foreground'}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* === GRÁFICOS E VISUALIZAÇÃO === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Gráficos</h2>
        </div>

        {hasChartData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Equity curve</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer
                  className="h-[240px] w-full"
                  config={{
                    equity: { label: 'Equity', color: 'hsl(var(--primary))' },
                  }}
                >
                  <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis width={48} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="equity" stroke="var(--color-equity)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Balance curve</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer
                  className="h-[240px] w-full"
                  config={{
                    balance: { label: 'Balance', color: 'hsl(var(--foreground))' },
                  }}
                >
                  <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis width={48} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="balance" stroke="var(--color-balance)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Evolução de drawdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer
                  className="h-[240px] w-full"
                  config={{
                    drawdown: { label: 'Drawdown', color: 'hsl(var(--warning))' },
                  }}
                >
                  <AreaChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis width={48} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="drawdown" stroke="var(--color-drawdown)" fill="var(--color-drawdown)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Daily PnL</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer
                  className="h-[240px] w-full"
                  config={{
                    dailyPnl: { label: 'Daily PnL', color: 'hsl(var(--success))' },
                  }}
                >
                  <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis width={48} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="dailyPnl" stroke="var(--color-dailyPnl)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">Sem dados suficientes para gráficos. Quando snapshots forem sincronizados via backend externo, os gráficos aparecerão aqui.</p>
          </div>
        )}
      </section>

      {/* === RISCO DA CONTA (mantido) === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-destructive" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Risco da Conta</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Loss */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perda Diária</h3>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-mono font-bold text-foreground">{fmt(dailyLoss?.currentValue ?? 0)}</span>
              <span className="text-sm font-mono text-muted-foreground">/ {fmt(dailyLoss?.limitValue ?? 0)}</span>
            </div>
            <ProgressBar value={dailyLoss?.currentValue ?? 0} max={dailyLoss?.limitValue ?? 1} color={barColorFor(dailyLoss)} />
            <p className="text-xs font-mono text-muted-foreground">
              Restante: <span className="text-foreground font-semibold">{fmt(dailyRemaining)}</span>
            </p>
          </div>

          {/* Max Loss */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perda Máxima</h3>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-mono font-bold text-foreground">{fmt(totalLoss?.currentValue ?? 0)}</span>
              <span className="text-sm font-mono text-muted-foreground">/ {fmt(totalLoss?.limitValue ?? 0)}</span>
            </div>
            <ProgressBar value={totalLoss?.currentValue ?? 0} max={totalLoss?.limitValue ?? 1} color={barColorFor(totalLoss)} />
            <p className="text-xs font-mono text-muted-foreground">
              Restante: <span className="text-foreground font-semibold">{fmt(maxLossRemaining)}</span>
            </p>
          </div>

          {/* Floating Loss */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perda Flutuante</h3>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-mono font-bold ${floatingLoss < 0 ? 'text-destructive' : 'text-success'}`}>
                {floatingLoss < 0 ? `-${fmt(Math.abs(floatingLoss))}` : fmt(floatingLoss)}
              </span>
              {floatingLimit > 0 && <span className="text-sm font-mono text-muted-foreground">/ {fmt(floatingLimit)}</span>}
            </div>
            <ProgressBar value={Math.abs(floatingLoss)} max={floatingLimit || 1} color={floatingLoss < -floatingLimit * 0.7 ? 'bg-warning' : 'bg-success'} />
            <p className="text-xs font-mono text-muted-foreground">
              {floatingLoss < 0 ? 'P&L aberto negativo' : 'P&L aberto positivo'}
            </p>
          </div>
        </div>
      </section>

      {/* === PROGRESSO DA CONTA (mantido) === */}
      {(profitTarget || minDays || consistency) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Progresso da Conta</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profitTarget && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta de Lucro</h3>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-mono font-bold text-foreground">{fmt(Math.max(0, profitTarget.currentValue))}</span>
                  <span className="text-sm font-mono text-muted-foreground">/ {fmt(profitTarget.limitValue)}</span>
                </div>
                <ProgressBar value={Math.max(0, profitTarget.currentValue)} max={profitTarget.limitValue} color="bg-primary" />
                <p className="text-xs font-mono text-muted-foreground">{Math.max(0, profitTarget.progressPct)}% concluído</p>
              </div>
            )}

            {minDays && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dias de Trading</h3>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-mono font-bold text-foreground">{minDays.currentValue}</span>
                  <span className="text-sm font-mono text-muted-foreground">/ {minDays.limitValue}</span>
                </div>
                <ProgressBar value={minDays.currentValue} max={minDays.limitValue} color="bg-primary" />
                <p className="text-xs font-mono text-muted-foreground">{minDays.progressPct}% concluído</p>
              </div>
            )}

            {consistency && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consistência</h3>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-mono font-bold text-foreground">{consistency.currentValue}%</span>
                  <span className="text-sm font-mono text-muted-foreground">/ {consistency.limitValue}%</span>
                </div>
                <ProgressBar value={consistency.currentValue} max={consistency.limitValue} color={consistency.status === 'APPROVING' ? 'bg-success' : 'bg-warning'} />
                <p className="text-xs font-mono text-muted-foreground">{consistency.message}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* === O QUE FAZER AGORA === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">O que fazer agora</h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3"
            >
              <Activity className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground">{rec}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* === ALERTAS === */}
      {alerts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-warning" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Alertas</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  alert.severity === 'danger' ? 'border-destructive/30 bg-destructive/5' :
                  alert.severity === 'warning' ? 'border-warning/30 bg-warning/5' :
                  'border-border bg-muted/30'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                  alert.severity === 'danger' ? 'text-destructive' :
                  alert.severity === 'warning' ? 'text-warning' :
                  'text-muted-foreground'
                }`} />
                <p className="text-xs text-foreground">{alert.text}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}
      </>) }

      {/* === AI RULES TAB === */}
      {activeTab === 'ai-rules' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Reconhecimento Automático de Regras</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Envie o PDF ou link dos termos e condições da prop firm para extrair e aplicar regras automaticamente nesta conta.
            </p>
          </div>

          <RuleExtractor
            onRulesExtracted={(extractedRules, firmName, _accountTypes, summary) => {
              setAppliedAiRules(extractedRules);
              toast.success(`${extractedRules.length} regras de "${firmName}" aplicadas à conta ${headerNickname}`);
            }}
          />

          {appliedAiRules.length > 0 && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <p className="text-xs text-success font-semibold">
                {appliedAiRules.length} regras aplicadas a esta conta
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="pt-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground font-mono">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </p>
      </footer>
    </div>
  );
};

export default AccountDashboard;
