
-- Rule definition types enum
CREATE TYPE public.rule_definition_key AS ENUM (
  'max_daily_loss',
  'max_total_loss',
  'trailing_drawdown',
  'floating_loss_limit',
  'profit_target',
  'min_trading_days',
  'profitable_days',
  'consistency_best_day_cap',
  'inactivity_limit',
  'news_restriction',
  'scalping_restriction',
  'weekend_holding',
  'payout_eligibility',
  'profit_split',
  'payout_frequency',
  'leverage_limit'
);

CREATE TYPE public.prop_firm_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.prop_firm_category AS ENUM ('forex', 'futures', 'multi_asset');
CREATE TYPE public.rule_set_status AS ENUM ('active', 'archived', 'draft');
CREATE TYPE public.rule_mode AS ENUM ('percent', 'value');

-- 1. Prop Firms
CREATE TABLE public.prop_firms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website TEXT,
  category public.prop_firm_category NOT NULL DEFAULT 'forex',
  status public.prop_firm_status NOT NULL DEFAULT 'active',
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Programs
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prop_firm_id UUID NOT NULL REFERENCES public.prop_firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  market_type TEXT NOT NULL DEFAULT 'forex',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Rule Set Versions
CREATE TABLE public.rule_set_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  source_url TEXT,
  status public.rule_set_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Rule Definitions (catalog)
CREATE TABLE public.rule_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key public.rule_definition_key NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'risk',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Rule Instances
CREATE TABLE public.rule_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_set_version_id UUID NOT NULL REFERENCES public.rule_set_versions(id) ON DELETE CASCADE,
  rule_definition_id UUID NOT NULL REFERENCES public.rule_definitions(id) ON DELETE CASCADE,
  mode public.rule_mode NOT NULL DEFAULT 'percent',
  base_calculation TEXT DEFAULT 'initial_balance',
  includes_floating BOOLEAN NOT NULL DEFAULT false,
  daily_reset BOOLEAN NOT NULL DEFAULT false,
  limit_value NUMERIC NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'hard',
  enabled BOOLEAN NOT NULL DEFAULT true,
  params JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables (public read for library data)
ALTER TABLE public.prop_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_set_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_instances ENABLE ROW LEVEL SECURITY;

-- Public read policies (library is public data)
CREATE POLICY "Anyone can read prop_firms" ON public.prop_firms FOR SELECT USING (true);
CREATE POLICY "Anyone can read programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Anyone can read rule_set_versions" ON public.rule_set_versions FOR SELECT USING (true);
CREATE POLICY "Anyone can read rule_definitions" ON public.rule_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can read rule_instances" ON public.rule_instances FOR SELECT USING (true);
