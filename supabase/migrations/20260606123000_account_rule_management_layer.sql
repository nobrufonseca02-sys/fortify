-- Account classification and rule-management layer.
-- Additive only: no destructive drops, no data reset.

create extension if not exists "pgcrypto";

alter table if exists public.trading_accounts
  add column if not exists detected_broker text,
  add column if not exists detected_server text,
  add column if not exists detected_platform text,
  add column if not exists detected_prop_firm text,
  add column if not exists detection_confidence text,
  add column if not exists detection_notes text,
  add column if not exists selected_prop_firm_id uuid references public.prop_firms(id),
  add column if not exists selected_program_id uuid references public.programs(id),
  add column if not exists account_size numeric,
  add column if not exists phase text,
  add column if not exists rule_selection_status text not null default 'unconfigured',
  add column if not exists objective text not null default 'preserve_account';

alter table if exists public.programs
  add column if not exists modality text,
  add column if not exists phase text,
  add column if not exists account_size numeric,
  add column if not exists source_url text,
  add column if not exists source_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists review_status text not null default 'needs_review';

alter table if exists public.rule_set_versions
  add column if not exists account_size numeric,
  add column if not exists phase text,
  add column if not exists modality text,
  add column if not exists source_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists review_status text not null default 'needs_review',
  add column if not exists is_user_custom boolean not null default false;

alter table if exists public.rule_instances
  add column if not exists source_url text,
  add column if not exists source_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists review_status text not null default 'needs_review',
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists trading_account_id uuid references public.trading_accounts(id) on delete cascade;

alter table if exists public.rule_evaluations
  add column if not exists remaining_value numeric(20,6),
  add column if not exists explanation text,
  add column if not exists recommended_action text,
  add column if not exists severity text,
  add column if not exists next_best_action text,
  add column if not exists data_status text not null default 'ok';

create index if not exists trading_accounts_detection_idx
  on public.trading_accounts(detected_broker, detected_server);
create index if not exists trading_accounts_rule_selection_idx
  on public.trading_accounts(rule_selection_status);
create index if not exists rule_set_versions_review_status_idx
  on public.rule_set_versions(review_status);
create index if not exists rule_instances_account_idx
  on public.rule_instances(trading_account_id);

create table if not exists public.account_rule_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid not null references public.trading_accounts(id) on delete cascade,
  rule_definition_id uuid not null references public.rule_definitions(id) on delete cascade,
  mode public.rule_mode not null default 'value',
  base_calculation text default 'initial_balance',
  includes_floating boolean not null default false,
  daily_reset boolean not null default false,
  limit_value numeric not null default 0,
  severity text not null default 'hard',
  enabled boolean not null default true,
  params jsonb default '{}',
  source_url text,
  source_notes text,
  verified_at timestamptz,
  review_status text not null default 'user_custom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_rule_overrides_account_idx
  on public.account_rule_overrides(trading_account_id);
create index if not exists account_rule_overrides_user_idx
  on public.account_rule_overrides(user_id);

alter table public.account_rule_overrides enable row level security;

drop policy if exists account_rule_overrides_select_own on public.account_rule_overrides;
create policy account_rule_overrides_select_own on public.account_rule_overrides
for select using (auth.uid() = user_id);

drop policy if exists account_rule_overrides_insert_own on public.account_rule_overrides;
create policy account_rule_overrides_insert_own on public.account_rule_overrides
for insert with check (auth.uid() = user_id);

drop policy if exists account_rule_overrides_update_own on public.account_rule_overrides;
create policy account_rule_overrides_update_own on public.account_rule_overrides
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists account_rule_overrides_delete_own on public.account_rule_overrides;
create policy account_rule_overrides_delete_own on public.account_rule_overrides
for delete using (auth.uid() = user_id);

drop trigger if exists account_rule_overrides_set_updated_at on public.account_rule_overrides;
create trigger account_rule_overrides_set_updated_at
before update on public.account_rule_overrides
for each row execute function public.set_updated_at();

insert into public.rule_definitions (key, name, description, category)
values
  ('trade_value_score_max_percent', 'Trade Value Score Limit', 'Maximum allowed concentration of profit in a trade or day.', 'consistency'),
  ('average_lot_limit', 'Average Lot Limit', 'Maximum average lot size across imported trades.', 'risk_sizing'),
  ('max_lot', 'Maximum Lot', 'Maximum single trade or open position lot size.', 'risk_sizing'),
  ('stop_loss_required', 'Stop Loss Required', 'Requires open positions to have a stop loss.', 'restriction'),
  ('end_of_day_trailing_drawdown', 'End-of-Day Trailing Drawdown', 'Trailing drawdown evaluated on end-of-day equity or balance.', 'drawdown'),
  ('intraday_equity_drawdown', 'Intraday Equity Drawdown', 'Intraday equity drawdown limit.', 'drawdown'),
  ('static_drawdown', 'Static Drawdown', 'Static drawdown limit from starting balance.', 'drawdown'),
  ('payout_min_days', 'Payout Minimum Days', 'Minimum days before payout eligibility.', 'payout'),
  ('custom_boolean', 'Custom Boolean Rule', 'User-defined yes/no account rule.', 'custom'),
  ('custom_numeric_threshold', 'Custom Numeric Threshold', 'User-defined numeric threshold rule.', 'custom'),
  ('custom_text_rule', 'Custom Text Rule', 'User-defined text rule or note.', 'custom')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category;

with seed_prop_firms(name, slug, category, status, color) as (
  values
    ('Generic MT5 Broker', 'generic-mt5-broker', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#64748b'),
    ('EasyMarkets Broker-Only', 'easymarkets-broker-only', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#2563eb'),
    ('FTMO', 'ftmo', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#0f172a'),
    ('Hantec Trader', 'hantec-trader', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#b91c1c'),
    ('Apex Trader Funding', 'apex-trader-funding', 'futures'::public.prop_firm_category, 'active'::public.prop_firm_status, '#7c3aed'),
    ('Fundscap', 'fundscap', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#0891b2'),
    ('The5ers', 'the5ers', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#16a34a'),
    ('FundedNext', 'fundednext', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#ea580c'),
    ('MyFundedFX', 'myfundedfx', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#db2777'),
    ('Topstep', 'topstep', 'futures'::public.prop_firm_category, 'active'::public.prop_firm_status, '#0284c7'),
    ('E8 Markets', 'e8-markets', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#4f46e5'),
    ('Alpha Capital Group', 'alpha-capital-group', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#111827')
)
insert into public.prop_firms (name, slug, category, status, color)
select spf.name, spf.slug, spf.category, spf.status, spf.color
from seed_prop_firms spf
where not exists (
  select 1 from public.prop_firms pf
  where pf.slug = spf.slug
);

with firm_programs(slug, name, account_type, market_type, modality, phase, account_size, notes, review_status) as (
  values
    ('generic-mt5-broker', 'Broker-only / Custom $10k', 'broker_only', 'forex', 'broker_only', 'live', 10000::numeric, 'Generic risk-management template. Not a prop firm rule set.', 'active'),
    ('easymarkets-broker-only', 'Broker-only / Custom', 'broker_only', 'forex', 'broker_only', 'live', null::numeric, 'EasyMarkets is treated as broker/server only. Select a prop firm separately if applicable.', 'needs_review'),
    ('ftmo', 'Evaluation / Verification', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify official FTMO objectives per account type before activation.', 'needs_review'),
    ('hantec-trader', 'Challenge Programs', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify Hantec Trader program rules before activation.', 'needs_review'),
    ('apex-trader-funding', 'Futures Evaluation', 'evaluation', 'futures', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify trailing drawdown and payout rules before activation.', 'needs_review'),
    ('fundscap', 'Evaluation / Funded', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify lot average and trade value score before activation.', 'needs_review'),
    ('the5ers', 'Evaluation / Funded', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify product-specific rules before activation.', 'needs_review'),
    ('fundednext', 'Evaluation / Funded', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify model-specific rules before activation.', 'needs_review'),
    ('myfundedfx', 'Evaluation / Funded', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify model-specific rules before activation.', 'needs_review'),
    ('topstep', 'Futures Evaluation', 'evaluation', 'futures', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify official futures rules before activation.', 'needs_review'),
    ('e8-markets', 'Evaluation / Funded', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify product-specific rules before activation.', 'needs_review'),
    ('alpha-capital-group', 'Evaluation / Funded', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify product-specific rules before activation.', 'needs_review')
)
insert into public.programs (prop_firm_id, name, account_type, market_type, modality, phase, account_size, notes, review_status)
select pf.id, fp.name, fp.account_type, fp.market_type, fp.modality, fp.phase, fp.account_size, fp.notes, fp.review_status
from firm_programs fp
join public.prop_firms pf on pf.slug = fp.slug
where not exists (
  select 1 from public.programs p
  where p.prop_firm_id = pf.id and p.name = fp.name
);

insert into public.rule_set_versions (
  program_id,
  name,
  start_date,
  source_url,
  status,
  account_size,
  phase,
  modality,
  source_notes,
  review_status,
  is_user_custom
)
select
  p.id,
  case
    when pf.slug = 'generic-mt5-broker' then 'Generic Broker-only $10k Risk Template'
    else p.name || ' Starter Rules'
  end,
  current_date,
  null,
  case when pf.slug = 'generic-mt5-broker' then 'active'::public.rule_set_status else 'draft'::public.rule_set_status end,
  p.account_size,
  p.phase,
  p.modality,
  case
    when pf.slug = 'generic-mt5-broker' then 'Internal broker-only risk template. It is not an official prop firm rule set and can be edited by the user.'
    else 'Needs manual verification from official prop firm materials before activation.'
  end,
  case when pf.slug = 'generic-mt5-broker' then 'user_custom' else 'needs_review' end,
  pf.slug = 'generic-mt5-broker'
from public.programs p
join public.prop_firms pf on pf.id = p.prop_firm_id
where not exists (
  select 1 from public.rule_set_versions rsv
  where rsv.program_id = p.id
    and rsv.name = case
      when pf.slug = 'generic-mt5-broker' then 'Generic Broker-only $10k Risk Template'
      else p.name || ' Starter Rules'
    end
);

with generic_rules(key, mode, limit_value, severity, includes_floating, daily_reset, base_calculation, review_status, source_notes) as (
  values
    ('max_daily_loss'::public.rule_definition_key, 'value'::public.rule_mode, 500::numeric, 'hard'::text, true, true, 'initial_balance'::text, 'user_custom'::text, 'Generic $10k daily loss guardrail. User-editable.'),
    ('max_total_loss'::public.rule_definition_key, 'value'::public.rule_mode, 1000::numeric, 'hard'::text, true, false, 'initial_balance'::text, 'user_custom'::text, 'Generic $10k total loss guardrail. User-editable.'),
    ('floating_loss_limit'::public.rule_definition_key, 'value'::public.rule_mode, 250::numeric, 'soft'::text, true, true, 'initial_balance'::text, 'user_custom'::text, 'Generic floating loss warning buffer. User-editable.'),
    ('profit_target'::public.rule_definition_key, 'value'::public.rule_mode, 1000::numeric, 'soft'::text, false, false, 'initial_balance'::text, 'user_custom'::text, 'Generic growth target. Not an official prop firm target.'),
    ('consistency_best_day_cap'::public.rule_definition_key, 'percent'::public.rule_mode, 40::numeric, 'soft'::text, false, false, null::text, 'user_custom'::text, 'Generic concentration warning. User-editable.'),
    ('average_lot_limit'::public.rule_definition_key, 'value'::public.rule_mode, 5::numeric, 'soft'::text, false, false, null::text, 'user_custom'::text, 'Generic average lot warning. Requires trade history.'),
    ('max_lot'::public.rule_definition_key, 'value'::public.rule_mode, 10::numeric, 'hard'::text, false, false, null::text, 'user_custom'::text, 'Generic max lot guardrail. Requires trades or open positions.')
)
insert into public.rule_instances (
  rule_set_version_id,
  rule_definition_id,
  mode,
  limit_value,
  severity,
  enabled,
  includes_floating,
  daily_reset,
  base_calculation,
  review_status,
  source_notes
)
select
  rsv.id,
  rd.id,
  gr.mode,
  gr.limit_value,
  gr.severity,
  true,
  gr.includes_floating,
  gr.daily_reset,
  gr.base_calculation,
  gr.review_status,
  gr.source_notes
from generic_rules gr
join public.rule_definitions rd on rd.key = gr.key
join public.rule_set_versions rsv on rsv.name = 'Generic Broker-only $10k Risk Template'
where not exists (
  select 1 from public.rule_instances ri
  where ri.rule_set_version_id = rsv.id
    and ri.rule_definition_id = rd.id
);
