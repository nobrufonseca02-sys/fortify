create table if not exists public.mt5Trades (
  id uuid primary key default gen_random_uuid(),
  tradingAccountId text not null,
  ticket bigint not null,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  volume numeric not null,
  openTime timestamptz not null,
  closeTime timestamptz,
  openPrice numeric,
  closePrice numeric,
  stopLoss numeric,
  takeProfit numeric,
  profit numeric,
  swap numeric,
  commission numeric,
  createdAt timestamptz not null default now()
);

create index if not exists mt5TradesTradingAccountIdIdx on public.mt5Trades (tradingAccountId);
create index if not exists mt5TradesCloseTimeIdx on public.mt5Trades (tradingAccountId, closeTime desc);

create table if not exists public.mt5OpenPositions (
  id uuid primary key default gen_random_uuid(),
  tradingAccountId text not null,
  ticket bigint not null,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  volume numeric not null,
  openPrice numeric,
  currentPrice numeric,
  floatingPnl numeric,
  stopLoss numeric,
  takeProfit numeric,
  updatedAt timestamptz not null default now()
);

create index if not exists mt5OpenPositionsTradingAccountIdIdx on public.mt5OpenPositions (tradingAccountId);
create index if not exists mt5OpenPositionsUpdatedAtIdx on public.mt5OpenPositions (tradingAccountId, updatedAt desc);

create table if not exists public.mt5AccountSnapshots (
  id uuid primary key default gen_random_uuid(),
  tradingAccountId text not null,
  date date not null,
  balance numeric,
  equity numeric,
  dailyPnl numeric,
  floatingPnl numeric,
  drawdown numeric,
  maxBalance numeric,
  usedDailyLossPct numeric,
  usedTotalLossPct numeric,
  createdAt timestamptz not null default now(),
  unique (tradingAccountId, date)
);

create index if not exists mt5AccountSnapshotsTradingAccountIdIdx on public.mt5AccountSnapshots (tradingAccountId);
create index if not exists mt5AccountSnapshotsDateIdx on public.mt5AccountSnapshots (tradingAccountId, date asc);
