-- Add multi-provider support to mt5_connections without breaking existing rows
ALTER TABLE public.mt5_connections
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'metaapi',
  ADD COLUMN IF NOT EXISTS provider_account_id text,
  ADD COLUMN IF NOT EXISTS api_mode text NOT NULL DEFAULT 'cloud',
  ADD COLUMN IF NOT EXISTS trading_account_id uuid,
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'idle';

-- Constrain provider to known values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mt5_connections_provider_check'
  ) THEN
    ALTER TABLE public.mt5_connections
      ADD CONSTRAINT mt5_connections_provider_check
      CHECK (provider IN ('metaapi','bridge'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mt5_connections_sync_status_check'
  ) THEN
    ALTER TABLE public.mt5_connections
      ADD CONSTRAINT mt5_connections_sync_status_check
      CHECK (sync_status IN ('idle','queued','running','success','error'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mt5_connections_api_mode_check'
  ) THEN
    ALTER TABLE public.mt5_connections
      ADD CONSTRAINT mt5_connections_api_mode_check
      CHECK (api_mode IN ('cloud','local'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS mt5_connections_user_idx
  ON public.mt5_connections (user_id);
CREATE INDEX IF NOT EXISTS mt5_connections_trading_account_idx
  ON public.mt5_connections (trading_account_id);
CREATE INDEX IF NOT EXISTS mt5_connections_provider_idx
  ON public.mt5_connections (provider);