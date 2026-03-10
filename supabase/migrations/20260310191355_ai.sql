-- Base estrutural para suporte a contas MT5 multiusuário/multiconta e ingestão de dados reais
-- Requer extensões padrão do Supabase

create extension if not exists "pgcrypto";

-- ===============
-- Trading Accounts
-- ===============
create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  nickname text not null,
  broker text,
  mt5_server text,
  mt5_login text,

  account_type text,
  prop_firm text,

  start_balance numeric not null default 0,
  current_balance numeric not null default 0,
  current_equity numeric not null default 0,
  highest_equity numeric not null default 0,

  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trading_accounts_user_id_idx on public.trading_accounts(user_id);

alter table public.trading_accounts enable row level security;

-- RLS
create policy "trading_accounts_select_own" on public.trading_accounts
for select
using (auth.uid() = user_id);

create policy "trading_accounts_insert_own" on public.trading_accounts
for insert
with check (auth.uid() = user_id);

create policy "trading_accounts_update_own" on public.trading_accounts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "trading_accounts_delete_own" on public.trading_accounts
for delete
using (auth.uid() = user_id);

-- =================
-- MT5 Connections
-- =================
create table if not exists public.mt5_connections (
  id uuid primary key default gen_random_uuid(),
  trading_account_id uuid not null unique references public.trading_accounts(id) on delete cascade,

  mt5_login text not null,
  mt5_server text not null,
  broker_name text,
  provider text not null default 'external',

  connection_status text not null default 'disconnected',
  last_sync_at timestamptz,
  sync_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mt5_connections_trading_account_id_idx on public.mt5_connections(trading_account_id);

alter table public.mt5_connections enable row level security;

create policy "mt5_connections_select_own" on public.mt5_connections
for select
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = mt5_connections.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "mt5_connections_insert_own" on public.mt5_connections
for insert
with check (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = mt5_connections.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "mt5_connections_update_own" on public.mt5_connections
for update
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = mt5_connections.trading_account_id
      and ta.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = mt5_connections.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "mt5_connections_delete_own" on public.mt5_connections
for delete
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = mt5_connections.trading_account_id
      and ta.user_id = auth.uid()
  )
);

-- ======
-- Trades
-- ======
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  trading_account_id uuid not null references public.trading_accounts(id) on delete cascade,

  ticket bigint not null,
  symbol text not null,
  side text not null,
  volume numeric not null,

  open_time timestamptz not null,
  close_time timestamptz,

  open_price numeric,
  close_price numeric,
  stop_loss numeric,
  take_profit numeric,

  profit numeric,
  swap numeric,
  commission numeric,

  created_at timestamptz not null default now(),

  unique (trading_account_id, ticket)
);

create index if not exists trades_trading_account_id_open_time_idx on public.trades(trading_account_id, open_time desc);

alter table public.trades enable row level security;

create policy "trades_select_own" on public.trades
for select
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = trades.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "trades_insert_own" on public.trades
for insert
with check (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = trades.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "trades_update_own" on public.trades
for update
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = trades.trading_account_id
      and ta.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = trades.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "trades_delete_own" on public.trades
for delete
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = trades.trading_account_id
      and ta.user_id = auth.uid()
  )
);

-- ==============
-- Open Positions
-- ==============
create table if not exists public.open_positions (
  id uuid primary key default gen_random_uuid(),
  trading_account_id uuid not null references public.trading_accounts(id) on delete cascade,

  ticket bigint not null,
  symbol text not null,
  side text not null,
  volume numeric not null,

  open_price numeric,
  current_price numeric,
  floating_pnl numeric,
  stop_loss numeric,
  take_profit numeric,

  updated_at timestamptz not null default now(),

  unique (trading_account_id, ticket)
);

create index if not exists open_positions_trading_account_id_updated_at_idx on public.open_positions(trading_account_id, updated_at desc);

alter table public.open_positions enable row level security;

create policy "open_positions_select_own" on public.open_positions
for select
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = open_positions.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "open_positions_insert_own" on public.open_positions
for insert
with check (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = open_positions.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "open_positions_update_own" on public.open_positions
for update
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = open_positions.trading_account_id
      and ta.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = open_positions.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "open_positions_delete_own" on public.open_positions
for delete
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = open_positions.trading_account_id
      and ta.user_id = auth.uid()
  )
);

-- ==================
-- Account Snapshots
-- ==================
create table if not exists public.account_snapshots (
  id uuid primary key default gen_random_uuid(),
  trading_account_id uuid not null references public.trading_accounts(id) on delete cascade,

  date date not null,
  balance numeric,
  equity numeric,
  daily_pnl numeric,
  floating_pnl numeric,
  drawdown numeric,
  max_balance numeric,
  used_daily_loss_pct numeric,
  used_total_loss_pct numeric,

  created_at timestamptz not null default now(),

  unique (trading_account_id, date)
);

create index if not exists account_snapshots_trading_account_id_date_idx on public.account_snapshots(trading_account_id, date desc);

alter table public.account_snapshots enable row level security;

create policy "account_snapshots_select_own" on public.account_snapshots
for select
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = account_snapshots.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "account_snapshots_insert_own" on public.account_snapshots
for insert
with check (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = account_snapshots.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "account_snapshots_update_own" on public.account_snapshots
for update
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = account_snapshots.trading_account_id
      and ta.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = account_snapshots.trading_account_id
      and ta.user_id = auth.uid()
  )
);

create policy "account_snapshots_delete_own" on public.account_snapshots
for delete
using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = account_snapshots.trading_account_id
      and ta.user_id = auth.uid()
  )
);
