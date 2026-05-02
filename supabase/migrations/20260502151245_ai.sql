create extension if not exists pgcrypto;

create table if not exists public.mt5SyncRuns (
  id uuid primary key default gen_random_uuid(),
  createdAt timestamptz not null default now(),
  userId uuid not null references auth.users(id) on delete cascade,
  connectionId uuid references public.mt5Connections(id) on delete cascade,
  runType text not null check (runType in ('manual', 'webhook')),
  status text not null check (status in ('queued', 'running', 'success', 'error')),
  requestId text,
  startedAt timestamptz,
  finishedAt timestamptz,
  errorMessage text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists mt5SyncRunsUserIdCreatedAtIdx on public.mt5SyncRuns (userId, createdAt desc);
create index if not exists mt5SyncRunsConnectionIdCreatedAtIdx on public.mt5SyncRuns (connectionId, createdAt desc);

alter table public.mt5Connections
  add column if not exists mt5PasswordEnc text;

alter table public.mt5Connections
  add column if not exists mt5PasswordLast4 text;

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
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'mt5ConnectionsTouchUpdatedAt'
  ) then
    create trigger mt5ConnectionsTouchUpdatedAt
    before update on public.mt5Connections
    for each row
    execute function public.touchUpdatedAt();
  end if;
end;
$$;

alter table public.mt5SyncRuns enable row level security;

create policy "mt5SyncRunsSelectOwn" on public.mt5SyncRuns
for select
to authenticated
using (auth.uid() = userId);

create policy "mt5SyncRunsInsertOwn" on public.mt5SyncRuns
for insert
to authenticated
with check (auth.uid() = userId);

create policy "mt5SyncRunsUpdateOwn" on public.mt5SyncRuns
for update
to authenticated
using (auth.uid() = userId)
with check (auth.uid() = userId);
