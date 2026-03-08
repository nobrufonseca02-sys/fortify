
-- MT5 Connection Status enum
CREATE TYPE public.mt5_connection_status AS ENUM (
  'disconnected',
  'connecting',
  'connected',
  'auth_error',
  'syncing'
);

-- MT5 Connections table
CREATE TABLE public.mt5_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL,
  mt5_login TEXT NOT NULL,
  mt5_server TEXT NOT NULL,
  broker_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'demo',
  prop_firm TEXT,
  connection_status public.mt5_connection_status NOT NULL DEFAULT 'disconnected',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mt5_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own mt5_connections"
  ON public.mt5_connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mt5_connections"
  ON public.mt5_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mt5_connections"
  ON public.mt5_connections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mt5_connections"
  ON public.mt5_connections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trades table
CREATE TABLE public.mt5_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.mt5_connections(id) ON DELETE CASCADE NOT NULL,
  ticket BIGINT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0,
  open_time TIMESTAMP WITH TIME ZONE NOT NULL,
  close_time TIMESTAMP WITH TIME ZONE,
  open_price NUMERIC NOT NULL DEFAULT 0,
  close_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  profit NUMERIC NOT NULL DEFAULT 0,
  swap NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id, ticket)
);

ALTER TABLE public.mt5_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trades"
  ON public.mt5_trades FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mt5_connections c WHERE c.id = connection_id AND c.user_id = auth.uid()
  ));

-- Positions table
CREATE TABLE public.mt5_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.mt5_connections(id) ON DELETE CASCADE NOT NULL,
  ticket BIGINT NOT NULL,
  symbol TEXT NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0,
  open_price NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC NOT NULL DEFAULT 0,
  floating_pnl NUMERIC NOT NULL DEFAULT 0,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id, ticket)
);

ALTER TABLE public.mt5_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own positions"
  ON public.mt5_positions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mt5_connections c WHERE c.id = connection_id AND c.user_id = auth.uid()
  ));

-- Account Snapshots table
CREATE TABLE public.mt5_account_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.mt5_connections(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  equity NUMERIC NOT NULL DEFAULT 0,
  daily_pnl NUMERIC NOT NULL DEFAULT 0,
  floating_pnl NUMERIC NOT NULL DEFAULT 0,
  drawdown NUMERIC NOT NULL DEFAULT 0,
  max_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id, date)
);

ALTER TABLE public.mt5_account_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON public.mt5_account_snapshots FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mt5_connections c WHERE c.id = connection_id AND c.user_id = auth.uid()
  ));

-- Enable realtime for positions and snapshots
ALTER PUBLICATION supabase_realtime ADD TABLE public.mt5_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mt5_account_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mt5_connections;
