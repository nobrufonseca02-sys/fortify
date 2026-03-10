-- Correção obrigatória do schema oficial: trading_accounts como entidade principal
-- Ajusta colunas, FKs, índices e RLS sem criar tabelas novas.

begin;

create extension if not exists "pgcrypto";

-- ================================
-- 1) trading_accounts: enriquecer
-- ================================
alter table if exists public.trading_accounts
  add column if not exists nickname text,
  add column if not exists broker text,
  add column if not exists mt5_server text,
  add column if not exists mt5_login text,
  add column if not exists account_type text,
  add column if not exists prop_firm text,
  add column if not exists start_balance numeric not null default 0,
  add column if not exists current_balance numeric not null default 0,
  add column if not exists current_equity numeric not null default 0,
  add column if not exists highest_equity numeric not null default 0,
  add column if not exists status text not null default 'active';

-- Garantir que updated_at exista (projetos antigos podem não ter)
alter table if exists public.trading_accounts
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- nickname deve ser obrigatório (se houver linhas antigas, preencher com fallback)
update public.trading_accounts
set nickname = coalesce(nickname, 'Conta')
where nickname is null;

alter table public.trading_accounts
  alter column nickname set not null;

create index if not exists trading_accounts_user_id_idx on public.trading_accounts(user_id);

alter table public.trading_accounts enable row level security;

do $$
begin
  create policy "trading_accounts_select_own" on public.trading_accounts
  for select
  using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "trading_accounts_insert_own" on public.trading_accounts
  for insert
  with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "trading_accounts_update_own" on public.trading_accounts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "trading_accounts_delete_own" on public.trading_accounts
  for delete
  using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- =============================================
-- 2) mt5_connections: camada técnica da conexão
-- =============================================
-- Criar colunas novas conforme arquitetura correta
alter table if exists public.mt5_connections
  add column if not exists trading_account_id uuid,
  add column if not exists provider text not null default 'external',
  add column if not exists connection_status text not null default 'disconnected',
  add column if not exists last_sync_at timestamptz,
  add column if not exists sync_error text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Garantir colunas técnicas mínimas
alter table if exists public.mt5_connections
  add column if not exists mt5_login text,
  add column if not exists mt5_server text,
  add column if not exists broker_name text;

-- Tentar migrar dados existentes (se schema antigo existir)
-- 1) Se já houver user_id em mt5_connections, criar/ligar trading_accounts
-- 2) Copiar mt5_login/mt5_server/broker_name para trading_accounts quando estiverem ausentes

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='mt5_connections' and column_name='user_id'
  ) then
    -- criar contas ausentes
    insert into public.trading_accounts (
      id,
      user_id,
      nickname,
      broker,
      mt5_server,
      mt5_login,
      account_type,
      prop_firm,
      status,
      created_at,
      updated_at
    )
    select
      gen_random_uuid(),
      mc.user_id,
      coalesce(mc.account_name, 'Conta'),
      mc.broker_name,
      mc.mt5_server,
      mc.mt5_login,
      mc.account_type,
      mc.prop_firm,
      'active',
      now(),
      now()
    from public.mt5_connections mc
    where not exists (
      select 1
      from public.trading_accounts ta
      where ta.user_id = mc.user_id
        and (ta.mt5_login is not distinct from mc.mt5_login)
        and (ta.mt5_server is not distinct from mc.mt5_server)
    );

    -- vincular mt5_connections -> trading_accounts
    update public.mt5_connections mc
    set trading_account_id = ta.id
    from public.trading_accounts ta
    where ta.user_id = mc.user_id
      and (ta.mt5_login is not distinct from mc.mt5_login)
      and (ta.mt5_server is not distinct from mc.mt5_server)
      and mc.trading_account_id is null;

    -- enriquecer trading_accounts a partir do schema antigo
    update public.trading_accounts ta
    set
      nickname = coalesce(ta.nickname, mc.account_name, 'Conta'),
      broker = coalesce(ta.broker, mc.broker_name),
      mt5_server = coalesce(ta.mt5_server, mc.mt5_server),
      mt5_login = coalesce(ta.mt5_login, mc.mt5_login),
      account_type = coalesce(ta.account_type, mc.account_type),
      prop_firm = coalesce(ta.prop_firm, mc.prop_firm)
    from public.mt5_connections mc
    where mc.trading_account_id = ta.id;
  end if;
end $$;

-- trading_account_id obrigatório e com FK
alter table public.mt5_connections
  alter column trading_account_id set not null;

-- Remover FK antiga e colunas de identidade (se existirem)
-- (schema antigo tinha user_id, account_name, account_type, prop_firm)

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='mt5_connections' and constraint_name='mt5_connections_user_id_fkey'
  ) then
    execute 'alter table public.mt5_connections drop constraint mt5_connections_user_id_fkey';
  end if;
exception when undefined_object then null;
end $$;

alter table if exists public.mt5_connections
  drop column if exists user_id,
  drop column if exists account_name,
  drop column if exists account_type,
  drop column if exists prop_firm;

-- Garantir FK correta

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='mt5_connections' and constraint_name='mt5_connections_trading_account_id_fkey'
  ) then
    execute 'alter table public.mt5_connections add constraint mt5_connections_trading_account_id_fkey foreign key (trading_account_id) references public.trading_accounts(id) on delete cascade';
  end if;
end $$;

create index if not exists mt5_connections_trading_account_id_idx on public.mt5_connections(trading_account_id);

-- Unicidade: 1 conexão por conta

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='mt5_connections_trading_account_id_key'
  ) then
    execute 'create unique index mt5_connections_trading_account_id_key on public.mt5_connections(trading_account_id)';
  end if;
end $$;

alter table public.mt5_connections enable row level security;

do $$
begin
  create policy "mt5_connections_select_own" on public.mt5_connections
  for select
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = mt5_connections.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "mt5_connections_insert_own" on public.mt5_connections
  for insert
  with check (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = mt5_connections.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "mt5_connections_update_own" on public.mt5_connections
  for update
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = mt5_connections.trading_account_id
        and ta.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = mt5_connections.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "mt5_connections_delete_own" on public.mt5_connections
  for delete
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = mt5_connections.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

-- ===================================================
-- 3) trades/open_positions/account_snapshots: trocar FK
-- ===================================================

-- trades
alter table if exists public.trades
  add column if not exists trading_account_id uuid;

-- Migrar dados antigos se houver connection_id

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='trades' and column_name='connection_id'
  ) then
    update public.trades t
    set trading_account_id = mc.trading_account_id
    from public.mt5_connections mc
    where t.connection_id = mc.id
      and t.trading_account_id is null;
  end if;
end $$;

alter table public.trades
  alter column trading_account_id set not null;


do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='trades' and constraint_name='trades_connection_id_fkey'
  ) then
    execute 'alter table public.trades drop constraint trades_connection_id_fkey';
  end if;
exception when undefined_object then null;
end $$;

alter table if exists public.trades
  drop column if exists connection_id;


do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='trades' and constraint_name='trades_trading_account_id_fkey'
  ) then
    execute 'alter table public.trades add constraint trades_trading_account_id_fkey foreign key (trading_account_id) references public.trading_accounts(id) on delete cascade';
  end if;
end $$;

-- Ajustar unique antiga

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='trades' and constraint_type='UNIQUE' and constraint_name='trades_connection_id_ticket_key'
  ) then
    execute 'alter table public.trades drop constraint trades_connection_id_ticket_key';
  end if;
exception when undefined_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='trades' and constraint_type='UNIQUE' and constraint_name='trades_trading_account_id_ticket_key'
  ) then
    execute 'alter table public.trades add constraint trades_trading_account_id_ticket_key unique (trading_account_id, ticket)';
  end if;
end $$;

create index if not exists trades_trading_account_id_open_time_idx on public.trades(trading_account_id, open_time desc);

alter table public.trades enable row level security;

do $$
begin
  create policy "trades_select_own" on public.trades
  for select
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = trades.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "trades_insert_own" on public.trades
  for insert
  with check (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = trades.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "trades_update_own" on public.trades
  for update
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = trades.trading_account_id
        and ta.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = trades.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "trades_delete_own" on public.trades
  for delete
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = trades.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

-- open_positions
alter table if exists public.open_positions
  add column if not exists trading_account_id uuid;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='open_positions' and column_name='connection_id'
  ) then
    update public.open_positions op
    set trading_account_id = mc.trading_account_id
    from public.mt5_connections mc
    where op.connection_id = mc.id
      and op.trading_account_id is null;
  end if;
end $$;

alter table public.open_positions
  alter column trading_account_id set not null;


do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='open_positions' and constraint_name='open_positions_connection_id_fkey'
  ) then
    execute 'alter table public.open_positions drop constraint open_positions_connection_id_fkey';
  end if;
exception when undefined_object then null;
end $$;

alter table if exists public.open_positions
  drop column if exists connection_id;


do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='open_positions' and constraint_name='open_positions_trading_account_id_fkey'
  ) then
    execute 'alter table public.open_positions add constraint open_positions_trading_account_id_fkey foreign key (trading_account_id) references public.trading_accounts(id) on delete cascade';
  end if;
end $$;

-- Ajustar unique antiga

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='open_positions' and constraint_type='UNIQUE' and constraint_name='open_positions_connection_id_ticket_key'
  ) then
    execute 'alter table public.open_positions drop constraint open_positions_connection_id_ticket_key';
  end if;
exception when undefined_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='open_positions' and constraint_type='UNIQUE' and constraint_name='open_positions_trading_account_id_ticket_key'
  ) then
    execute 'alter table public.open_positions add constraint open_positions_trading_account_id_ticket_key unique (trading_account_id, ticket)';
  end if;
end $$;

create index if not exists open_positions_trading_account_id_updated_at_idx on public.open_positions(trading_account_id, updated_at desc);

alter table public.open_positions enable row level security;

do $$
begin
  create policy "open_positions_select_own" on public.open_positions
  for select
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = open_positions.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "open_positions_insert_own" on public.open_positions
  for insert
  with check (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = open_positions.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "open_positions_update_own" on public.open_positions
  for update
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = open_positions.trading_account_id
        and ta.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = open_positions.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "open_positions_delete_own" on public.open_positions
  for delete
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = open_positions.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

-- account_snapshots
alter table if exists public.account_snapshots
  add column if not exists trading_account_id uuid;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='account_snapshots' and column_name='connection_id'
  ) then
    update public.account_snapshots s
    set trading_account_id = mc.trading_account_id
    from public.mt5_connections mc
    where s.connection_id = mc.id
      and s.trading_account_id is null;
  end if;
end $$;

alter table public.account_snapshots
  alter column trading_account_id set not null;


do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='account_snapshots' and constraint_name='account_snapshots_connection_id_fkey'
  ) then
    execute 'alter table public.account_snapshots drop constraint account_snapshots_connection_id_fkey';
  end if;
exception when undefined_object then null;
end $$;

alter table if exists public.account_snapshots
  drop column if exists connection_id;


do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='account_snapshots' and constraint_name='account_snapshots_trading_account_id_fkey'
  ) then
    execute 'alter table public.account_snapshots add constraint account_snapshots_trading_account_id_fkey foreign key (trading_account_id) references public.trading_accounts(id) on delete cascade';
  end if;
end $$;

-- Ajustar unique antiga

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='account_snapshots' and constraint_type='UNIQUE' and constraint_name='account_snapshots_connection_id_date_key'
  ) then
    execute 'alter table public.account_snapshots drop constraint account_snapshots_connection_id_date_key';
  end if;
exception when undefined_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='account_snapshots' and constraint_type='UNIQUE' and constraint_name='account_snapshots_trading_account_id_date_key'
  ) then
    execute 'alter table public.account_snapshots add constraint account_snapshots_trading_account_id_date_key unique (trading_account_id, date)';
  end if;
end $$;

create index if not exists account_snapshots_trading_account_id_date_idx on public.account_snapshots(trading_account_id, date desc);

alter table public.account_snapshots enable row level security;

do $$
begin
  create policy "account_snapshots_select_own" on public.account_snapshots
  for select
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = account_snapshots.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "account_snapshots_insert_own" on public.account_snapshots
  for insert
  with check (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = account_snapshots.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "account_snapshots_update_own" on public.account_snapshots
  for update
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = account_snapshots.trading_account_id
        and ta.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = account_snapshots.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "account_snapshots_delete_own" on public.account_snapshots
  for delete
  using (
    exists (
      select 1 from public.trading_accounts ta
      where ta.id = account_snapshots.trading_account_id
        and ta.user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

commit;
