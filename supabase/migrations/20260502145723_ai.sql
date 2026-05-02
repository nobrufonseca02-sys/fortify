begin;

-- MT5 connections linked to a trading account
create table if not exists public.mt5_connections (
  id uuid primary key default gen_random_uuid(),
  trading_account_id text not null,
  mt5_login text not null,
  mt5_server text not null,
  broker_name text not null,
  provider text not null default 'mt5',
  investor_mode boolean not null default false,
  connection_status text not null default 'disconnected',
  last_sync_at timestamptz null,
  sync_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mt5ConnectionsTradingAccountIdIdx
  on public.mt5_connections (trading_account_id);

-- Open positions synced from MT5
create table if not exists public.open_positions (
  id uuid primary key default gen_random_uuid(),
  trading_account_id text not null,
  ticket bigint not null,
  symbol text null,
  side text null,
  volume numeric null,
  open_time timestamptz null,
  open_price numeric null,
  current_price numeric null,
  stop_loss numeric null,
  take_profit numeric null,
  floating_pnl numeric null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (trading_account_id, ticket)
);

create index if not exists openPositionsTradingAccountIdIdx
  on public.open_positions (trading_account_id);

-- Trades (movimentações) synced from MT5
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  trading_account_id text not null,
  ticket bigint not null,
  symbol text null,
  side text null,
  volume numeric null,
  open_time timestamptz null,
  close_time timestamptz null,
  open_price numeric null,
  close_price numeric null,
  profit numeric null,
  swap numeric null,
  commission numeric null,
  created_at timestamptz not null default now(),
  unique (trading_account_id, ticket)
);

create index if not exists tradesTradingAccountIdIdx
  on public.trades (trading_account_id);

create index if not exists tradesCloseTimeIdx
  on public.trades (close_time);

-- Daily snapshots synced from MT5
create table if not exists public.account_snapshots (
  id uuid primary key default gen_random_uuid(),
  trading_account_id text not null,
  date date not null,
  balance numeric null,
  equity numeric null,
  daily_pnl numeric null,
  floating_pnl numeric null,
  drawdown numeric null,
  max_balance numeric null,
  highest_equity numeric null,
  used_daily_loss_pct numeric null,
  used_total_loss_pct numeric null,
  created_at timestamptz not null default now(),
  unique (trading_account_id, date)
);

create index if not exists accountSnapshotsTradingAccountIdIdx
  on public.account_snapshots (trading_account_id);

-- Basic updatedAt trigger for mt5_connections
create or replace function public.setUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists setUpdatedAtOnMt5Connections on public.mt5_connections;
create trigger setUpdatedAtOnMt5Connections
before update on public.mt5_connections
for each row
execute function public.setUpdatedAt();

commit;
