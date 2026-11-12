-- Fortify Guard: EA do MetaTrader 5 que mostra ao vivo as regras da mesa e
-- passa a ser a fonte de dados das contas (no lugar da MetaApi, por enquanto).
--
-- ea_access_tokens: a chave que o trader cola no EA, UMA por trader. Guardamos
-- só o hash (sha256); a chave em texto aparece uma única vez, ao gerar. O EA
-- reconhece cada conta MT5 pelo login.
--
-- trading_accounts.ea_*: a conta criada pela Biblioteca de Mesas fica
-- 'pending' até o EA conectar; na primeira conexão ela é ligada ao login MT5 e
-- passa a registrar operações a partir de ea_tracking_started_at.
--
-- ea_rule_preferences: fase da conta e quais regras aparecem no EA.

CREATE TABLE IF NOT EXISTS public.ea_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ea_access_tokens_one_active_per_user
  ON public.ea_access_tokens (user_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.ea_access_tokens ENABLE ROW LEVEL SECURITY;

-- O dono vê o estado da chave (prefixo, último uso). Gerar e revogar é só pelo
-- gateway (service_role), que confere o plano.
DROP POLICY IF EXISTS "ea_access_tokens_select_own" ON public.ea_access_tokens;
CREATE POLICY "ea_access_tokens_select_own" ON public.ea_access_tokens
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS ea_status text CHECK (ea_status IN ('pending', 'linked')),
  ADD COLUMN IF NOT EXISTS ea_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS ea_last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS ea_tracking_started_at timestamptz;

CREATE INDEX IF NOT EXISTS trading_accounts_ea_pending
  ON public.trading_accounts (user_id, created_at)
  WHERE ea_status = 'pending';

-- Conexão alimentada pelo EA (sem provider_account_id: as rotinas da MetaApi a ignoram).
ALTER TABLE public.mt5_connections DROP CONSTRAINT IF EXISTS mt5_connections_provider_check;
ALTER TABLE public.mt5_connections
  ADD CONSTRAINT mt5_connections_provider_check
  CHECK (provider IN ('metaapi', 'bridge', 'external', 'fortify_guard'));

CREATE TABLE IF NOT EXISTS public.ea_rule_preferences (
  trading_account_id uuid PRIMARY KEY REFERENCES public.trading_accounts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- NULL = padrão: tudo que zera a conta ou trava o saque, sem os lembretes.
  rule_keys text[],
  -- Fase da conta: muda quais regras valem (consistência do saque, fechamento de
  -- sexta no funded). NULL = o Fortify deduz pelo programa.
  account_stage text CHECK (account_stage IN ('evaluation', 'funded')),
  warning_pct numeric NOT NULL DEFAULT 70,
  critical_pct numeric NOT NULL DEFAULT 85,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ea_rule_preferences_rule_keys_valid CHECK (
    rule_keys <@ ARRAY[
      'daily_loss', 'max_drawdown', 'inactivity', 'max_lots', 'floating_loss', 'open_risk',
      'weekend', 'profit_target', 'consistency', 'min_trading_days', 'news', 'overnight'
    ]::text[]
  ),
  CONSTRAINT ea_rule_preferences_thresholds_valid CHECK (
    warning_pct >= 10 AND critical_pct <= 99 AND warning_pct < critical_pct
  )
);

ALTER TABLE public.ea_rule_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ea_rule_preferences_select_own" ON public.ea_rule_preferences;
CREATE POLICY "ea_rule_preferences_select_own" ON public.ea_rule_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ea_rule_preferences_insert_own" ON public.ea_rule_preferences;
CREATE POLICY "ea_rule_preferences_insert_own" ON public.ea_rule_preferences
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trading_accounts t
      WHERE t.id = trading_account_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ea_rule_preferences_update_own" ON public.ea_rule_preferences;
CREATE POLICY "ea_rule_preferences_update_own" ON public.ea_rule_preferences
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trading_accounts t
      WHERE t.id = trading_account_id AND t.user_id = auth.uid()
    )
  );
