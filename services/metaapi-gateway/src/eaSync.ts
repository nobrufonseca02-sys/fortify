// Fortify Guard como fonte de dados: transforma o que o EA envia (entrada não
// confiável) nas mesmas linhas que a sincronização da MetaApi grava em
// mt5_account_snapshots, mt5_trades e mt5_positions. Assim Painel, Contas e
// Desempenho funcionam sem saber de onde o dado veio.
//
// Só o que aconteceu a partir de `trackingStart` (quando a conta foi ligada ao
// EA) é gravado. O cálculo das regras no EA continua usando o histórico
// inteiro do terminal, porque a mesa conta tudo desde o início da conta.

import { finiteNumber } from './ruleEngine/ruleEngineTypes';
import type { EaDayInput } from './eaFeed';

export interface EaTradeInput {
  ticket: number;
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  openTime: number;
  closeTime: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  commission: number;
  swap: number;
}

export interface EaPositionInput {
  ticket: number;
  symbol: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

const MAX_ITEMS = 200;
const cleanSymbol = (value: unknown) => String(value ?? '').replace(/[^\w.#+-]/g, '').slice(0, 32);
const toTicket = (value: unknown) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
// Epoch em segundos plausível (2000 a 2100).
const toEpoch = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 946_684_800 && parsed < 4_102_444_800 ? Math.floor(parsed) : null;
};

export function sanitizeEaTrades(raw: unknown): EaTradeInput[] {
  if (!Array.isArray(raw)) return [];
  const trades: EaTradeInput[] = [];
  for (const item of raw.slice(0, MAX_ITEMS)) {
    const ticket = toTicket((item as any)?.ticket);
    const symbol = cleanSymbol((item as any)?.symbol);
    const side = (item as any)?.side === 'sell' ? 'sell' : (item as any)?.side === 'buy' ? 'buy' : null;
    const closeTime = toEpoch((item as any)?.closeTime);
    const volume = finiteNumber((item as any)?.volume);
    if (ticket === null || !symbol || !side || closeTime === null || volume === null || volume <= 0) continue;
    trades.push({
      ticket,
      symbol,
      side,
      volume,
      openTime: toEpoch((item as any)?.openTime) ?? closeTime,
      closeTime,
      openPrice: finiteNumber((item as any)?.openPrice) ?? 0,
      closePrice: finiteNumber((item as any)?.closePrice) ?? 0,
      profit: finiteNumber((item as any)?.profit) ?? 0,
      commission: finiteNumber((item as any)?.commission) ?? 0,
      swap: finiteNumber((item as any)?.swap) ?? 0,
    });
  }
  return trades;
}

export function sanitizeEaPositions(raw: unknown): EaPositionInput[] {
  if (!Array.isArray(raw)) return [];
  const positions: EaPositionInput[] = [];
  for (const item of raw.slice(0, MAX_ITEMS)) {
    const ticket = toTicket((item as any)?.ticket);
    const symbol = cleanSymbol((item as any)?.symbol);
    const volume = finiteNumber((item as any)?.volume);
    if (ticket === null || !symbol || volume === null || volume <= 0) continue;
    const stop = finiteNumber((item as any)?.stopLoss);
    const take = finiteNumber((item as any)?.takeProfit);
    positions.push({
      ticket,
      symbol,
      volume,
      openPrice: finiteNumber((item as any)?.openPrice) ?? 0,
      currentPrice: finiteNumber((item as any)?.currentPrice) ?? 0,
      profit: finiteNumber((item as any)?.profit) ?? 0,
      stopLoss: stop && stop > 0 ? stop : null,
      takeProfit: take && take > 0 ? take : null,
    });
  }
  return positions;
}

const iso = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();
const round2 = (value: number) => Math.round(value * 100) / 100;

export interface SnapshotRow {
  date: string;
  balance: number;
  equity: number;
  daily_pnl: number;
  floating_pnl: number;
  drawdown: number;
  max_balance: number;
}

/** Um snapshot por dia UTC desde o início do registro, com hoje ao vivo. */
export function snapshotRowsSince(
  days: EaDayInput[],
  live: { balance: number; equity: number; now: Date },
  trackingStart: Date,
): SnapshotRow[] {
  const startKey = trackingStart.toISOString().slice(0, 10);
  const todayKey = live.now.toISOString().slice(0, 10);
  const byDate = new Map<string, EaDayInput>();
  for (const day of days) if (day.date >= startKey && day.date <= todayKey) byDate.set(day.date, day);
  const todayPnl = byDate.get(todayKey)?.pnl ?? 0;
  byDate.set(todayKey, { date: todayKey, pnl: todayPnl, eodBalance: live.balance, traded: byDate.get(todayKey)?.traded ?? false });

  let peak = 0;
  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((day) => {
      const isToday = day.date === todayKey;
      const equity = isToday ? live.equity : day.eodBalance;
      peak = Math.max(peak, day.eodBalance, isToday ? live.equity : 0);
      return {
        date: day.date,
        balance: round2(day.eodBalance),
        equity: round2(equity),
        daily_pnl: round2(day.pnl),
        floating_pnl: isToday ? round2(live.equity - live.balance) : 0,
        drawdown: round2(Math.max(0, peak - equity)),
        max_balance: round2(peak),
      };
    });
}

/** Operações fechadas a partir do início do registro, no formato de mt5_trades. */
export function tradeRowsSince(trades: EaTradeInput[], trackingStart: Date) {
  const start = Math.floor(trackingStart.getTime() / 1000);
  return trades
    .filter((trade) => trade.closeTime >= start)
    .map((trade) => ({
      ticket: trade.ticket,
      symbol: trade.symbol,
      side: trade.side,
      volume: trade.volume,
      open_time: iso(trade.openTime),
      close_time: iso(trade.closeTime),
      open_price: trade.openPrice,
      close_price: trade.closePrice,
      profit: round2(trade.profit),
      commission: round2(trade.commission),
      swap: round2(trade.swap),
      created_at: iso(trade.closeTime),
    }));
}

/** Posições abertas agora, no formato de mt5_positions. */
export function positionRows(positions: EaPositionInput[], now: Date) {
  return positions.map((position) => ({
    ticket: position.ticket,
    symbol: position.symbol,
    volume: position.volume,
    open_price: position.openPrice,
    current_price: position.currentPrice,
    floating_pnl: round2(position.profit),
    stop_loss: position.stopLoss,
    take_profit: position.takeProfit,
    updated_at: now.toISOString(),
  }));
}
