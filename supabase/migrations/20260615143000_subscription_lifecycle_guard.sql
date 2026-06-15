-- Fortify subscription lifecycle guard.
-- Additive only: preserves subscription, MT5 connection and trading account data.

alter table public.user_subscriptions
  add column if not exists activated_at timestamptz,
  add column if not exists paid_until timestamptz,
  add column if not exists stripe_subscription_status text,
  add column if not exists last_payment_status text,
  add column if not exists last_payment_at timestamptz,
  add column if not exists last_payment_failed_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text,
  add column if not exists metaapi_suspended_at timestamptz,
  add column if not exists metaapi_suspension_reason text;

update public.user_subscriptions
set
  paid_until = coalesce(paid_until, current_period_end),
  stripe_subscription_status = coalesce(stripe_subscription_status, status),
  activated_at = case
    when activated_at is null and status in ('active', 'trialing') then created_at
    else activated_at
  end
where paid_until is null
   or stripe_subscription_status is null
   or (activated_at is null and status in ('active', 'trialing'));

create index if not exists user_subscriptions_paid_until_idx
  on public.user_subscriptions(paid_until);

create index if not exists user_subscriptions_lifecycle_status_idx
  on public.user_subscriptions(status, paid_until);

alter table public.mt5_connections
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text,
  add column if not exists metaapi_suspended_at timestamptz,
  add column if not exists metaapi_suspension_reason text;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.mt5_connections'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%sync_status%'
  loop
    execute format('alter table public.mt5_connections drop constraint if exists %I', constraint_record.conname);
  end loop;
end $$;

alter table public.mt5_connections
  add constraint mt5_connections_sync_status_lifecycle_check
  check (
    sync_status in (
      'queued',
      'running',
      'idle',
      'success',
      'completed',
      'error',
      'failed',
      'removed',
      'suspension_pending'
    )
  );

create index if not exists mt5_connections_user_suspended_idx
  on public.mt5_connections(user_id, suspended_at);
