
ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS program text,
  ADD COLUMN IF NOT EXISTS phase text,
  ADD COLUMN IF NOT EXISTS daily_loss_limit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_loss_limit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_target numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_trading_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_loss_used numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_loss_used numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trading_days_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_trading_date date,
  ADD COLUMN IF NOT EXISTS daily_loss_reset_date date;
