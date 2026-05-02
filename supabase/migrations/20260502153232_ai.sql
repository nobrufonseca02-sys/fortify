begin;

-- MT5 Integrations schema

create table if not exists public.mt5Connections (
  id uuid primary key default gen_random_uuid(),
  userId uuid not null references auth.users(id) on delete cascade,
  connectionName text not null,
  accountLogin text,
  serverName text,
  brokerName text,
  status text not null default 'disconnected',
  lastSyncAt timestamptz,
  lastError text,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create table if not exists public.mt5AccountSnapshots (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  userId uuid not null references auth.users(id) on delete cascade,
  snapshotTime timestamptz not null,
  balance numeric,
  equity numeric,
  margin numeric,
  freeMargin numeric,
  profit numeric,
  currency text
);

create table if not exists public.mt5Positions (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  userId uuid not null references auth.users(id) on delete cascade,
  ticket bigint not null,
  symbol text,
  type text,
  volume numeric,
  priceOpen numeric,
  priceCurrent numeric,
  sl numeric,
  tp numeric,
  profit numeric,
  swap numeric,
  openedAt timestamptz
);

create table if not exists public.mt5Orders (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  userId uuid not null references auth.users(id) on delete cascade,
  ticket bigint not null,
  positionId uuid,
  symbol text,
  type text,
  state text,
  volumeInitial numeric,
  priceOpen numeric,
  priceCurrent numeric,
  openedAt timestamptz,
  closedAt timestamptz
);

create table if not exists public.mt5Deals (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  userId uuid not null references auth.users(id) on delete cascade,
  dealTicket bigint not null,
  orderTicket bigint,
  positionId uuid,
  symbol text,
  type text,
  entry text,
  volume numeric,
  price numeric,
  profit numeric,
  commission numeric,
  swap numeric,
  fee numeric,
  executedAt timestamptz not null
);

create table if not exists public.mt5SyncRuns (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  userId uuid not null references auth.users(id) on delete cascade,
  startedAt timestamptz not null default now(),
  finishedAt timestamptz,
  status text not null default 'running',
  errorMessage text,
  rowsReceived integer
);

-- RLS
alter table public.mt5Connections enable row level security;
alter table public.mt5AccountSnapshots enable row level security;
alter table public.mt5Positions enable row level security;
alter table public.mt5Orders enable row level security;
alter table public.mt5Deals enable row level security;
alter table public.mt5SyncRuns enable row level security;

do $$
begin
  -- mt5Connections
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Connections' and policyname = 'mt5ConnectionsSelectOwn') then
    create policy mt5ConnectionsSelectOwn on public.mt5Connections
      for select using (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Connections' and policyname = 'mt5ConnectionsInsertOwn') then
    create policy mt5ConnectionsInsertOwn on public.mt5Connections
      for insert with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Connections' and policyname = 'mt5ConnectionsUpdateOwn') then
    create policy mt5ConnectionsUpdateOwn on public.mt5Connections
      for update using (auth.uid() = userId) with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Connections' and policyname = 'mt5ConnectionsDeleteOwn') then
    create policy mt5ConnectionsDeleteOwn on public.mt5Connections
      for delete using (auth.uid() = userId);
  end if;

  -- mt5AccountSnapshots
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5AccountSnapshots' and policyname = 'mt5AccountSnapshotsSelectOwn') then
    create policy mt5AccountSnapshotsSelectOwn on public.mt5AccountSnapshots
      for select using (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5AccountSnapshots' and policyname = 'mt5AccountSnapshotsInsertOwn') then
    create policy mt5AccountSnapshotsInsertOwn on public.mt5AccountSnapshots
      for insert with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5AccountSnapshots' and policyname = 'mt5AccountSnapshotsUpdateOwn') then
    create policy mt5AccountSnapshotsUpdateOwn on public.mt5AccountSnapshots
      for update using (auth.uid() = userId) with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5AccountSnapshots' and policyname = 'mt5AccountSnapshotsDeleteOwn') then
    create policy mt5AccountSnapshotsDeleteOwn on public.mt5AccountSnapshots
      for delete using (auth.uid() = userId);
  end if;

  -- mt5Positions
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Positions' and policyname = 'mt5PositionsSelectOwn') then
    create policy mt5PositionsSelectOwn on public.mt5Positions
      for select using (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Positions' and policyname = 'mt5PositionsInsertOwn') then
    create policy mt5PositionsInsertOwn on public.mt5Positions
      for insert with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Positions' and policyname = 'mt5PositionsUpdateOwn') then
    create policy mt5PositionsUpdateOwn on public.mt5Positions
      for update using (auth.uid() = userId) with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Positions' and policyname = 'mt5PositionsDeleteOwn') then
    create policy mt5PositionsDeleteOwn on public.mt5Positions
      for delete using (auth.uid() = userId);
  end if;

  -- mt5Orders
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Orders' and policyname = 'mt5OrdersSelectOwn') then
    create policy mt5OrdersSelectOwn on public.mt5Orders
      for select using (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Orders' and policyname = 'mt5OrdersInsertOwn') then
    create policy mt5OrdersInsertOwn on public.mt5Orders
      for insert with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Orders' and policyname = 'mt5OrdersUpdateOwn') then
    create policy mt5OrdersUpdateOwn on public.mt5Orders
      for update using (auth.uid() = userId) with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Orders' and policyname = 'mt5OrdersDeleteOwn') then
    create policy mt5OrdersDeleteOwn on public.mt5Orders
      for delete using (auth.uid() = userId);
  end if;

  -- mt5Deals
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Deals' and policyname = 'mt5DealsSelectOwn') then
    create policy mt5DealsSelectOwn on public.mt5Deals
      for select using (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Deals' and policyname = 'mt5DealsInsertOwn') then
    create policy mt5DealsInsertOwn on public.mt5Deals
      for insert with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Deals' and policyname = 'mt5DealsUpdateOwn') then
    create policy mt5DealsUpdateOwn on public.mt5Deals
      for update using (auth.uid() = userId) with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5Deals' and policyname = 'mt5DealsDeleteOwn') then
    create policy mt5DealsDeleteOwn on public.mt5Deals
      for delete using (auth.uid() = userId);
  end if;

  -- mt5SyncRuns
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5SyncRuns' and policyname = 'mt5SyncRunsSelectOwn') then
    create policy mt5SyncRunsSelectOwn on public.mt5SyncRuns
      for select using (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5SyncRuns' and policyname = 'mt5SyncRunsInsertOwn') then
    create policy mt5SyncRunsInsertOwn on public.mt5SyncRuns
      for insert with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5SyncRuns' and policyname = 'mt5SyncRunsUpdateOwn') then
    create policy mt5SyncRunsUpdateOwn on public.mt5SyncRuns
      for update using (auth.uid() = userId) with check (auth.uid() = userId);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mt5SyncRuns' and policyname = 'mt5SyncRunsDeleteOwn') then
    create policy mt5SyncRunsDeleteOwn on public.mt5SyncRuns
      for delete using (auth.uid() = userId);
  end if;
end $$;

-- Useful indexes
create index if not exists mt5ConnectionsUserIdIdx on public.mt5Connections (userId);

create index if not exists mt5AccountSnapshotsConnectionIdIdx on public.mt5AccountSnapshots (connectionId);
create index if not exists mt5AccountSnapshotsUserIdIdx on public.mt5AccountSnapshots (userId);
create index if not exists mt5AccountSnapshotsSnapshotTimeIdx on public.mt5AccountSnapshots (snapshotTime);

create index if not exists mt5PositionsConnectionIdIdx on public.mt5Positions (connectionId);
create index if not exists mt5PositionsUserIdIdx on public.mt5Positions (userId);
create index if not exists mt5PositionsTicketIdx on public.mt5Positions (ticket);

create index if not exists mt5OrdersConnectionIdIdx on public.mt5Orders (connectionId);
create index if not exists mt5OrdersUserIdIdx on public.mt5Orders (userId);
create index if not exists mt5OrdersTicketIdx on public.mt5Orders (ticket);

create index if not exists mt5DealsConnectionIdIdx on public.mt5Deals (connectionId);
create index if not exists mt5DealsUserIdIdx on public.mt5Deals (userId);
create index if not exists mt5DealsDealTicketIdx on public.mt5Deals (dealTicket);
create index if not exists mt5DealsOrderTicketIdx on public.mt5Deals (orderTicket);
create index if not exists mt5DealsExecutedAtIdx on public.mt5Deals (executedAt);

create index if not exists mt5SyncRunsConnectionIdIdx on public.mt5SyncRuns (connectionId);
create index if not exists mt5SyncRunsUserIdIdx on public.mt5SyncRuns (userId);
create index if not exists mt5SyncRunsStartedAtIdx on public.mt5SyncRuns (startedAt);

commit;
