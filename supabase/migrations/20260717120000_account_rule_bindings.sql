-- Versioned, auditable binding between a customer account and the reviewed rule dataset.
-- Additive only. Existing accounts remain valid and appear as pending until explicitly bound.

create extension if not exists "pgcrypto";

create table if not exists public.account_rule_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid references public.trading_accounts(id) on delete cascade,
  mt5_connection_id uuid references public.mt5_connections(id) on delete cascade,
  prop_firm_slug text not null,
  program_slug text not null,
  account_size_id text not null,
  platform text not null,
  rule_version_id text not null,
  rule_profile_id text not null,
  rules_last_reviewed_at text not null,
  rule_snapshot jsonb not null,
  rule_snapshot_hash text not null,
  automatic_monitoring_enabled boolean not null default true,
  manual_rule_acknowledgement boolean not null default false,
  manual_rules_status text not null default 'pending_acknowledgement',
  binding_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_rule_bindings_account_link_check
    check (trading_account_id is not null or mt5_connection_id is not null),
  constraint account_rule_bindings_manual_status_check
    check (manual_rules_status in ('pending_acknowledgement', 'acknowledged')),
  constraint account_rule_bindings_status_check
    check (binding_status in ('active', 'superseded', 'revoked')),
  constraint account_rule_bindings_active_ack_check
    check (
      binding_status <> 'active'
      or (
        manual_rule_acknowledgement = true
        and manual_rules_status = 'acknowledged'
      )
    ),
  constraint account_rule_bindings_snapshot_shape_check
    check (
      jsonb_typeof(rule_snapshot) = 'object'
      and rule_snapshot ? 'schemaVersion'
      and rule_snapshot ? 'criticalRules'
      and rule_snapshot ? 'monitorability'
      and rule_snapshot ? 'evidence'
    )
);

create index if not exists account_rule_bindings_user_idx
  on public.account_rule_bindings(user_id);
create index if not exists account_rule_bindings_profile_idx
  on public.account_rule_bindings(rule_profile_id, rule_version_id);
create index if not exists account_rule_bindings_hash_idx
  on public.account_rule_bindings(rule_snapshot_hash);
create unique index if not exists account_rule_bindings_active_trading_account_uq
  on public.account_rule_bindings(trading_account_id)
  where binding_status = 'active' and trading_account_id is not null;
create unique index if not exists account_rule_bindings_active_mt5_connection_uq
  on public.account_rule_bindings(mt5_connection_id)
  where binding_status = 'active' and mt5_connection_id is not null;

alter table public.account_rule_bindings enable row level security;

drop policy if exists account_rule_bindings_select_own on public.account_rule_bindings;
create policy account_rule_bindings_select_own on public.account_rule_bindings
for select using (auth.uid() = user_id);

drop policy if exists account_rule_bindings_insert_own on public.account_rule_bindings;
create policy account_rule_bindings_insert_own on public.account_rule_bindings
for insert with check (
  auth.uid() = user_id
  and (
    trading_account_id is null
    or exists (
      select 1
      from public.trading_accounts account
      where account.id = trading_account_id
        and account.user_id = auth.uid()
    )
  )
  and (
    mt5_connection_id is null
    or exists (
      select 1
      from public.mt5_connections connection
      where connection.id = mt5_connection_id
        and connection.user_id = auth.uid()
    )
  )
);

drop policy if exists account_rule_bindings_update_own on public.account_rule_bindings;
create policy account_rule_bindings_update_own on public.account_rule_bindings
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    trading_account_id is null
    or exists (
      select 1
      from public.trading_accounts account
      where account.id = trading_account_id
        and account.user_id = auth.uid()
    )
  )
  and (
    mt5_connection_id is null
    or exists (
      select 1
      from public.mt5_connections connection
      where connection.id = mt5_connection_id
        and connection.user_id = auth.uid()
    )
  )
);

drop policy if exists account_rule_bindings_delete_own on public.account_rule_bindings;
create policy account_rule_bindings_delete_own on public.account_rule_bindings
for delete using (auth.uid() = user_id);

create or replace function public.supersede_previous_account_rule_binding()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.binding_status = 'active' then
    update public.account_rule_bindings
    set
      binding_status = 'superseded',
      updated_at = now()
    where user_id = new.user_id
      and binding_status = 'active'
      and (
        (new.trading_account_id is not null and trading_account_id = new.trading_account_id)
        or
        (new.mt5_connection_id is not null and mt5_connection_id = new.mt5_connection_id)
      );
  end if;
  return new;
end;
$$;

drop trigger if exists account_rule_bindings_supersede_previous
  on public.account_rule_bindings;
create trigger account_rule_bindings_supersede_previous
before insert on public.account_rule_bindings
for each row execute function public.supersede_previous_account_rule_binding();

create or replace function public.sync_trading_account_rule_binding_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.trading_account_id is not null then
    update public.trading_accounts
    set
      rule_selection_status = case
        when new.binding_status = 'active' then 'configured'
        when exists (
          select 1
          from public.account_rule_bindings binding
          where binding.trading_account_id = new.trading_account_id
            and binding.binding_status = 'active'
            and binding.id <> new.id
        ) then 'configured'
        else 'unconfigured'
      end,
      updated_at = now()
    where id = new.trading_account_id
      and user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists account_rule_bindings_sync_account_status
  on public.account_rule_bindings;
create trigger account_rule_bindings_sync_account_status
after insert or update of binding_status on public.account_rule_bindings
for each row execute function public.sync_trading_account_rule_binding_status();

drop trigger if exists account_rule_bindings_set_updated_at
  on public.account_rule_bindings;
create trigger account_rule_bindings_set_updated_at
before update on public.account_rule_bindings
for each row execute function public.set_updated_at();
