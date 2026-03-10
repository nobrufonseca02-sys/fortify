begin;

-- 1) mt5_connections.connection_status: usar enum oficial
alter table public.mt5_connections
  alter column connection_status type public.mt5_connection_status
  using connection_status::public.mt5_connection_status;

-- 2) trading_accounts.status: avaliar e aplicar enum próprio (sem novas tabelas)
-- Criar enum se ainda não existir
DO $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'trading_account_status'
  ) then
    create type public.trading_account_status as enum (
      'active',
      'inactive',
      'paused',
      'archived'
    );
  end if;
end $$;

-- Converter coluna existente para enum mantendo o nome/estrutura
alter table public.trading_accounts
  alter column status type public.trading_account_status
  using status::public.trading_account_status;

commit;
