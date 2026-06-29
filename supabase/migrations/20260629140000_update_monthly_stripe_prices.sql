-- Update active Fortify monthly plan pricing and Stripe Price mappings.
-- This is additive/idempotent and keeps existing plan/account limits unchanged.

update public.plans
set
  stripe_price_id = 'price_1TfjleFCCIFbGAWBPkdIZmN0',
  price_amount = 9700,
  price_cents = 9700,
  currency = 'brl',
  billing_interval = 'month',
  account_limit = 1,
  updated_at = now()
where id = 'beginner_monthly';

update public.plans
set
  stripe_price_id = 'price_1TniUnFCCIFbGAWBH4vzK1GB',
  price_amount = 29700,
  price_cents = 29700,
  currency = 'brl',
  billing_interval = 'month',
  account_limit = 3,
  updated_at = now()
where id = 'advanced_monthly';

update public.plans
set
  stripe_price_id = 'price_1TfjqlFCCIFbGAWBcYnlMkpB',
  price_amount = 49700,
  price_cents = 49700,
  currency = 'brl',
  billing_interval = 'month',
  account_limit = 5,
  updated_at = now()
where id = 'pro_monthly';

update public.plans
set
  stripe_price_id = 'price_1TniUpFCCIFbGAWBZIbcUoXN',
  price_amount = 84700,
  price_cents = 84700,
  currency = 'brl',
  billing_interval = 'month',
  account_limit = 10,
  updated_at = now()
where id = 'enterprise_monthly';
