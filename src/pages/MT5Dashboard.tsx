import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Server,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Loader2,
  AlertTriangle,
  DollarSign,
  Target,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useMT5ConnectionDetail, useMT5Snapshots, useMT5Trades, useMT5Positions } from '@/hooks/useMT5';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (v: number) => `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

function asErrorMessage(err: unknown) {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && 'message' in (err as any) && typeof (err as any).message === 'string') return (err as any).message;
  return 'Erro ao carregar dados.';
}

function numeric(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function snapshotTime(snapshot: any) {
  return snapshot?.snapshot_time || snapshot?.created_at || snapshot?.updated_at || snapshot?.date || new Date().toISOString();
}

function tradeTime(trade: any) {
  return trade?.created_at || trade?.open_time || trade?.close_time || new Date().toISOString();
}

const MT5Dashboard = () => {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();

  const connQuery = useMT5ConnectionDetail(connectionId);
  const snapQuery = useMT5Snapshots(connectionId);
  const tradesQuery = useMT5Trades(connectionId);
  const posQuery = useMT5Positions(connectionId);

  const { data: connection, isLoading: loadingConn } = connQuery;
  const { data: snapshots, isLoading: loadingSnap } = snapQuery;
  const { data: trades, isLoading: loadingTrades } = tradesQuery;
  const { data: positions, isLoading: loadingPos } = posQuery;

  const isLoading = loadingConn || loadingSnap || loadingTrades || loadingPos;

  const errorMessage =
    asErrorMessage((connQuery as any)?.error) ||
    asErrorMessage((snapQuery as any)?.error) ||
    asErrorMessage((tradesQuery as any)?.error) ||
    asErrorMessage((posQuery as any)?.error);

  const latestSnap = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const balance = numeric((latestSnap as any)?.account_balance ?? (latestSnap as any)?.balance);
  const equity = numeric((latestSnap as any)?.equity);
  const dailyPnl = numeric((latestSnap as any)?.profit ?? (latestSnap as any)?.daily_pnl);
  const floatingPnl = numeric((latestSnap as any)?.profit ?? (latestSnap as any)?.floating_pnl);
  const drawdown = numeric((latestSnap as any)?.drawdown);
  const maxBalance = numeric((latestSnap as any)?.max_balance, balance);

  const totalPnl = snapshots ? snapshots.reduce((sum, s: any) => sum + numeric(s.profit ?? s.daily_pnl), 0) : 0;
  const tradingDays = snapshots?.length ?? 0;
  const totalTrades = trades?.length ?? 0;
  const openPositionCount = positions?.length ?? 0;

  const winTrades = trades?.filter(t => t.profit > 0).length ?? 0;
  const winRate = totalTrades > 0 ? (winTrades / totalTrades * 100) : 0;

  const totalProfit = trades?.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0) ?? 0;
  const totalLoss = Math.abs(trades?.filter(t => t.profit < 0).reduce((s, t) => s + t.profit, 0) ?? 0);
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

  const equityCurve = snapshots?.map(s => ({
    date: new Date(snapshotTime(s)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    equity: numeric((s as any).equity),
    balance: numeric((s as any).account_balance ?? (s as any).balance),
  })) ?? [];

  const drawdownCurve = snapshots?.map(s => ({
    date: new Date(snapshotTime(s)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    drawdown: -numeric((s as any).drawdown),
  })) ?? [];

  const timelineItems = useMemo(() => {
    const items: Array<{ label: string; at?: string | null; tone: 'good' | 'info' | 'warn' | 'bad' }> = [];

    if (!connection) return items;

    items.push({ label: 'Conexão registrada', at: (connection as any).created_at || (connection as any).createdAt || null, tone: 'info' });

    const status = (connection as any).connection_status || (connection as any).connectionStatus;
    const lastSyncAt = (connection as any).last_sync_at || (connection as any).lastSyncTime;
    const err = (connection as any).sync_error || (connection as any).latest_sync_error || (connection as any).latestSyncError;

    if (status === 'connected') items.push({ label: 'Sessão autenticada', at: (connection as any).updated_at || (connection as any).updatedAt || null, tone: 'good' });
    if (status === 'connecting' || status === 'syncing') items.push({ label: status === 'syncing' ? 'Sincronização em andamento' : 'Conectando ao servidor', at: null, tone: 'info' });
    if (status === 'auth_error') items.push({ label: 'Falha de autenticação', at: null, tone: 'bad' });
    if (status === 'disconnected') items.push({ label: 'Desconectada', at: null, tone: 'warn' });

    if (lastSyncAt) items.push({ label: 'Última sincronização concluída', at: lastSyncAt, tone: 'good' });
    if (err) items.push({ label: 'Erro no último sync', at: lastSyncAt || null, tone: 'bad' });

    return items.slice(0, 6);
  }, [connection]);

  const statusUi = useMemo(() => {
    const status = (connection as any)?.connection_status || (connection as any)?.connectionStatus;
    const latestErr = (connection as any)?.sync_error || (connection as any)?.latest_sync_error || (connection as any)?.latestSyncError;

    if (!connection) {
      return { label: 'Indisponível', className: 'text-muted-foreground bg-muted', icon: WifiOff, pulse: false, sub: 'Sem contexto de conexão.' };
    }

    if (latestErr) {
      return { label: 'Erro', className: 'text-destructive bg-destructive/10', icon: ShieldX, pulse: false, sub: String(latestErr) };
    }

    if (status === 'connected') {
      return { label: 'Conectada', className: 'text-success bg-success/10', icon: ShieldCheck, pulse: false, sub: 'Sessão ativa no backend.' };
    }

    if (status === 'syncing') {
      return { label: 'Sync', className: 'text-info bg-info/10', icon: RefreshCw, pulse: true, sub: 'Sincronizando ordens, posições e métricas.' };
    }

    if (status === 'connecting') {
      return { label: 'Conectando', className: 'text-info bg-info/10', icon: Wifi, pulse: true, sub: 'Estabelecendo sessão com o servidor.' };
    }

    if (status === 'auth_error') {
      return { label: 'Auth', className: 'text-destructive bg-destructive/10', icon: ShieldX, pulse: false, sub: 'Credenciais inválidas ou servidor incorreto.' };
    }

    if (status === 'disconnected') {
      return { label: 'Offline', className: 'text-muted-foreground bg-muted', icon: WifiOff, pulse: false, sub: 'Conexão desativada.' };
    }

    return { label: 'Status', className: 'text-muted-foreground bg-muted', icon: WifiOff, pulse: false, sub: 'Estado desconhecido.' };
  }, [connection]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/mt5')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{connection?.account_name || 'MT5 Dashboard'}</h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {connection
                ? `${connection.mt5_login} — ${connection.mt5_server} — ${connection.broker_name}${connection.prop_firm ? ` — ${connection.prop_firm}` : ''}`
                : 'Carregando conexão…'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${statusUi.className}`}>
            <statusUi.icon className={`w-3 h-3 ${statusUi.pulse ? 'animate-spin' : ''}`} />
            {statusUi.label}
          </span>

          {(connection as any)?.last_sync_at && (
            <span className="hidden md:flex text-[10px] text-muted-foreground items-center gap-1">
              <Clock className="w-3 h-3" />
              Última sincronização: {new Date((connection as any).last_sync_at).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {isLoading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-premium rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-7 w-32" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card-premium rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-[220px] w-full" />
            </div>
            <div className="card-premium rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-3 w-44 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-2.5 w-2.5 rounded-full mt-1" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center min-h-[30vh]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </>
      )}

      {!isLoading && errorMessage && (
        <div className="card-premium rounded-xl border border-destructive/30 bg-card p-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground font-semibold">Falha ao carregar a integração</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {errorMessage}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  Recarregar
                </button>
                <button
                  onClick={() => navigate('/mt5')}
                  className="text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  Voltar para conexões
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !errorMessage && !connection && (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Conta não encontrada.</p>
        </div>
      )}

      {!isLoading && !errorMessage && connection && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Connection cards */}
            <div className="card-premium rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conexão</p>
                  <p className="text-sm font-semibold text-foreground truncate">{connection.account_name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{connection.broker_name}{connection.prop_firm ? ` · ${connection.prop_firm}` : ''}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${statusUi.className}`}>
                  <statusUi.icon className={`w-3 h-3 ${statusUi.pulse ? 'animate-spin' : ''}`} />
                  {statusUi.label}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Login</p>
                  <p className="text-xs font-mono text-foreground mt-1 truncate">{connection.mt5_login}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Servidor</p>
                  <p className="text-xs font-mono text-foreground mt-1 truncate">{connection.mt5_server}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">{statusUi.sub}</p>
            </div>

            <div className="card-premium rounded-xl border border-border bg-card p-5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Integridade do Sync</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniBadge tone={latestSnap ? 'good' : 'warn'} label={latestSnap ? 'Snapshot' : 'Sem snapshot'} />
                <MiniBadge tone={openPositionCount > 0 ? 'info' : 'warn'} label={openPositionCount > 0 ? 'Posições' : 'Sem posições'} />
                <MiniBadge tone={totalTrades > 0 ? 'info' : 'warn'} label={totalTrades > 0 ? 'Trades' : 'Sem trades'} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Último sync</p>
                  <p className="text-xs font-mono text-foreground mt-1 truncate">
                    {(connection as any).last_sync_at
                      ? new Date((connection as any).last_sync_at).toLocaleString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte</p>
                  <p className="text-xs font-mono text-foreground mt-1 truncate">MetaTrader 5</p>
                </div>
              </div>
              {(connection as any).latest_sync_error && (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-destructive">Último erro</p>
                  <p className="text-xs text-muted-foreground mt-1 break-words">{String((connection as any).latest_sync_error)}</p>
                </div>
              )}
            </div>

            {/* Sync activity timeline */}
            <div className="card-premium rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Atividade</p>
                <span className="text-[10px] font-mono text-muted-foreground">SYNC LOG</span>
              </div>

              {timelineItems.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {timelineItems.map((it, idx) => (
                    <div key={`${it.label}-${idx}`} className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full ${it.tone === 'good' ? 'bg-success' : it.tone === 'bad' ? 'bg-destructive' : it.tone === 'warn' ? 'bg-warning' : 'bg-primary'}`} />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{it.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {it.at ? new Date(it.at).toLocaleString('pt-BR') : 'agora'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-border p-5 text-center">
                  <Activity className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Sem eventos recentes.</p>
                </div>
              )}
            </div>
          </div>

          {!latestSnap && (
            <div className="card-premium rounded-xl border border-border bg-card p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium">Aguardando sincronização</p>
              <p className="text-xs text-muted-foreground mt-1">
                Os dados serão exibidos automaticamente após a primeira sincronização com o backend.
              </p>
            </div>
          )}

          {latestSnap && (
            <>
              {/* Latest account metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                <KPICard icon={DollarSign} label="Saldo Atual" value={fmt(balance)} />
                <KPICard icon={Activity} label="Equity Atual" value={fmt(equity)} />
                <KPICard icon={TrendingUp} label="Lucro Diário" value={fmt(dailyPnl)} valueClass={dailyPnl >= 0 ? 'text-success' : 'text-destructive'} />
                <KPICard icon={TrendingDown} label="P&L Acumulado" value={fmt(totalPnl)} valueClass={totalPnl >= 0 ? 'text-success' : 'text-destructive'} />
                <KPICard icon={Activity} label="Floating P&L" value={fmt(floatingPnl)} valueClass={floatingPnl >= 0 ? 'text-success' : 'text-destructive'} />
                <KPICard icon={Target} label="Drawdown" value={fmtPct(-drawdown)} valueClass="text-warning" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatPill label="Max Balance" value={fmt(maxBalance)} />
                <StatPill label="Dias de Trading" value={String(tradingDays)} />
                <StatPill label="Total de Trades" value={String(totalTrades)} />
                <StatPill label="Win Rate" value={`${winRate.toFixed(1)}%`} />
                <StatPill label="Profit Factor" value={profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)} />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card-premium rounded-xl border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Curva de Equity</h3>
                  {equityCurve.length > 1 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={equityCurve}>
                        <defs>
                          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(200, 100%, 50%)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(200, 100%, 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(220,15%,45%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(220,15%,45%)' }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip contentStyle={{ background: 'hsl(225,25%,7%)', border: '1px solid hsl(225,15%,13%)', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="equity" stroke="hsl(200,100%,50%)" fill="url(#eqGrad)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="balance" stroke="hsl(220,15%,45%)" strokeWidth={1} dot={false} strokeDasharray="4 4" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                      <BarEmpty title="Sem curva suficiente" description="Aguarde mais snapshots para gerar o gráfico." />
                    </div>
                  )}
                </div>

                <div className="card-premium rounded-xl border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Histórico de Drawdown</h3>
                  {drawdownCurve.length > 1 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={drawdownCurve}>
                        <defs>
                          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(0,72%,51%)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(0,72%,51%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(220,15%,45%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(220,15%,45%)' }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip contentStyle={{ background: 'hsl(225,25%,7%)', border: '1px solid hsl(225,15%,13%)', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="drawdown" stroke="hsl(0,72%,51%)" fill="url(#ddGrad)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                      <BarEmpty title="Sem drawdown suficiente" description="O histórico aparece após múltiplos dias de trading." />
                    </div>
                  )}
                </div>
              </div>

              {/* Open Positions */}
              <div className="card-premium rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                  Posições Abertas ({openPositionCount})
                </h3>
                {positions && positions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground uppercase tracking-wider">
                          <th className="text-left py-2 px-2">Ticket</th>
                          <th className="text-left py-2 px-2">Símbolo</th>
                          <th className="text-right py-2 px-2">Volume</th>
                          <th className="text-right py-2 px-2">Preço Abertura</th>
                          <th className="text-right py-2 px-2">Preço Atual</th>
                          <th className="text-right py-2 px-2">SL</th>
                          <th className="text-right py-2 px-2">TP</th>
                          <th className="text-right py-2 px-2">Floating P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map(pos => (
                          <tr key={pos.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-2 font-mono">{pos.ticket}</td>
                            <td className="py-2 px-2 font-semibold text-foreground">{pos.symbol}</td>
                            <td className="py-2 px-2 text-right font-mono">{numeric(pos.volume).toFixed(2)}</td>
                            <td className="py-2 px-2 text-right font-mono">{numeric((pos as any).price ?? (pos as any).open_price).toFixed(5)}</td>
                            <td className="py-2 px-2 text-right font-mono">{numeric((pos as any).current_price ?? (pos as any).price).toFixed(5)}</td>
                            <td className="py-2 px-2 text-right font-mono text-muted-foreground">{(pos as any).stop_loss ? numeric((pos as any).stop_loss).toFixed(5) : '—'}</td>
                            <td className="py-2 px-2 text-right font-mono text-muted-foreground">{(pos as any).take_profit ? numeric((pos as any).take_profit).toFixed(5) : '—'}</td>
                            <td className={`py-2 px-2 text-right font-mono font-semibold ${numeric((pos as any).profit ?? (pos as any).floating_pnl) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {fmt(numeric((pos as any).profit ?? (pos as any).floating_pnl))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-xs text-muted-foreground">Nenhuma posição aberta no momento.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Quando houver exposição, ela aparecerá aqui com P&L flutuante.</p>
                  </div>
                )}
              </div>

              {/* Recent Trades */}
              <div className="card-premium rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                  Histórico de Trades ({totalTrades})
                </h3>
                {trades && trades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground uppercase tracking-wider">
                          <th className="text-left py-2 px-2">Ticket</th>
                          <th className="text-left py-2 px-2">Símbolo</th>
                          <th className="text-left py-2 px-2">Lado</th>
                          <th className="text-right py-2 px-2">Volume</th>
                          <th className="text-right py-2 px-2">Abertura</th>
                          <th className="text-right py-2 px-2">Fechamento</th>
                          <th className="text-right py-2 px-2">Lucro</th>
                          <th className="text-right py-2 px-2">Swap</th>
                          <th className="text-right py-2 px-2">Comissão</th>
                          <th className="text-left py-2 px-2">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.slice(0, 50).map(trade => (
                          <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-2 font-mono">{trade.ticket}</td>
                            <td className="py-2 px-2 font-semibold text-foreground">{trade.symbol}</td>
                            <td className="py-2 px-2">
                              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${trade.side === 'buy' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                                {trade.side}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono">{numeric(trade.volume).toFixed(2)}</td>
                            <td className="py-2 px-2 text-right font-mono">{numeric((trade as any).price ?? (trade as any).open_price).toFixed(5)}</td>
                            <td className="py-2 px-2 text-right font-mono">{(trade as any).close_price ? numeric((trade as any).close_price).toFixed(5) : '—'}</td>
                            <td className={`py-2 px-2 text-right font-mono font-semibold ${numeric(trade.profit) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {fmt(numeric(trade.profit))}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-muted-foreground">{fmt(numeric(trade.swap))}</td>
                            <td className="py-2 px-2 text-right font-mono text-muted-foreground">{fmt(numeric(trade.commission))}</td>
                            <td className="py-2 px-2 text-muted-foreground">
                              {new Date(tradeTime(trade)).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {trades.length > 50 && (
                      <p className="text-[10px] text-muted-foreground text-center py-2">Exibindo os 50 trades mais recentes de {trades.length} total.</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-xs text-muted-foreground">Nenhum trade registrado.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Assim que o histórico for sincronizado, ele aparecerá aqui.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

function KPICard({ icon: Icon, label, value, valueClass = 'text-foreground' }: {
  icon: typeof DollarSign; label: string; value: string; valueClass?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className={`font-mono font-bold text-lg ${valueClass}`}>{value}</p>
    </motion.div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold text-sm text-foreground">{value}</span>
    </div>
  );
}

function MiniBadge({ tone, label }: { tone: 'good' | 'info' | 'warn' | 'bad'; label: string }) {
  const cls =
    tone === 'good'
      ? 'text-success bg-success/10'
      : tone === 'bad'
        ? 'text-destructive bg-destructive/10'
        : tone === 'warn'
          ? 'text-warning bg-warning/10'
          : 'text-info bg-info/10';
  return (
    <span className={`inline-flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function BarEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-xs text-foreground font-semibold">{title}</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{description}</p>
    </div>
  );
}

export default MT5Dashboard;
