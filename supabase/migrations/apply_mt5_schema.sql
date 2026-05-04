-- Minimal SQL to create missing MT5 tables with snake_case naming
-- This aligns the remote DB with the current app architecture

begin;

-- mt5_connections table (if not exists)
create table if not exists public.mt5_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trading_account_id text,
  account_name text not null,
  mt5_login text not null,
  mt5_server text not null,
  broker_name text not null,
  provider text not null default 'metaapi',
  provider_account_id text,
  api_mode text not null default 'cloud',
  connection_status text not null default 'disconnected' check (connection_status in ('disconnected','connecting','connected','auth_error','syncing')),
  sync_status text not null default 'queued' check (sync_status in ('queued','running','completed','error')),
  sync_error text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mt5ConnectionsUserIdIdx on public.mt5_connections (user_id);
create index if not exists mt5ConnectionsTradingAccountIdIdx on public.mt5_connections (trading_account_id);

-- mt5_account_snapshots table
create table if not exists public.mt5_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.mt5_connections (id) on delete cascade,
  account_balance numeric,
  equity numeric,
  free_margin numeric,
  profit numeric,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists mt5AccountSnapshotsConnectionIdIdx on public.mt5_account_snapshots (connection_id);

-- mt5_positions table
create table if not exists public.mt5_positions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.mt5_connections (id) on delete cascade,
  symbol text,
  volume numeric,
  price numeric,
  side text,
  type text,
  profit numeric,
  commission numeric,
  swap numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mt5PositionsConnectionIdIdx on public.mt5_positions (connection_id);

-- mt5_trades table
create table if not exists public.mt5_trades (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.mt5_connections (id) on delete cascade,
  symbol text,
  volume numeric,
  price numeric,
  side text,
  type text,
  profit numeric,
  commission numeric,
  swap numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mt5TradesConnectionIdIdx on public.mt5_trades (connection_id);

-- updatedAt trigger function
create or replace function public.setUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updatedAt
drop trigger if exists mt5ConnectionsSetUpdatedAt on public.mt5_connections;
create trigger mt5ConnectionsSetUpdatedAt
before update on public.mt5_connections
for each row execute function public.setUpdatedAt();

drop trigger if exists mt5PositionsSetUpdatedAt on public.mt5_positions;
create trigger mt5PositionsSetUpdatedAt
before update on public.mt5_positions
for each row execute function public.setUpdatedAt();

drop trigger if exists mt5TradesSetUpdatedAt on public.mt5_trades;
create trigger mt5TradesSetUpdatedAt
before update on public.mt5_trades
for each row execute function public.setUpdatedAt();

-- RLS for mt5_connections
alter table public.mt5_connections enable row level security;

drop policy if exists mt5ConnectionsSelectOwn on public.mt5_connections;
create policy mt5ConnectionsSelectOwn
on public.mt5_connections
for select
using (auth.uid() = user_id);

drop policy if exists mt5ConnectionsInsertOwn on public.mt5_connections;
create policy mt5ConnectionsInsertOwn
on public.mt5_connections
for insert
with check (auth.uid() = user_id);

drop policy if exists mt5ConnectionsUpdateOwn on public.mt5_connections;
create policy mt5ConnectionsUpdateOwn
on public.mt5_connections
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists mt5ConnectionsDeleteOwn on public.mt5_connections;
create policy mt5ConnectionsDeleteOwn
on public.mt5_connections
for delete
using (auth.uid() = user_id);

-- RLS for child tables (via connection ownership)
alter table public.mt5_account_snapshots enable row level security;
alter table public.mt5_positions enable row level security;
alter table public.mt5_trades enable row level security;

drop policy if exists mt5AccountSnapshotsSelect on public.mt5_account_snapshots;
create policy mt5AccountSnapshotsSelect on public.mt5_account_snapshots
for select using (
  exists (
    select 1 from public.mt5_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  )
);

drop policy if exists mt5AccountSnapshotsInsert on public.mt5_account_snapshots;
create policy mt5AccountSnapshotsInsert on public.mt5_account_snapshots
for insert with check (
  exists (
    select 1 from public.mt5_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  )
);

drop policy if exists mt5PositionsSelect on public.mt5_positions;
create policy mt5PositionsSelect on public.mt5_positions
for select using (
  exists (
    select 1 from public.mt5_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  )
);

drop policy if exists mt5PositionsInsert on public.mt5_positions;
create policy mt5PositionsInsert on public.mt5_positions
for insert with check (
  exists (
    select 1 from public.mt5_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  )
);

drop policy if exists mt5TradesSelect on public.mt5_trades;
create policy mt5TradesSelect on public.mt5_trades
for select using (
  exists (
    select 1 from public.mt5_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  )
);

drop policy if exists mt5TradesInsert on public.mt5_trades;
create policy mt5TradesInsert on public.mt5_trades
for insert with check (
  exists (
    select 1 from public.mt5_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  )
);

commit;
