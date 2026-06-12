-- Fortify paid beta pricing and account add-ons.
-- Additive/non-destructive: keeps annual plans available in data while the MVP
-- UI shows monthly plans only.

alter table public.plans
  add column if not exists plan_type text not null default 'plan';

update public.plans
set plan_type = coalesce(plan_type, 'plan');

create table if not exists public.subscription_addons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  addon_slug text not null,
  stripe_price_id text not null,
  stripe_subscription_id text not null,
  stripe_subscription_item_id text,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscription_addons_stripe_subscription_unique_idx
  on public.subscription_addons(stripe_subscription_id);

create index if not exists subscription_addons_user_status_idx
  on public.subscription_addons(user_id, status);

create index if not exists subscription_addons_subscription_idx
  on public.subscription_addons(subscription_id);

drop trigger if exists subscription_addons_set_updated_at on public.subscription_addons;
create trigger subscription_addons_set_updated_at
before update on public.subscription_addons
for each row execute function public.set_updated_at();

alter table public.subscription_addons enable row level security;

drop policy if exists subscription_addons_select_own on public.subscription_addons;
create policy subscription_addons_select_own on public.subscription_addons
for select to authenticated
using (user_id = auth.uid());

drop policy if exists subscription_addons_no_self_insert on public.subscription_addons;
create policy subscription_addons_no_self_insert on public.subscription_addons
for insert to authenticated
with check (false);

drop policy if exists subscription_addons_no_self_update on public.subscription_addons;
create policy subscription_addons_no_self_update on public.subscription_addons
for update to authenticated
using (false)
with check (false);

drop policy if exists subscription_addons_no_self_delete on public.subscription_addons;
create policy subscription_addons_no_self_delete on public.subscription_addons
for delete to authenticated
using (false);

with monthly_plan_catalog (
  id,
  plan_name,
  name,
  slug,
  stripe_product_id,
  stripe_price_id,
  account_limit,
  support_tier,
  billing_interval,
  price_amount,
  currency,
  display_order,
  highlighted,
  recommended_badge,
  plan_features
) as (
  values
    (
      'beginner_monthly',
      'Fortify Beginner Mensal',
      'Beginner',
      'beginner_monthly',
      'prod_UWogmsnDUiFI4b',
      'price_1ThUQoFCCIFbGAWBflkh2p8I',
      1,
      'basic',
      'month',
      9900,
      'brl',
      10,
      false,
      null,
      '["1 conta MT5", "painel de risco", "regras customizaveis", "suporte padrao"]'::jsonb
    ),
    (
      'advanced_monthly',
      'Fortify Advanced Mensal',
      'Advanced',
      'advanced_monthly',
      'prod_Uf3wnzfJZWD4mh',
      'price_1ThUQqFCCIFbGAWBJIkWbmhO',
      3,
      'standard',
      'month',
      24900,
      'brl',
      30,
      false,
      null,
      '["ate 3 contas MT5", "multiplas contas", "biblioteca de regras", "plano de gerenciamento"]'::jsonb
    ),
    (
      'pro_monthly',
      'Fortify Pro Mensal',
      'Pro',
      'pro_monthly',
      'prod_Uf3yJK5Nmf7jzw',
      'price_1ThUQrFCCIFbGAWB9Tq88ryc',
      5,
      'priority',
      'month',
      44900,
      'brl',
      50,
      true,
      'Mais escolhido',
      '["ate 5 contas MT5", "suporte prioritario", "insights avancados", "melhor para trader ativo"]'::jsonb
    ),
    (
      'enterprise_monthly',
      'Fortify Enterprise Mensal',
      'Enterprise',
      'enterprise_monthly',
      'prod_Uf40eBMaXSHhHx',
      'price_1ThUQrFCCIFbGAWBN15DqDdU',
      10,
      'enterprise',
      'month',
      84900,
      'brl',
      70,
      false,
      'VIP',
      '["ate 10 contas MT5", "suporte VIP/Enterprise", "prioridade maxima", "ideal para operacao com varias contas"]'::jsonb
    )
)
insert into public.plans (
  id,
  plan_name,
  name,
  slug,
  stripe_product_id,
  stripe_price_id,
  status,
  active,
  account_limit,
  support_tier,
  billing_interval,
  price_cents,
  price_amount,
  currency,
  display_order,
  highlighted,
  recommended_badge,
  plan_features,
  plan_type
)
select
  id,
  plan_name,
  name,
  slug,
  stripe_product_id,
  stripe_price_id,
  'active',
  true,
  account_limit,
  support_tier,
  billing_interval,
  price_amount,
  price_amount,
  currency,
  display_order,
  highlighted,
  recommended_badge,
  plan_features,
  'plan'
from monthly_plan_catalog
on conflict (id) do update set
  plan_name = excluded.plan_name,
  name = excluded.name,
  slug = excluded.slug,
  stripe_product_id = excluded.stripe_product_id,
  stripe_price_id = excluded.stripe_price_id,
  status = excluded.status,
  active = excluded.active,
  account_limit = excluded.account_limit,
  support_tier = excluded.support_tier,
  billing_interval = excluded.billing_interval,
  price_cents = excluded.price_cents,
  price_amount = excluded.price_amount,
  currency = excluded.currency,
  display_order = excluded.display_order,
  highlighted = excluded.highlighted,
  recommended_badge = excluded.recommended_badge,
  plan_features = excluded.plan_features,
  plan_type = excluded.plan_type,
  updated_at = now();

insert into public.plans (
  id,
  plan_name,
  name,
  slug,
  stripe_product_id,
  stripe_price_id,
  status,
  active,
  account_limit,
  support_tier,
  billing_interval,
  price_cents,
  price_amount,
  currency,
  display_order,
  highlighted,
  recommended_badge,
  plan_features,
  plan_type
)
values (
  'extra_account_monthly',
  'Conta MT5 Extra Mensal',
  'Conta MT5 Extra',
  'extra_account_monthly',
  'prod_UgsBflcXjLWqI4',
  'price_1ThUQtFCCIFbGAWBi198uJxB',
  'active',
  true,
  1,
  'add_on',
  'month',
  11900,
  11900,
  'brl',
  90,
  false,
  null,
  '["1 conta MT5 extra", "adicional mensal para plano ativo"]'::jsonb,
  'add_on'
)
on conflict (id) do update set
  plan_name = excluded.plan_name,
  name = excluded.name,
  slug = excluded.slug,
  stripe_product_id = excluded.stripe_product_id,
  stripe_price_id = excluded.stripe_price_id,
  status = excluded.status,
  active = excluded.active,
  account_limit = excluded.account_limit,
  support_tier = excluded.support_tier,
  billing_interval = excluded.billing_interval,
  price_cents = excluded.price_cents,
  price_amount = excluded.price_amount,
  currency = excluded.currency,
  display_order = excluded.display_order,
  highlighted = excluded.highlighted,
  recommended_badge = excluded.recommended_badge,
  plan_features = excluded.plan_features,
  plan_type = excluded.plan_type,
  updated_at = now();

