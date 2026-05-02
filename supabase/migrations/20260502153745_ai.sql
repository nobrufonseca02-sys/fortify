begin;

-- MT5 integration: connections and sync run logs

create table if not exists public.mt5Connections (
  id uuid primary key default gen_random_uuid(),
  userId uuid not null references auth.users(id) on delete cascade,
  tradingAccountId uuid null,
  brokerName text null,
  mt5Login text not null,
  serverName text not null,
  secretRef text not null,
  status text not null default 'active',
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create index if not exists mt5ConnectionsUserIdIdx on public.mt5Connections(userId);

create table if not exists public.mt5SyncRuns (
  id uuid primary key default gen_random_uuid(),
  userId uuid not null references auth.users(id) on delete cascade,
  connectionId uuid not null references public.mt5Connections(id) on delete cascade,
  status text not null default 'requested',
  source text not null,
  requestId text null,
  startedAt timestamptz not null default now(),
  finishedAt timestamptz null,
  errorMessage text null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists mt5SyncRunsUserIdIdx on public.mt5SyncRuns(userId);
create index if not exists mt5SyncRunsConnectionIdIdx on public.mt5SyncRuns(connectionId);
create index if not exists mt5SyncRunsStartedAtIdx on public.mt5SyncRuns(startedAt);

alter table public.mt5Connections enable row level security;
alter table public.mt5SyncRuns enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mt5Connections'
      and policyname = 'mt5ConnectionsSelectOwn'
  ) then
    create policy mt5ConnectionsSelectOwn
      on public.mt5Connections
      for select
      using (auth.uid() = userId);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mt5Connections'
      and policyname = 'mt5ConnectionsInsertOwn'
  ) then
    create policy mt5ConnectionsInsertOwn
      on public.mt5Connections
      for insert
      with check (auth.uid() = userId);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mt5Connections'
      and policyname = 'mt5ConnectionsUpdateOwn'
  ) then
    create policy mt5ConnectionsUpdateOwn
      on public.mt5Connections
      for update
      using (auth.uid() = userId)
      with check (auth.uid() = userId);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mt5SyncRuns'
      and policyname = 'mt5SyncRunsSelectOwn'
  ) then
    create policy mt5SyncRunsSelectOwn
      on public.mt5SyncRuns
      for select
      using (auth.uid() = userId);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mt5SyncRuns'
      and policyname = 'mt5SyncRunsInsertOwn'
  ) then
    create policy mt5SyncRunsInsertOwn
      on public.mt5SyncRuns
      for insert
      with check (auth.uid() = userId);
  end if;
end $$;

create or replace function public.touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'mt5ConnectionsTouchUpdatedAt') then
    create trigger mt5ConnectionsTouchUpdatedAt
      before update on public.mt5Connections
      for each row
      execute function public.touchUpdatedAt();
  end if;
end $$;

commit;
