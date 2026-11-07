-- A MetaApi cobra por hora em que a conta MT5 fica implantada (deployed).
-- O gateway passa a desimplantar as contas de quem está offline e a
-- reimplantá-las quando o usuário volta; estas duas estruturas guardam
-- quando cada usuário foi visto pela última vez e quais contas foram
-- pausadas por inatividade (separado de suspended_at, que é suspensão por
-- assinatura e tem outro ciclo de vida).

ALTER TABLE public.mt5_connections
  ADD COLUMN IF NOT EXISTS idle_undeployed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- Sem políticas: só o gateway (service_role) lê e escreve.
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
