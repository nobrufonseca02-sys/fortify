-- Lets a manually-granted subscription (no real Stripe subscription behind it) schedule a
-- downgrade that applies automatically once its paid_until date is reached — the local
-- equivalent of Stripe's cancel_at_period_end, since there's no Stripe subscription to
-- schedule it against. Additive only.

alter table public.user_subscriptions
  add column if not exists pending_plan_id text references public.plans(id);
