begin;

-- Garantir idempotência via upsert nas tabelas oficiais

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'trades_trading_account_ticket_uq'
  ) then
    create unique index trades_trading_account_ticket_uq
      on public.trades (trading_account_id, ticket);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'open_positions_trading_account_ticket_uq'
  ) then
    create unique index open_positions_trading_account_ticket_uq
      on public.open_positions (trading_account_id, ticket);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'account_snapshots_trading_account_date_uq'
  ) then
    create unique index account_snapshots_trading_account_date_uq
      on public.account_snapshots (trading_account_id, date);
  end if;
end $$;

commit;
