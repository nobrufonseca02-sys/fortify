-- Fortify Stripe billing alignment.
-- Additive only: preserves existing beta subscriptions and account limits.

alter table public.plans
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists stripe_price_id text,
  add column if not exists price_amount integer,
  add column if not exists active boolean not null default true;

update public.plans
set
  name = coalesce(name, plan_name),
  slug = coalesce(slug, id),
  price_amount = coalesce(price_amount, price_cents),
  active = coalesce(active, status = 'active');

alter table public.plans
  alter column name set not null,
  alter column slug set not null;

create unique index if not exists plans_slug_unique_idx
  on public.plans(slug);

create unique index if not exists plans_stripe_price_id_unique_idx
  on public.plans(stripe_price_id)
  where stripe_price_id is not null;

alter table public.user_subscriptions
  add column if not exists current_period_start timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

insert into public.plans (
  id,
  plan_name,
  name,
  slug,
  status,
  active,
  account_limit,
  billing_interval,
  price_cents,
  price_amount
)
values
  ('beta_free', 'Beta Free', 'Beta Free', 'beta_free', 'active', true, 1, null, 0, 0),
  ('monthly', 'Monthly', 'Monthly', 'monthly', 'active', true, 3, 'month', null, null),
  ('annual', 'Annual', 'Annual', 'annual', 'active', true, 10, 'year', null, null),
  ('vip', 'VIP', 'VIP', 'vip', 'active', true, 25, 'month', null, null)
on conflict (id) do update set
  plan_name = excluded.plan_name,
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status,
  active = excluded.active,
  account_limit = excluded.account_limit,
  billing_interval = excluded.billing_interval,
  price_cents = excluded.price_cents,
  price_amount = excluded.price_amount,
  updated_at = now();

drop policy if exists plans_select_active on public.plans;
create policy plans_select_active on public.plans
for select using (status = 'active' and active = true);

create index if not exists user_subscriptions_stripe_customer_idx
  on public.user_subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists user_subscriptions_stripe_subscription_idx
  on public.user_subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;
