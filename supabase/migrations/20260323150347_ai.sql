alter table if exists public.mt5_connections
  add column if not exists external_account_id text;

alter table if exists public.mt5_connections
  add column if not exists investor_mode boolean not null default true;

alter table if exists public.mt5_connections
  add column if not exists sync_cursor jsonb;

alter table if exists public.mt5_connections
  add column if not exists last_history_sync_at timestamptz;

alter table if exists public.mt5_connections
  add column if not exists last_positions_sync_at timestamptz;
