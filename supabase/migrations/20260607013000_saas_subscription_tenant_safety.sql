-- Fortify SaaS tenant safety and account limits.
-- Additive only: no destructive changes and no reset.

create table if not exists public.plans (
  id text primary key,
  plan_name text not null unique,
  status text not null default 'active',
  account_limit integer not null check (account_limit >= 0),
  billing_interval text,
  price_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  plan_name text not null,
  status text not null default 'active',
  account_limit integer not null check (account_limit >= 0),
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists user_subscriptions_user_idx
  on public.user_subscriptions(user_id);

create index if not exists user_subscriptions_status_idx
  on public.user_subscriptions(status);

insert into public.plans (id, plan_name, status, account_limit, billing_interval, price_cents)
values
  ('beta_free', 'Beta Free', 'active', 1, null, 0),
  ('monthly', 'Monthly', 'active', 3, 'month', null),
  ('annual', 'Annual', 'active', 10, 'year', null),
  ('vip', 'VIP', 'active', 25, 'month', null)
on conflict (id) do update set
  plan_name = excluded.plan_name,
  status = excluded.status,
  account_limit = excluded.account_limit,
  billing_interval = excluded.billing_interval,
  price_cents = excluded.price_cents,
  updated_at = now();

alter table public.plans enable row level security;
alter table public.user_subscriptions enable row level security;

drop policy if exists plans_select_active on public.plans;
create policy plans_select_active on public.plans
for select using (status = 'active');

drop policy if exists user_subscriptions_select_own on public.user_subscriptions;
create policy user_subscriptions_select_own on public.user_subscriptions
for select using (auth.uid() = user_id);

-- Normal users do not self-write subscriptions. Backend service role/admin tooling owns plan changes.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists user_subscriptions_set_updated_at on public.user_subscriptions;
create trigger user_subscriptions_set_updated_at
before update on public.user_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.create_default_beta_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_subscriptions (
    user_id,
    plan_id,
    plan_name,
    status,
    account_limit,
    current_period_end
  )
  values (
    new.id,
    'beta_free',
    'Beta Free',
    'active',
    1,
    now() + interval '90 days'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
after insert on auth.users
for each row execute function public.create_default_beta_subscription();

insert into public.user_subscriptions (
  user_id,
  plan_id,
  plan_name,
  status,
  account_limit,
  current_period_end
)
select
  users.id,
  'beta_free',
  'Beta Free',
  'active',
  1,
  now() + interval '90 days'
from auth.users
where not exists (
  select 1
  from public.user_subscriptions existing
  where existing.user_id = users.id
);

-- Keep account removal soft for SaaS. Existing status values remain valid.
create index if not exists trading_accounts_user_status_idx
  on public.trading_accounts(user_id, status);

create index if not exists mt5_connections_user_login_server_idx
  on public.mt5_connections(user_id, lower(mt5_login), lower(mt5_server));
