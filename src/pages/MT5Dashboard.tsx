import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Server, TrendingUp, TrendingDown, Activity, BarChart3, Clock, Loader2, AlertTriangle, DollarSign, Target } from 'lucide-react';
import { useMT5ConnectionDetail, useMT5Snapshots, useMT5Trades, useMT5Positions } from '@/hooks/useMT5';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const fmt = (v: number) => `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const MT5Dashboard = () => {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();
  const { data: connection, isLoading: loadingConn } = useMT5ConnectionDetail(connectionId);
  const { data: snapshots, isLoading: loadingSnap } = useMT5Snapshots(connectionId);
  const { data: trades, isLoading: loadingTrades } = useMT5Trades(connectionId);
  const { data: positions, isLoading: loadingPos } = useMT5Positions(connectionId);

  const isLoading = loadingConn || loadingSnap || loadingTrades || loadingPos;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Conta nao encontrada.</p>
      </div>
    );
  }

  const latestSnap = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prevSnap = snapshots && snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  const balance = latestSnap?.balance ?? 0;
  const equity = latestSnap?.equity ?? 0;
  const dailyPnl = latestSnap?.daily_pnl ?? 0;
  const floatingPnl = latestSnap?.floating_pnl ?? 0;
  const drawdown = latestSnap?.drawdown ?? 0;
  const maxBalance = latestSnap?.max_balance ?? balance;

  const totalPnl = snapshots ? snapshots.reduce((sum, s) => sum + s.daily_pnl, 0) : 0;
  const tradingDays = snapshots?.length ?? 0;
  const totalTrades = trades?.length ?? 0;
  const openPositionCount = positions?.length ?? 0;

  const winTrades = trades?.filter(t => t.profit > 0).length ?? 0;
  const winRate = totalTrades > 0 ? (winTrades / totalTrades * 100) : 0;

  const totalProfit = trades?.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0) ?? 0;
  const totalLoss = Math.abs(trades?.filter(t => t.profit < 0).reduce((s, t) => s + t.profit, 0) ?? 0);
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

  const equityCurve = snapshots?.map(s => ({
    date: new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    equity: Number(s.equity),
    balance: Number(s.balance),
  })) ?? [];

  const drawdownCurve = snapshots?.map(s => ({
    date: new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    drawdown: -Number(s.drawdown),
  })) ?? [];

  const dailyPnlCurve = snapshots?.map(s => ({
    date: new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    pnl: Number(s.daily_pnl),
  })) ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/mt5')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{connection.account_name}</h1>
            <p className="text-[10px] text-muted-foreground">
              {connection.mt5_login} — {connection.mt5_server} — {connection.broker_name}
              {connection.prop_firm && ` — ${connection.prop_firm}`}
            </p>
          </div>
        </div>
        {connection.last_sync_at && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Ultima sincronizacao: {new Date(connection.last_sync_at).toLocaleString('pt-BR')}
          </span>
        )}
      </div>

      {/* No data state */}
      {!latestSnap && (
        <div className="card-premium rounded-xl border border-border bg-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium">Aguardando sincronizacao</p>
          <p className="text-xs text-muted-foreground mt-1">
            Os dados serao exibidos automaticamente apos a primeira sincronizacao com o backend.
          </p>
        </div>
      )}

      {latestSnap && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <KPICard icon={DollarSign} label="Saldo Atual" value={fmt(balance)} />
            <KPICard icon={Activity} label="Equity Atual" value={fmt(equity)} />
            <KPICard icon={TrendingUp} label="Lucro Diario" value={fmt(dailyPnl)} valueClass={dailyPnl >= 0 ? 'text-success' : 'text-destructive'} />
            <KPICard icon={TrendingDown} label="P&L Acumulado" value={fmt(totalPnl)} valueClass={totalPnl >= 0 ? 'text-success' : 'text-destructive'} />
            <KPICard icon={Activity} label="Floating P&L" value={fmt(floatingPnl)} valueClass={floatingPnl >= 0 ? 'text-success' : 'text-destructive'} />
            <KPICard icon={Target} label="Drawdown" value={fmtPct(-drawdown)} valueClass="text-warning" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatPill label="Max Balance" value={fmt(maxBalance)} />
            <StatPill label="Dias de Trading" value={String(tradingDays)} />
            <StatPill label="Total de Trades" value={String(totalTrades)} />
            <StatPill label="Win Rate" value={`${winRate.toFixed(1)}%`} />
            <StatPill label="Profit Factor" value={profitFactor === Infinity ? '-' : profitFactor.toFixed(2)} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Equity Curve */}
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
                <p className="text-xs text-muted-foreground text-center py-10">Dados insuficientes para gerar o grafico.</p>
              )}
            </div>

            {/* Drawdown */}
            <div className="card-premium rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Historico de Drawdown</h3>
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
                <p className="text-xs text-muted-foreground text-center py-10">Dados insuficientes para gerar o grafico.</p>
              )}
            </div>
          </div>

          {/* Open Positions */}
          <div className="card-premium rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
              Posicoes Abertas ({openPositionCount})
            </h3>
            {positions && positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-2 px-2">Ticket</th>
                      <th className="text-left py-2 px-2">Simbolo</th>
                      <th className="text-right py-2 px-2">Volume</th>
                      <th className="text-right py-2 px-2">Preco Abertura</th>
                      <th className="text-right py-2 px-2">Preco Atual</th>
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
                        <td className="py-2 px-2 text-right font-mono">{Number(pos.volume).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-mono">{Number(pos.open_price).toFixed(5)}</td>
                        <td className="py-2 px-2 text-right font-mono">{Number(pos.current_price).toFixed(5)}</td>
                        <td className="py-2 px-2 text-right font-mono text-muted-foreground">{pos.stop_loss ? Number(pos.stop_loss).toFixed(5) : '-'}</td>
                        <td className="py-2 px-2 text-right font-mono text-muted-foreground">{pos.take_profit ? Number(pos.take_profit).toFixed(5) : '-'}</td>
                        <td className={`py-2 px-2 text-right font-mono font-semibold ${Number(pos.floating_pnl) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {fmt(Number(pos.floating_pnl))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma posicao aberta no momento.</p>
            )}
          </div>

          {/* Recent Trades */}
          <div className="card-premium rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
              Historico de Trades ({totalTrades})
            </h3>
            {trades && trades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-2 px-2">Ticket</th>
                      <th className="text-left py-2 px-2">Simbolo</th>
                      <th className="text-left py-2 px-2">Lado</th>
                      <th className="text-right py-2 px-2">Volume</th>
                      <th className="text-right py-2 px-2">Abertura</th>
                      <th className="text-right py-2 px-2">Fechamento</th>
                      <th className="text-right py-2 px-2">Lucro</th>
                      <th className="text-right py-2 px-2">Swap</th>
                      <th className="text-right py-2 px-2">Comissao</th>
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
                        <td className="py-2 px-2 text-right font-mono">{Number(trade.volume).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-mono">{Number(trade.open_price).toFixed(5)}</td>
                        <td className="py-2 px-2 text-right font-mono">{trade.close_price ? Number(trade.close_price).toFixed(5) : '-'}</td>
                        <td className={`py-2 px-2 text-right font-mono font-semibold ${Number(trade.profit) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {fmt(Number(trade.profit))}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-muted-foreground">{fmt(Number(trade.swap))}</td>
                        <td className="py-2 px-2 text-right font-mono text-muted-foreground">{fmt(Number(trade.commission))}</td>
                        <td className="py-2 px-2 text-muted-foreground">
                          {new Date(trade.open_time).toLocaleDateString('pt-BR')}
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
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum trade registrado.</p>
            )}
          </div>
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

export default MT5Dashboard;
