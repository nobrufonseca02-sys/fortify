alter table if exists public.mt5_connections
add column if not exists brokerName text;
