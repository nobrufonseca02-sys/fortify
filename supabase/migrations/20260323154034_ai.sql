begin;

alter table public.mt5_connections
  add column if not exists nickname text null,
  add column if not exists external_account_id text null,
  add column if not exists investor_mode boolean not null default false,
  add column if not exists sync_cursor jsonb null,
  add column if not exists last_history_sync_at timestamptz null,
  add column if not exists last_positions_sync_at timestamptz null;

commit;
