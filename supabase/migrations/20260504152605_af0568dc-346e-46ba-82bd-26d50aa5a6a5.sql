-- enable upsert by (connection_id, ticket) in trades
ALTER TABLE public.mt5_trades
  ADD CONSTRAINT mt5_trades_connection_ticket_unique UNIQUE (connection_id, ticket);

-- enable upsert by (connection_id, date) in daily snapshots
ALTER TABLE public.mt5_account_snapshots
  ADD CONSTRAINT mt5_account_snapshots_connection_date_unique UNIQUE (connection_id, date);