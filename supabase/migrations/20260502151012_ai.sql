begin;

-- Ensure UUID generation
create extension if not exists "pgcrypto";

-- Enum for connection status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'mt5_connection_status') then
    create type public.mt5_connection_status as enum (
      'disconnected',
      'connecting',
      'connected',
      'auth_error',
      'syncing'
    );
  end if;
end $$;

-- MT5 connections (owned by user)
create table if not exists public.mt5Connections (
  id uuid primary key default gen_random_uuid(),
  userId uuid not null references auth.users(id) on delete cascade,
  connectionName text not null,
  mt5Login text not null,
  serverName text not null,
  connectionStatus public.mt5_connection_status not null default 'disconnected',
  lastSyncTime timestamptz null,
  latestSyncError text null,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create index if not exists mt5ConnectionsUserIdIdx on public.mt5Connections(userId);

-- Sync runs
create table if not exists public.mt5SyncRuns (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  startedAt timestamptz not null default now(),
  finishedAt timestamptz null,
  status text not null default 'running',
  errorMessage text null
);

create index if not exists mt5SyncRunsConnectionIdIdx on public.mt5SyncRuns(connectionId);

-- Account snapshots (daily)
create table if not exists public.mt5AccountSnapshots (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  snapshotTime timestamptz not null default now(),
  balance numeric not null default 0,
  equity numeric not null default 0,
  floatingPnl numeric not null default 0,
  dailyPnl numeric not null default 0,
  drawdown numeric not null default 0,
  maxBalance numeric not null default 0
);

create index if not exists mt5AccountSnapshotsConnectionIdIdx on public.mt5AccountSnapshots(connectionId);

-- Positions
create table if not exists public.mt5Positions (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  ticket bigint not null,
  symbol text not null,
  volume numeric not null default 0,
  openPrice numeric not null default 0,
  currentPrice numeric not null default 0,
  floatingPnl numeric not null default 0,
  stopLoss numeric null,
  takeProfit numeric null,
  updatedAt timestamptz not null default now(),
  unique(connectionId, ticket)
);

create index if not exists mt5PositionsConnectionIdIdx on public.mt5Positions(connectionId);

-- Orders
create table if not exists public.mt5Orders (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  ticket bigint not null,
  symbol text not null,
  side text not null,
  orderType text null,
  volume numeric not null default 0,
  price numeric not null default 0,
  stopLoss numeric null,
  takeProfit numeric null,
  createdTime timestamptz null,
  state text null,
  unique(connectionId, ticket)
);

create index if not exists mt5OrdersConnectionIdIdx on public.mt5Orders(connectionId);

-- Deals
create table if not exists public.mt5Deals (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  ticket bigint not null,
  orderTicket bigint null,
  positionTicket bigint null,
  symbol text not null,
  side text not null,
  volume numeric not null default 0,
  price numeric not null default 0,
  profit numeric not null default 0,
  commission numeric not null default 0,
  swap numeric not null default 0,
  dealTime timestamptz null,
  unique(connectionId, ticket)
);

create index if not exists mt5DealsConnectionIdIdx on public.mt5Deals(connectionId);

-- Helper function for updatedAt
create or replace function public.setUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

drop trigger if exists setUpdatedAtOnMt5Connections on public.mt5Connections;
create trigger setUpdatedAtOnMt5Connections
before update on public.mt5Connections
for each row execute function public.setUpdatedAt();

-- RLS
alter table public.mt5Connections enable row level security;
alter table public.mt5AccountSnapshots enable row level security;
alter table public.mt5Positions enable row level security;
alter table public.mt5Orders enable row level security;
alter table public.mt5Deals enable row level security;
alter table public.mt5SyncRuns enable row level security;

-- Policies: mt5Connections
drop policy if exists mt5ConnectionsSelect on public.mt5Connections;
create policy mt5ConnectionsSelect on public.mt5Connections
for select using (auth.uid() = userId);

drop policy if exists mt5ConnectionsInsert on public.mt5Connections;
create policy mt5ConnectionsInsert on public.mt5Connections
for insert with check (auth.uid() = userId);

drop policy if exists mt5ConnectionsUpdate on public.mt5Connections;
create policy mt5ConnectionsUpdate on public.mt5Connections
for update using (auth.uid() = userId) with check (auth.uid() = userId);

drop policy if exists mt5ConnectionsDelete on public.mt5Connections;
create policy mt5ConnectionsDelete on public.mt5Connections
for delete using (auth.uid() = userId);

-- Policies: child tables (via connection ownership)

drop policy if exists mt5AccountSnapshotsSelect on public.mt5AccountSnapshots;
create policy mt5AccountSnapshotsSelect on public.mt5AccountSnapshots
for select using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5AccountSnapshotsInsert on public.mt5AccountSnapshots;
create policy mt5AccountSnapshotsInsert on public.mt5AccountSnapshots
for insert with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5AccountSnapshotsUpdate on public.mt5AccountSnapshots;
create policy mt5AccountSnapshotsUpdate on public.mt5AccountSnapshots
for update using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
) with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5AccountSnapshotsDelete on public.mt5AccountSnapshots;
create policy mt5AccountSnapshotsDelete on public.mt5AccountSnapshots
for delete using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);


drop policy if exists mt5PositionsSelect on public.mt5Positions;
create policy mt5PositionsSelect on public.mt5Positions
for select using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5PositionsInsert on public.mt5Positions;
create policy mt5PositionsInsert on public.mt5Positions
for insert with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5PositionsUpdate on public.mt5Positions;
create policy mt5PositionsUpdate on public.mt5Positions
for update using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
) with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5PositionsDelete on public.mt5Positions;
create policy mt5PositionsDelete on public.mt5Positions
for delete using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);


drop policy if exists mt5OrdersSelect on public.mt5Orders;
create policy mt5OrdersSelect on public.mt5Orders
for select using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5OrdersInsert on public.mt5Orders;
create policy mt5OrdersInsert on public.mt5Orders
for insert with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5OrdersUpdate on public.mt5Orders;
create policy mt5OrdersUpdate on public.mt5Orders
for update using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
) with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5OrdersDelete on public.mt5Orders;
create policy mt5OrdersDelete on public.mt5Orders
for delete using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);


drop policy if exists mt5DealsSelect on public.mt5Deals;
create policy mt5DealsSelect on public.mt5Deals
for select using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5DealsInsert on public.mt5Deals;
create policy mt5DealsInsert on public.mt5Deals
for insert with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5DealsUpdate on public.mt5Deals;
create policy mt5DealsUpdate on public.mt5Deals
for update using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
) with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5DealsDelete on public.mt5Deals;
create policy mt5DealsDelete on public.mt5Deals
for delete using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);


drop policy if exists mt5SyncRunsSelect on public.mt5SyncRuns;
create policy mt5SyncRunsSelect on public.mt5SyncRuns
for select using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5SyncRunsInsert on public.mt5SyncRuns;
create policy mt5SyncRunsInsert on public.mt5SyncRuns
for insert with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5SyncRunsUpdate on public.mt5SyncRuns;
create policy mt5SyncRunsUpdate on public.mt5SyncRuns
for update using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
) with check (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

drop policy if exists mt5SyncRunsDelete on public.mt5SyncRuns;
create policy mt5SyncRunsDelete on public.mt5SyncRuns
for delete using (
  exists (
    select 1 from public.mt5Connections c
    where c.id = connectionId and c.userId = auth.uid()
  )
);

commit;
