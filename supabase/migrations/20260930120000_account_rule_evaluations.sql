-- Avaliações canônicas do motor de regras, calculadas pelo gateway a partir do
-- snapshot versionado ativo em account_rule_bindings.
--
-- Aditiva: não altera nem apaga rule_evaluations (catálogo antigo), que segue
-- existindo como fallback explícito para contas sem vínculo.
--
-- Histórico auditável: uma linha por execução do motor, append-only. Cada linha
-- aponta para o binding (e hash/versão do snapshot) usado no cálculo; como
-- bindings nunca são apagados (só superseded/revoked), avaliações antigas
-- continuam ligadas ao snapshot antigo depois de uma troca de versão.

create table if not exists public.account_rule_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid not null references public.trading_accounts(id) on delete cascade,
  mt5_connection_id uuid references public.mt5_connections(id) on delete set null,
  -- cascade só para não travar a exclusão definitiva da conta (que também
  -- apaga seus bindings); bindings não são apagados em nenhum outro fluxo.
  binding_id uuid not null references public.account_rule_bindings(id) on delete cascade,
  rule_snapshot_hash text not null,
  rule_version_id text not null,
  engine_version text not null,
  overall_status text not null,
  overall_message text not null,
  automatic_rules jsonb not null default '[]'::jsonb,
  manual_rules jsonb not null default '[]'::jsonb,
  unsupported_rules jsonb not null default '[]'::jsonb,
  not_calculated_rules jsonb not null default '[]'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  -- Resumo dos dados de entrada (datas e contagens), sem credenciais.
  input_summary jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint account_rule_evaluations_status_check
    check (overall_status in (
      'safe', 'partial', 'warning', 'critical', 'breached', 'not_monitorable', 'pending_binding'
    )),
  constraint account_rule_evaluations_rules_shape_check
    check (
      jsonb_typeof(automatic_rules) = 'array'
      and jsonb_typeof(manual_rules) = 'array'
      and jsonb_typeof(unsupported_rules) = 'array'
      and jsonb_typeof(not_calculated_rules) = 'array'
      and jsonb_typeof(alerts) = 'array'
    )
);

create index if not exists account_rule_evaluations_account_time_idx
  on public.account_rule_evaluations(trading_account_id, evaluated_at desc);
create index if not exists account_rule_evaluations_binding_time_idx
  on public.account_rule_evaluations(binding_id, evaluated_at desc);
create index if not exists account_rule_evaluations_user_idx
  on public.account_rule_evaluations(user_id);

-- A linha precisa pertencer ao mesmo dono e à mesma conta do binding que diz ter
-- usado, e o hash/versão gravados precisam ser os do binding.
create or replace function public.check_account_rule_evaluation_binding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  binding record;
begin
  select user_id, trading_account_id, rule_snapshot_hash, rule_version_id
  into binding
  from public.account_rule_bindings
  where id = new.binding_id;

  if not found then
    raise exception 'account_rule_evaluations: binding % não existe', new.binding_id;
  end if;

  if binding.user_id <> new.user_id
     or binding.trading_account_id is distinct from new.trading_account_id
     or binding.rule_snapshot_hash <> new.rule_snapshot_hash
     or binding.rule_version_id <> new.rule_version_id then
    raise exception 'account_rule_evaluations: linha não corresponde ao binding %', new.binding_id;
  end if;

  return new;
end;
$$;

drop trigger if exists account_rule_evaluations_check_binding
  on public.account_rule_evaluations;
create trigger account_rule_evaluations_check_binding
before insert or update on public.account_rule_evaluations
for each row execute function public.check_account_rule_evaluation_binding();

-- Histórico imutável: nem o gateway altera ou apaga uma avaliação gravada.
create or replace function public.prevent_account_rule_evaluation_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'account_rule_evaluations é append-only';
end;
$$;

drop trigger if exists account_rule_evaluations_append_only
  on public.account_rule_evaluations;
create trigger account_rule_evaluations_append_only
before update on public.account_rule_evaluations
for each row execute function public.prevent_account_rule_evaluation_mutation();

revoke execute on function public.check_account_rule_evaluation_binding() from public;
revoke execute on function public.prevent_account_rule_evaluation_mutation() from public;

alter table public.account_rule_evaluations enable row level security;

-- Leitura: só o dono. Escrita: nenhuma policy para usuários — apenas o gateway
-- (service role, que ignora RLS) grava avaliações.
drop policy if exists account_rule_evaluations_select_own on public.account_rule_evaluations;
create policy account_rule_evaluations_select_own on public.account_rule_evaluations
for select using (auth.uid() = user_id);

revoke insert, update, delete on public.account_rule_evaluations from anon, authenticated;

-- Última avaliação por conta, respeitando o RLS de quem consulta.
create or replace view public.latest_account_rule_evaluations
with (security_invoker = true)
as
select distinct on (trading_account_id) *
from public.account_rule_evaluations
order by trading_account_id, evaluated_at desc;

grant select on public.latest_account_rule_evaluations to authenticated;
