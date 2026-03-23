-- MT5 module alignment: remove legacy columns and align status values

begin;

-- tradingAccounts: remove legacy MT5 fields (no longer stored here)
alter table if exists public.trading_accounts
  drop column if exists mt5_server,
  drop column if exists mt5_login,
  drop column if exists account_type,
  drop column if exists prop_firm;

-- mt5Connections: ensure status values match frontend types (authError)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mt5_connections'
      and column_name = 'connection_status'
  ) then
    update public.mt5_connections
      set connection_status = 'authError'
      where connection_status in ('auth_error');
  end if;
end $$;

commit;
