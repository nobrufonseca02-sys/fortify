
-- Trading Accounts
CREATE TABLE public.trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  broker TEXT,
  prop_firm TEXT,
  account_type TEXT,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  start_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  current_equity NUMERIC NOT NULL DEFAULT 0,
  highest_equity NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  rule_set_id TEXT,
  mt5_login TEXT,
  mt5_server TEXT,
  mt5_connection_status TEXT DEFAULT 'disconnected',
  mt5_last_sync_at TIMESTAMPTZ,
  mt5_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON public.trading_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own accounts"
  ON public.trading_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON public.trading_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON public.trading_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Session Plans
CREATE TABLE public.session_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  max_risk_today NUMERIC,
  max_trades INT,
  risk_per_trade NUMERIC,
  personal_daily_stop NUMERIC,
  conservative_target NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans"
  ON public.session_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own plans"
  ON public.session_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON public.session_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON public.session_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Post Session Reviews
CREATE TABLE public.post_session_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  session_plan_id UUID REFERENCES public.session_plans(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  result NUMERIC,
  plan_adherence TEXT,
  operational_error TEXT,
  emotional_error TEXT,
  session_rating INT CHECK (session_rating >= 1 AND session_rating <= 10),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_session_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews"
  ON public.post_session_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reviews"
  ON public.post_session_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.post_session_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.post_session_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Account Daily Snapshots
CREATE TABLE public.account_daily_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trading_account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  balance NUMERIC,
  equity NUMERIC,
  daily_pnl NUMERIC,
  floating_pnl NUMERIC,
  drawdown NUMERIC,
  max_balance NUMERIC,
  used_daily_loss_pct NUMERIC,
  used_total_loss_pct NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trading_account_id, date)
);

ALTER TABLE public.account_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON public.account_daily_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own snapshots"
  ON public.account_daily_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_trading_accounts_updated_at
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_plans_updated_at
  BEFORE UPDATE ON public.session_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_session_reviews_updated_at
  BEFORE UPDATE ON public.post_session_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX idx_session_plans_user_date ON public.session_plans(user_id, date);
CREATE INDEX idx_post_session_reviews_user_date ON public.post_session_reviews(user_id, date);
CREATE INDEX idx_account_daily_snapshots_account_date ON public.account_daily_snapshots(trading_account_id, date);
