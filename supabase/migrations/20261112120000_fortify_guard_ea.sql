-- Fortify Guard: EA do MetaTrader 5 que mostra ao vivo as regras da mesa.
--
-- ea_access_tokens: a chave que o trader cola no EA. Guardamos só o hash
-- (sha256); a chave em texto aparece uma única vez, na hora de gerar. Uma conta
-- tem no máximo uma chave ativa. Na primeira conexão a chave fica presa ao login
-- MT5 que a usou, para não servir em outra conta.
--
-- ea_rule_preferences: quais regras da mesa o trader quer ver no EA e em que
-- percentual do limite os avisos aparecem.

CREATE TABLE IF NOT EXISTS public.ea_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  trading_account_id uuid NOT NULL REFERENCES public.trading_accounts (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  bound_mt5_login text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ea_access_tokens_one_active_per_account
  ON public.ea_access_tokens (trading_account_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.ea_access_tokens ENABLE ROW LEVEL SECURITY;

-- O dono vê o estado da chave (prefixo, último uso). Gerar e revogar é só pelo
-- gateway (service_role), que confere plano e dono da conta.
DROP POLICY IF EXISTS "ea_access_tokens_select_own" ON public.ea_access_tokens;
CREATE POLICY "ea_access_tokens_select_own" ON public.ea_access_tokens
  FOR SELECT USING (auth.uid() = user_id);

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
