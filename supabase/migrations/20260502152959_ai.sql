create extension if not exists pgcrypto;

create table if not exists public.mt5_connections (
  id uuid primary key default gen_random_uuid(),
  userId uuid not null references auth.users (id) on delete cascade,
  connectionName text not null,
  mt5Login text not null,
  serverName text not null,
  connectionStatus text not null default 'disconnected' check (connectionStatus in ('disconnected','connecting','connected','auth_error','syncing')),
  lastSyncTime timestamptz,
  latestSyncError text,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  externalAccountId text,
  investorMode boolean not null default true,
  syncCursor jsonb,
  lastHistorySyncAt timestamptz,
  lastPositionsSyncAt timestamptz
);

create index if not exists mt5ConnectionsUserIdIdx on public.mt5_connections (userId);

create or replace function public.setUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists mt5ConnectionsSetUpdatedAt on public.mt5_connections;
create trigger mt5ConnectionsSetUpdatedAt
before update on public.mt5_connections
for each row execute function public.setUpdatedAt();

alter table public.mt5_connections enable row level security;

drop policy if exists mt5ConnectionsSelectOwn on public.mt5_connections;
create policy mt5ConnectionsSelectOwn
on public.mt5_connections
for select
using (auth.uid() = "userId");

drop policy if exists mt5ConnectionsInsertOwn on public.mt5_connections;
create policy mt5ConnectionsInsertOwn
on public.mt5_connections
for insert
with check (auth.uid() = "userId");

drop policy if exists mt5ConnectionsUpdateOwn on public.mt5_connections;
create policy mt5ConnectionsUpdateOwn
on public.mt5_connections
for update
using (auth.uid() = "userId")
with check (auth.uid() = "userId");

drop policy if exists mt5ConnectionsDeleteOwn on public.mt5_connections;
create policy mt5ConnectionsDeleteOwn
on public.mt5_connections
for delete
using (auth.uid() = "userId");

create table if not exists public.mt5_sync_runs (
  id uuid primary key default gen_random_uuid(),
  connectionId uuid not null references public.mt5_connections (id) on delete cascade,
  userId uuid not null references auth.users (id) on delete cascade,
  startedAt timestamptz not null default now(),
  finishedAt timestamptz,
  status text not null default 'running' check (status in ('running','success','failed')),
  error text,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create index if not exists mt5SyncRunsConnectionIdIdx on public.mt5_sync_runs (connectionId);
create index if not exists mt5SyncRunsUserIdIdx on public.mt5_sync_runs (userId);

drop trigger if exists mt5SyncRunsSetUpdatedAt on public.mt5_sync_runs;
create trigger mt5SyncRunsSetUpdatedAt
before update on public.mt5_sync_runs
for each row execute function public.setUpdatedAt();

alter table public.mt5_sync_runs enable row level security;

drop policy if exists mt5SyncRunsSelectOwn on public.mt5_sync_runs;
create policy mt5SyncRunsSelectOwn
on public.mt5_sync_runs
for select
using (auth.uid() = "userId");

drop policy if exists mt5SyncRunsInsertOwn on public.mt5_sync_runs;
create policy mt5SyncRunsInsertOwn
on public.mt5_sync_runs
for insert
with check (auth.uid() = "userId");

drop policy if exists mt5SyncRunsUpdateOwn on public.mt5_sync_runs;
create policy mt5SyncRunsUpdateOwn
on public.mt5_sync_runs
for update
using (auth.uid() = "userId")
with check (auth.uid() = "userId");

drop policy if exists mt5SyncRunsDeleteOwn on public.mt5_sync_runs;
create policy mt5SyncRunsDeleteOwn
on public.mt5_sync_runs
for delete
using (auth.uid() = "userId");

create or replace function public.setMt5SyncRunUserId()
returns trigger
language plpgsql
as $$
declare
  vUserId uuid;
begin
  select "userId" into vUserId
  from public.mt5_connections
  where id = new."connectionId";

  if vUserId is null then
    raise exception 'Invalid connectionId';
  end if;

  new."userId" = vUserId;
  return new;
end;
$$;

drop trigger if exists mt5SyncRunsSetUserId on public.mt5_sync_runs;
create trigger mt5SyncRunsSetUserId
before insert on public.mt5_sync_runs
for each row execute function public.setMt5SyncRunUserId();
