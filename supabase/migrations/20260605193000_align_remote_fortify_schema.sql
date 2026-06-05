-- Align the active Fortify remote schema with the current local codebase.
-- This migration is intentionally additive: it preserves existing rows and
-- avoids dropping columns/tables.

begin;

create extension if not exists "pgcrypto";

do $$
begin
  create type public.rule_definition_key as enum (
    'max_daily_loss',
    'max_total_loss',
    'trailing_drawdown',
    'floating_loss_limit',
    'profit_target',
    'min_trading_days',
    'profitable_days',
    'consistency_best_day_cap',
    'inactivity_limit',
    'news_restriction',
    'scalping_restriction',
    'weekend_holding',
    'payout_eligibility',
    'profit_split',
    'payout_frequency',
    'leverage_limit'
  );
exception when duplicate_object then null;
end $$;

alter type public.rule_definition_key add value if not exists 'max_daily_loss';
alter type public.rule_definition_key add value if not exists 'max_total_loss';
alter type public.rule_definition_key add value if not exists 'trailing_drawdown';
alter type public.rule_definition_key add value if not exists 'floating_loss_limit';
alter type public.rule_definition_key add value if not exists 'profit_target';
alter type public.rule_definition_key add value if not exists 'min_trading_days';
alter type public.rule_definition_key add value if not exists 'profitable_days';
alter type public.rule_definition_key add value if not exists 'consistency_best_day_cap';
alter type public.rule_definition_key add value if not exists 'inactivity_limit';
alter type public.rule_definition_key add value if not exists 'news_restriction';
alter type public.rule_definition_key add value if not exists 'scalping_restriction';
alter type public.rule_definition_key add value if not exists 'weekend_holding';
alter type public.rule_definition_key add value if not exists 'payout_eligibility';
alter type public.rule_definition_key add value if not exists 'profit_split';
alter type public.rule_definition_key add value if not exists 'payout_frequency';
alter type public.rule_definition_key add value if not exists 'leverage_limit';

do $$
begin
  create type public.prop_firm_status as enum ('active', 'inactive', 'pending');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.prop_firm_category as enum ('forex', 'futures', 'multi_asset');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.rule_set_status as enum ('active', 'archived', 'draft');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.rule_mode as enum ('percent', 'value');
exception when duplicate_object then null;
end $$;

create table if not exists public.prop_firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  logo_url text,
  website text,
  category public.prop_firm_category not null default 'forex',
  status public.prop_firm_status not null default 'active',
  color text,
  created_at timestamptz not null default now()
);

alter table public.prop_firms
  add column if not exists slug text,
  add column if not exists logo_url text,
  add column if not exists website text,
  add column if not exists category public.prop_firm_category not null default 'forex',
  add column if not exists status public.prop_firm_status not null default 'active',
  add column if not exists color text,
  add column if not exists created_at timestamptz not null default now();

update public.prop_firms
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null and name is not null;

insert into public.prop_firms (id, name, slug, category, status, color)
select
  '11111111-1111-4111-8111-111111111111',
  'Fortify Default',
  'fortify-default',
  'forex',
  'active',
  '187 85% 53%'
where not exists (select 1 from public.prop_firms);

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text,
  broker text,
  prop_firm text,
  account_type text,
  base_currency text not null default 'USD',
  start_balance numeric not null default 0,
  current_balance numeric not null default 0,
  current_equity numeric not null default 0,
  highest_equity numeric not null default 0,
  status text not null default 'active',
  rule_set_id text,
  mt5_login text,
  mt5_server text,
  mt5_connection_status text default 'disconnected',
  mt5_last_sync_at timestamptz,
  mt5_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  prop_firm_id uuid not null references public.prop_firms(id) on delete cascade,
  name text not null,
  account_type text not null default 'evaluation',
  market_type text not null default 'forex',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists programs_prop_firm_id_idx on public.programs(prop_firm_id);

create table if not exists public.rule_set_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  source_url text,
  status public.rule_set_status not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists rule_set_versions_program_id_idx on public.rule_set_versions(program_id);
create index if not exists rule_set_versions_status_idx on public.rule_set_versions(status);

create table if not exists public.rule_definitions (
  id uuid primary key default gen_random_uuid(),
  key public.rule_definition_key not null unique,
  name text not null,
  description text,
  category text not null default 'risk',
  created_at timestamptz not null default now()
);

create table if not exists public.rule_instances (
  id uuid primary key default gen_random_uuid(),
  rule_set_version_id uuid not null references public.rule_set_versions(id) on delete cascade,
  rule_definition_id uuid not null references public.rule_definitions(id) on delete cascade,
  mode public.rule_mode not null default 'percent',
  base_calculation text default 'initial_balance',
  includes_floating boolean not null default false,
  daily_reset boolean not null default false,
  limit_value numeric not null default 0,
  severity text not null default 'hard',
  enabled boolean not null default true,
  params jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists rule_instances_rule_set_version_id_idx on public.rule_instances(rule_set_version_id);
create index if not exists rule_instances_rule_definition_id_idx on public.rule_instances(rule_definition_id);

insert into public.rule_definitions (id, key, name, description, category)
values
  ('979eec4c-9632-40c3-b50c-65130b306ac8', 'max_daily_loss', 'Maximum Daily Loss', 'Maximum loss allowed in one trading day.', 'risk'),
  ('001dcf3d-982d-4bcf-bcaf-661a896b68ca', 'max_total_loss', 'Maximum Total Loss', 'Maximum total loss allowed for the account.', 'risk'),
  ('a8084044-5db3-4913-b74c-39a1b6ed69d4', 'trailing_drawdown', 'Trailing Drawdown', 'Trailing drawdown limit from high water mark.', 'risk'),
  ('6dc6dca0-2c24-45f8-a31f-71f3d10f0b01', 'floating_loss_limit', 'Floating Loss Limit', 'Maximum open floating loss allowed.', 'risk'),
  ('bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'profit_target', 'Profit Target', 'Profit target required to pass.', 'objective'),
  ('f454efd7-1fd9-45af-8e98-04a461bfc9f1', 'min_trading_days', 'Minimum Trading Days', 'Minimum number of trading days required.', 'objective'),
  ('4cd43adb-38d6-4e0e-aa6f-83a248b3bf65', 'profitable_days', 'Profitable Days', 'Minimum number of profitable days required.', 'objective'),
  ('81e89747-e5ce-43dd-9a17-dd396260d670', 'consistency_best_day_cap', 'Consistency Best Day Cap', 'Maximum contribution allowed from the best trading day.', 'consistency'),
  ('daf708d7-65c5-4ea7-8ffd-f0ce392494ae', 'inactivity_limit', 'Inactivity Limit', 'Maximum days allowed without trading.', 'activity'),
  ('53c2ff92-6c0e-40c6-b293-bb61a55995a1', 'news_restriction', 'News Restriction', 'Restriction around news events.', 'restriction'),
  ('c9b6ae2d-704c-4a1c-bb1c-cccb7ff3c8b6', 'scalping_restriction', 'Scalping Restriction', 'Restriction on very short trades.', 'restriction'),
  ('dd37a616-b7fb-4252-8e77-f97e51a8a502', 'weekend_holding', 'Weekend Holding', 'Restriction on holding positions over weekends.', 'restriction'),
  ('bcf7a363-5c8b-4bd4-924d-19e730b5de05', 'payout_eligibility', 'Payout Eligibility', 'Eligibility conditions for payout.', 'payout'),
  ('b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'profit_split', 'Profit Split', 'Trader profit split percentage.', 'payout'),
  ('cc40ccda-2560-4270-a92e-f2432217d4af', 'payout_frequency', 'Payout Frequency', 'Payout frequency in days.', 'payout'),
  ('c8446a03-7419-45cc-8f73-b8120ad4e037', 'leverage_limit', 'Leverage Limit', 'Maximum leverage allowed.', 'risk')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category;

insert into public.programs (prop_firm_id, name, account_type, market_type, notes)
select pf.id, 'Default Evaluation', 'evaluation', 'forex', 'Default Fortify-compatible rule program'
from public.prop_firms pf
where not exists (
  select 1 from public.programs p where p.prop_firm_id = pf.id
);

insert into public.rule_set_versions (program_id, name, start_date, source_url, status)
select p.id, p.name || ' Rules', current_date, null, 'active'
from public.programs p
where not exists (
  select 1 from public.rule_set_versions rsv where rsv.program_id = p.id and rsv.status = 'active'
);

with wanted_rules(key, mode, limit_value, severity, includes_floating, daily_reset, base_calculation) as (
  values
    ('max_daily_loss'::public.rule_definition_key, 'percent'::public.rule_mode, 5::numeric, 'hard'::text, true, true, 'initial_balance'::text),
    ('max_total_loss'::public.rule_definition_key, 'percent'::public.rule_mode, 10::numeric, 'hard'::text, true, false, 'initial_balance'::text),
    ('profit_target'::public.rule_definition_key, 'percent'::public.rule_mode, 10::numeric, 'hard'::text, false, false, 'initial_balance'::text),
    ('min_trading_days'::public.rule_definition_key, 'value'::public.rule_mode, 3::numeric, 'hard'::text, false, false, null::text),
    ('consistency_best_day_cap'::public.rule_definition_key, 'percent'::public.rule_mode, 40::numeric, 'soft'::text, false, false, null::text)
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
  base_calculation
)
select
  rsv.id,
  rd.id,
  wr.mode,
  wr.limit_value,
  wr.severity,
  true,
  wr.includes_floating,
  wr.daily_reset,
  wr.base_calculation
from public.rule_set_versions rsv
cross join wanted_rules wr
join public.rule_definitions rd on rd.key = wr.key
where not exists (
  select 1
  from public.rule_instances ri
  where ri.rule_set_version_id = rsv.id
    and ri.rule_definition_id = rd.id
);

alter table if exists public.trading_accounts
  add column if not exists nickname text,
  add column if not exists broker text,
  add column if not exists prop_firm text,
  add column if not exists account_type text,
  add column if not exists base_currency text not null default 'USD',
  add column if not exists start_balance numeric not null default 0,
  add column if not exists current_balance numeric not null default 0,
  add column if not exists current_equity numeric not null default 0,
  add column if not exists highest_equity numeric not null default 0,
  add column if not exists rule_set_id text,
  add column if not exists mt5_server text,
  add column if not exists mt5_connection_status text default 'disconnected',
  add column if not exists mt5_last_sync_at timestamptz,
  add column if not exists mt5_sync_error text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists daily_loss_limit numeric not null default 0,
  add column if not exists total_loss_limit numeric not null default 0,
  add column if not exists profit_target numeric not null default 0,
  add column if not exists daily_loss_used numeric not null default 0,
  add column if not exists total_loss_used numeric not null default 0,
  add column if not exists trading_days_count integer not null default 0,
  add column if not exists last_trading_date date,
  add column if not exists min_trading_days integer not null default 0,
  add column if not exists daily_loss_reset_date date,
  add column if not exists program text,
  add column if not exists phase text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trading_accounts' and column_name = 'name'
  ) then
    execute 'update public.trading_accounts set nickname = coalesce(nickname, name, ''Conta'')';
  else
    update public.trading_accounts set nickname = coalesce(nickname, 'Conta');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trading_accounts' and column_name = 'currency'
  ) then
    execute 'update public.trading_accounts set base_currency = coalesce(base_currency, currency, ''USD'')';
  else
    update public.trading_accounts set base_currency = coalesce(base_currency, 'USD');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trading_accounts' and column_name = 'initial_balance'
  ) then
    execute '
      update public.trading_accounts
      set
        start_balance = case when start_balance = 0 then coalesce(initial_balance, start_balance, 0) else start_balance end,
        current_balance = case when current_balance = 0 then coalesce(initial_balance, current_balance, 0) else current_balance end,
        current_equity = case when current_equity = 0 then coalesce(initial_balance, current_equity, 0) else current_equity end,
        highest_equity = case when highest_equity = 0 then coalesce(initial_balance, highest_equity, 0) else highest_equity end';
  end if;

  update public.trading_accounts
  set mt5_connection_status = coalesce(mt5_connection_status, 'disconnected'),
      updated_at = coalesce(updated_at, created_at, now());
end $$;

create index if not exists trading_accounts_user_id_idx on public.trading_accounts(user_id);

create table if not exists public.mt5_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  trading_account_id uuid,
  account_name text,
  mt5_login text,
  mt5_server text,
  broker_name text,
  provider text not null default 'metaapi',
  provider_account_id text,
  api_mode text not null default 'cloud',
  account_type text,
  prop_firm text,
  connection_status text not null default 'disconnected',
  sync_status text not null default 'queued',
  sync_error text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.mt5_connections
  add column if not exists user_id uuid,
  add column if not exists trading_account_id uuid,
  add column if not exists account_name text,
  add column if not exists mt5_login text,
  add column if not exists mt5_server text,
  add column if not exists broker_name text,
  add column if not exists provider text not null default 'metaapi',
  add column if not exists provider_account_id text,
  add column if not exists api_mode text not null default 'cloud',
  add column if not exists account_type text,
  add column if not exists prop_firm text,
  add column if not exists connection_status text not null default 'disconnected',
  add column if not exists sync_status text not null default 'queued',
  add column if not exists sync_error text,
  add column if not exists last_sync_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.mt5_connections
set provider = coalesce(provider, 'metaapi'),
    api_mode = coalesce(api_mode, 'cloud'),
    connection_status = coalesce(connection_status, 'disconnected'),
    sync_status = coalesce(sync_status, 'queued');

alter table public.mt5_connections
  drop constraint if exists mt5_connections_provider_check,
  drop constraint if exists mt5_connections_sync_status_check,
  drop constraint if exists mt5_connections_api_mode_check;

alter table public.mt5_connections
  add constraint mt5_connections_provider_check check (provider in ('metaapi','bridge','external')),
  add constraint mt5_connections_sync_status_check check (sync_status in ('idle','queued','running','success','completed','error')),
  add constraint mt5_connections_api_mode_check check (api_mode in ('cloud','local','hybrid'));

create index if not exists mt5_connections_user_idx on public.mt5_connections(user_id);
create index if not exists mt5_connections_trading_account_idx on public.mt5_connections(trading_account_id);
create index if not exists mt5_connections_provider_idx on public.mt5_connections(provider);

create table if not exists public.account_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid not null references public.trading_accounts(id) on delete cascade,
  date date not null default current_date,
  balance numeric,
  equity numeric,
  daily_pnl numeric,
  floating_pnl numeric,
  drawdown numeric,
  max_balance numeric,
  used_daily_loss_pct numeric,
  used_total_loss_pct numeric,
  created_at timestamptz not null default now()
);

create unique index if not exists account_daily_snapshots_account_date_uq
  on public.account_daily_snapshots(trading_account_id, date);
create index if not exists account_daily_snapshots_user_date_idx
  on public.account_daily_snapshots(user_id, date desc);

create table if not exists public.mt5_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.mt5_connections(id) on delete cascade,
  date date,
  balance numeric not null default 0,
  equity numeric not null default 0,
  daily_pnl numeric not null default 0,
  floating_pnl numeric not null default 0,
  drawdown numeric not null default 0,
  max_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table if exists public.mt5_account_snapshots
  add column if not exists date date,
  add column if not exists balance numeric not null default 0,
  add column if not exists daily_pnl numeric not null default 0,
  add column if not exists floating_pnl numeric not null default 0,
  add column if not exists drawdown numeric not null default 0,
  add column if not exists max_balance numeric not null default 0,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'mt5_account_snapshots' and column_name = 'account_balance'
  ) then
    execute 'update public.mt5_account_snapshots set balance = case when balance = 0 then coalesce(account_balance, balance, 0) else balance end';
  end if;
end $$;

update public.mt5_account_snapshots
set date = coalesce(date, created_at::date, current_date),
    max_balance = greatest(coalesce(max_balance, 0), coalesce(balance, 0), coalesce(equity, 0));

create index if not exists mt5_account_snapshots_connection_id_idx
  on public.mt5_account_snapshots(connection_id);
create unique index if not exists mt5_account_snapshots_connection_date_idx
  on public.mt5_account_snapshots(connection_id, date);

create table if not exists public.mt5_positions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.mt5_connections(id) on delete cascade,
  ticket bigint,
  symbol text,
  volume numeric not null default 0,
  open_price numeric not null default 0,
  current_price numeric not null default 0,
  floating_pnl numeric not null default 0,
  stop_loss numeric,
  take_profit numeric,
  updated_at timestamptz not null default now()
);

alter table if exists public.mt5_positions
  add column if not exists open_price numeric not null default 0,
  add column if not exists current_price numeric not null default 0,
  add column if not exists floating_pnl numeric not null default 0,
  add column if not exists stop_loss numeric,
  add column if not exists take_profit numeric,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'mt5_positions' and column_name = 'price'
  ) then
    execute 'update public.mt5_positions set open_price = coalesce(open_price, price, 0), current_price = coalesce(current_price, price, 0)';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'mt5_positions' and column_name = 'profit'
  ) then
    execute 'update public.mt5_positions set floating_pnl = coalesce(floating_pnl, profit, 0)';
  end if;
end $$;

create index if not exists mt5_positions_connection_id_idx on public.mt5_positions(connection_id);
create index if not exists mt5_positions_ticket_idx on public.mt5_positions(ticket);

create table if not exists public.mt5_trades (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.mt5_connections(id) on delete cascade,
  ticket bigint,
  symbol text,
  side text,
  volume numeric not null default 0,
  open_time timestamptz,
  close_time timestamptz,
  open_price numeric not null default 0,
  close_price numeric,
  profit numeric not null default 0,
  commission numeric not null default 0,
  swap numeric not null default 0,
  stop_loss numeric,
  take_profit numeric,
  created_at timestamptz not null default now()
);

alter table if exists public.mt5_trades
  add column if not exists open_time timestamptz,
  add column if not exists close_time timestamptz,
  add column if not exists open_price numeric not null default 0,
  add column if not exists close_price numeric,
  add column if not exists stop_loss numeric,
  add column if not exists take_profit numeric,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'mt5_trades' and column_name = 'price'
  ) then
    execute 'update public.mt5_trades set open_price = coalesce(open_price, price, 0), close_price = coalesce(close_price, price)';
  end if;
end $$;

update public.mt5_trades
set open_time = coalesce(open_time, created_at, now());

create index if not exists mt5_trades_connection_id_idx on public.mt5_trades(connection_id);
create unique index if not exists mt5_trades_connection_ticket_unique_idx
  on public.mt5_trades(connection_id, ticket);

create table if not exists public.rule_evaluations (
  id uuid primary key default gen_random_uuid(),
  trading_account_id uuid,
  rule_instance_id uuid,
  connection_id uuid,
  status text not null default 'NOT_MET',
  current_value numeric(20,6),
  limit_value numeric(20,6),
  progress_pct numeric(6,2),
  message text,
  computation_window text,
  reference_date date,
  computed_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.rule_evaluations
  add column if not exists trading_account_id uuid,
  add column if not exists rule_instance_id uuid,
  add column if not exists connection_id uuid,
  add column if not exists progress_pct numeric(6,2),
  add column if not exists message text,
  add column if not exists computation_window text,
  add column if not exists reference_date date,
  add column if not exists computed_at timestamptz default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.rule_evaluations
set computed_at = coalesce(computed_at, now()),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

create unique index if not exists rule_evaluations_unique_per_account_rule_date_idx
  on public.rule_evaluations(trading_account_id, rule_instance_id, reference_date) nulls not distinct;
create index if not exists rule_evaluations_trading_account_idx on public.rule_evaluations(trading_account_id);
create index if not exists rule_evaluations_computed_at_idx on public.rule_evaluations(computed_at desc);
create index if not exists rule_evaluations_status_idx on public.rule_evaluations(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trading_accounts_set_updated_at on public.trading_accounts;
create trigger trading_accounts_set_updated_at
before update on public.trading_accounts
for each row execute function public.set_updated_at();

drop trigger if exists mt5_connections_set_updated_at on public.mt5_connections;
create trigger mt5_connections_set_updated_at
before update on public.mt5_connections
for each row execute function public.set_updated_at();

drop trigger if exists mt5_positions_set_updated_at on public.mt5_positions;
create trigger mt5_positions_set_updated_at
before update on public.mt5_positions
for each row execute function public.set_updated_at();

drop trigger if exists rule_evaluations_set_updated_at on public.rule_evaluations;
create trigger rule_evaluations_set_updated_at
before update on public.rule_evaluations
for each row execute function public.set_updated_at();

alter table public.prop_firms enable row level security;
alter table public.programs enable row level security;
alter table public.rule_set_versions enable row level security;
alter table public.rule_definitions enable row level security;
alter table public.rule_instances enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.mt5_connections enable row level security;
alter table public.account_daily_snapshots enable row level security;
alter table public.mt5_account_snapshots enable row level security;
alter table public.mt5_positions enable row level security;
alter table public.mt5_trades enable row level security;
alter table public.rule_evaluations enable row level security;

drop policy if exists "Anyone can read prop_firms" on public.prop_firms;
create policy "Anyone can read prop_firms" on public.prop_firms for select using (true);

drop policy if exists "Anyone can read programs" on public.programs;
create policy "Anyone can read programs" on public.programs for select using (true);

drop policy if exists "Anyone can read rule_set_versions" on public.rule_set_versions;
create policy "Anyone can read rule_set_versions" on public.rule_set_versions for select using (true);

drop policy if exists "Anyone can read rule_definitions" on public.rule_definitions;
create policy "Anyone can read rule_definitions" on public.rule_definitions for select using (true);

drop policy if exists "Anyone can read rule_instances" on public.rule_instances;
create policy "Anyone can read rule_instances" on public.rule_instances for select using (true);

drop policy if exists trading_accounts_select_own on public.trading_accounts;
create policy trading_accounts_select_own on public.trading_accounts
for select using (auth.uid() = user_id);

drop policy if exists trading_accounts_insert_own on public.trading_accounts;
create policy trading_accounts_insert_own on public.trading_accounts
for insert with check (auth.uid() = user_id);

drop policy if exists trading_accounts_update_own on public.trading_accounts;
create policy trading_accounts_update_own on public.trading_accounts
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists trading_accounts_delete_own on public.trading_accounts;
create policy trading_accounts_delete_own on public.trading_accounts
for delete using (auth.uid() = user_id);

drop policy if exists mt5_connections_select_own on public.mt5_connections;
create policy mt5_connections_select_own on public.mt5_connections
for select using (auth.uid() = user_id);

drop policy if exists mt5_connections_insert_own on public.mt5_connections;
create policy mt5_connections_insert_own on public.mt5_connections
for insert with check (auth.uid() = user_id);

drop policy if exists mt5_connections_update_own on public.mt5_connections;
create policy mt5_connections_update_own on public.mt5_connections
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists mt5_connections_delete_own on public.mt5_connections;
create policy mt5_connections_delete_own on public.mt5_connections
for delete using (auth.uid() = user_id);

drop policy if exists account_daily_snapshots_select_own on public.account_daily_snapshots;
create policy account_daily_snapshots_select_own on public.account_daily_snapshots
for select using (auth.uid() = user_id);

drop policy if exists mt5_account_snapshots_select_own on public.mt5_account_snapshots;
create policy mt5_account_snapshots_select_own on public.mt5_account_snapshots
for select using (
  exists (
    select 1 from public.mt5_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  )
);

drop policy if exists mt5_positions_select_own on public.mt5_positions;
create policy mt5_positions_select_own on public.mt5_positions
for select using (
  exists (
    select 1 from public.mt5_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  )
);

drop policy if exists mt5_trades_select_own on public.mt5_trades;
create policy mt5_trades_select_own on public.mt5_trades
for select using (
  exists (
    select 1 from public.mt5_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  )
);

drop policy if exists rule_evaluations_select_own on public.rule_evaluations;
create policy rule_evaluations_select_own on public.rule_evaluations
for select using (
  exists (
    select 1 from public.trading_accounts ta
    where ta.id = trading_account_id and ta.user_id = auth.uid()
  )
);

commit;
