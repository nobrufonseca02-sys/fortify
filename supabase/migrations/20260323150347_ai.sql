alter table if exists public.mt5_connections
  add column if not exists externalAccountId text;

alter table if exists public.mt5_connections
  add column if not exists investorMode boolean not null default true;

alter table if exists public.mt5_connections
  add column if not exists syncCursor jsonb;

alter table if exists public.mt5_connections
  add column if not exists lastHistorySyncAt timestamptz;

alter table if exists public.mt5_connections
  add column if not exists lastPositionsSyncAt timestamptz;
