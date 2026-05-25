-- Create rule_evaluations table to store computed rule results
CREATE TABLE IF NOT EXISTS public.rule_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  rule_instance_id UUID NOT NULL REFERENCES public.rule_instances(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.mt5_connections(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('APPROVING','WARNING','VIOLATED','NOT_MET')),
  current_value NUMERIC(20,6),
  limit_value NUMERIC(20,6),
  progress_pct NUMERIC(6,2) CHECK (progress_pct >= 0 AND progress_pct <= 100),
  message TEXT,
  computation_window TEXT NOT NULL CHECK (computation_window IN ('daily','total','phase','payoutWindow')),
  reference_date DATE,
  computed_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT rule_evaluations_unique_per_account_rule_date UNIQUE NULLS NOT DISTINCT (trading_account_id, rule_instance_id, reference_date)
);

-- Enable RLS on rule_evaluations
ALTER TABLE public.rule_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see evaluations for their own trading accounts
CREATE POLICY "Users can view rule evaluations for their accounts"
  ON public.rule_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_accounts
      WHERE trading_accounts.id = rule_evaluations.trading_account_id
      AND trading_accounts.user_id = auth.uid()
    )
  );

-- RLS policy: service_role has full access
CREATE POLICY "Service role full access to rule_evaluations"
  ON public.rule_evaluations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for rule_evaluations
CREATE INDEX IF NOT EXISTS rule_evaluations_trading_account_idx
  ON public.rule_evaluations (trading_account_id);
CREATE INDEX IF NOT EXISTS rule_evaluations_computed_at_idx
  ON public.rule_evaluations (computed_at DESC);
CREATE INDEX IF NOT EXISTS rule_evaluations_status_idx
  ON public.rule_evaluations (status)
  WHERE status IN ('VIOLATED','WARNING');

-- Add columns to mt5_account_snapshots for daily tracking
ALTER TABLE public.mt5_account_snapshots
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS start_of_day_balance NUMERIC(20,6),
  ADD COLUMN IF NOT EXISTS trades_count_today INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_trading_day BOOLEAN DEFAULT false;

-- Create unique index on mt5_account_snapshots (connection_id, date)
-- Note: constraint already exists from migration 20260504152605, creating index for query performance
CREATE UNIQUE INDEX IF NOT EXISTS mt5_account_snapshots_connection_date_idx
  ON public.mt5_account_snapshots (connection_id, date);
