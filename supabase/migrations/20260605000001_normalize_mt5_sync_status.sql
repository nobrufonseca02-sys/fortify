-- Normalize MT5 sync status values across local and remote histories.
-- Older migrations used "success"; a later local script used "completed".

ALTER TABLE public.mt5_connections
  DROP CONSTRAINT IF EXISTS mt5_connections_sync_status_check;

UPDATE public.mt5_connections
SET sync_status = 'success'
WHERE sync_status = 'completed';

ALTER TABLE public.mt5_connections
  ADD CONSTRAINT mt5_connections_sync_status_check
  CHECK (sync_status IN ('idle', 'queued', 'running', 'success', 'completed', 'error'));
