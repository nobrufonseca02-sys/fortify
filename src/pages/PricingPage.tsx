import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionPlan, type FortifyPlan } from '@/hooks/useSubscriptionPlan';
import { createCheckoutSession, createPortalSession, isBillingEnabled } from '@/lib/billing';
import { toast } from '@/hooks/use-toast';

type Interval = 'month' | 'year';

const supportLabels: Record<string, string> = {
  basic: 'Suporte básico',
  standard: 'Suporte padrão',
  priority: 'Suporte prioritário',
  enterprise: 'Suporte VIP/Enterprise',
};

const bestFor: Record<string, string> = {
  beginner: 'Melhor para validar a primeira conta com controle de risco.',
  advanced: 'Melhor para traders com até três contas em acompanhamento.',
  pro: 'Melhor para operação séria com suporte prioritário.',
  enterprise: 'Melhor para operação multi-conta com suporte VIP.',
};

function planFamily(plan: FortifyPlan) {
  const slug = String(plan.slug || plan.id).toLowerCase();
  if (slug.includes('enterprise')) return 'enterprise';
  if (slug.includes('advanced')) return 'advanced';
  if (slug.includes('pro')) return 'pro';
  if (slug.includes('beginner')) return 'beginner';
  return slug;
}

function formatPrice(plan: FortifyPlan) {
  const amount = Number(plan.price_amount ?? plan.price_cents ?? 0);
  if (plan.id === 'beta_free') return 'Beta';
  if (!amount) return 'Preço a confirmar';
  return (amount / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: String(plan.currency || 'brl').toUpperCase(),
  });
}

function intervalLabel(interval?: string | null) {
  return interval === 'year' ? 'ano' : 'mês';
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { plans, subscription, isLoading } = useSubscriptionPlan();
  const [interval, setInterval] = useState<Interval>('month');
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [resumeAttempted, setResumeAttempted] = useState(false);
  const billingEnabled = isBillingEnabled();
  const currentPlanId = subscription?.plan_id;
  const currentPlan = plans.find((plan) => plan.id === currentPlanId || plan.slug === currentPlanId);
  const currentIsEnterprise = currentPlan ? planFamily(currentPlan) === 'enterprise' : false;
  const checkoutCanceled = searchParams.get('checkout') === 'cancel';
  const intendedPlan = useMemo(
    () => searchParams.get('checkoutPlan') || window.sessionStorage.getItem('intended_plan_slug') || window.sessionStorage.getItem('fortify_intended_plan'),
    [searchParams],
  );

  const visiblePlans = useMemo(() => {
    const paid = plans.filter((plan) => plan.id !== 'beta_free');
    const filtered = paid.filter((plan) => plan.billing_interval === interval);
    return filtered.length > 0 ? filtered : paid;
  }, [interval, plans]);

  const startCheckout = async (plan: FortifyPlan) => {
    if (plan.id === 'beta_free') {
      toast({ title: 'Plano beta', description: 'Seu acesso beta é liberado pelo Fortify, sem checkout Stripe.' });
      return;
    }

    if (!session?.access_token) {
      window.sessionStorage.setItem('fortify_intended_plan', plan.slug || plan.id);
      window.sessionStorage.setItem('intended_plan_slug', plan.slug || plan.id);
      toast({ title: 'Sessão necessária', description: 'Entre ou crie sua conta para continuar o checkout.' });
      navigate('/auth');
      return;
    }

    if (!billingEnabled) {
      toast({ title: 'Checkout desativado', description: 'Ative VITE_BILLING_ENABLED e configure Stripe no gateway.', variant: 'destructive' });
      return;
    }

    setBusyPlan(plan.id);
    try {
      const checkout = await createCheckoutSession(plan.slug || plan.id, session.access_token);
      window.location.assign(checkout.checkout_url);
    } catch (error: any) {
      toast({ title: 'Checkout indisponível', description: error?.message || 'Revise a configuração Stripe do gateway.', variant: 'destructive' });
    } finally {
      setBusyPlan(null);
    }
  };

  const openPortal = async () => {
    if (!session?.access_token) {
      navigate('/auth');
      return;
    }
    setOpeningPortal(true);
    try {
      const portal = await createPortalSession(session.access_token);
      window.location.assign(portal.portal_url);
    } catch (error: any) {
      toast({ title: 'Portal indisponível', description: error?.message || 'Escolha um plano para começar.', variant: 'destructive' });
    } finally {
      setOpeningPortal(false);
    }
  };

  useEffect(() => {
    if (resumeAttempted || !session?.access_token || !intendedPlan || plans.length === 0) return;
    const plan = plans.find((item) => item.id === intendedPlan || item.slug === intendedPlan);
    if (!plan || plan.id === currentPlanId) {
      window.sessionStorage.removeItem('fortify_intended_plan');
      window.sessionStorage.removeItem('intended_plan_slug');
      return;
    }

    setResumeAttempted(true);
    window.sessionStorage.removeItem('fortify_intended_plan');
    window.sessionStorage.removeItem('intended_plan_slug');
    startCheckout(plan);
  }, [currentPlanId, intendedPlan, plans, resumeAttempted, session?.access_token]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="rounded-2xl hero-surface edge-top p-7 md:p-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Planos Fortify</p>
          <h1 className="display-editorial-sm text-gradient-steel">Escolha o plano da sua operação</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 max-w-xl leading-relaxed">
            Pagamento processado com segurança pela Stripe. Após a confirmação, seu plano é ativado automaticamente e você pode gerenciar sua assinatura nas configurações.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {subscription?.stripe_customer_id ? (
            <Button variant="outline" onClick={openPortal} disabled={openingPortal} className="gap-2">
              {openingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Gerenciar assinatura
            </Button>
          ) : null}
          {currentIsEnterprise ? null : (
            <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Fazer upgrade
            </Button>
          )}
        </div>
      </div>

      {checkoutCanceled && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">Pagamento cancelado. Você pode escolher outro plano quando quiser.</p>
        </div>
      )}

      {!billingEnabled && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">Checkout Stripe desativado localmente</p>
          <p className="text-xs text-muted-foreground mt-1">
            Configure `VITE_BILLING_ENABLED=true` no frontend e `STRIPE_SECRET_KEY` no gateway para criar sessões reais.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={interval} onValueChange={(value) => setInterval(value as Interval)}>
          <TabsList>
            <TabsTrigger value="month">Mensal</TabsTrigger>
            <TabsTrigger value="year">Anual</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Você pode gerenciar sua assinatura nas configurações.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(isLoading ? [] : visiblePlans).map((plan) => {
          const family = planFamily(plan);
          const isCurrent = currentPlanId === plan.id;
          const isBusy = busyPlan === plan.id;
          const support = supportLabels[String(plan.support_tier || 'basic')] || supportLabels.basic;
          const features = Array.isArray(plan.plan_features) && plan.plan_features.length > 0
            ? plan.plan_features
            : [`Até ${plan.account_limit} conta${plan.account_limit === 1 ? '' : 's'} MT5`, support, 'Regras e alertas Fortify'];

          return (
            <section key={plan.id} className={`rounded-xl border bg-card p-5 space-y-5 ${plan.highlighted ? 'border-primary/50 shadow-lg shadow-primary/5' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{plan.name || plan.plan_name}</p>
                    {plan.recommended_badge ? <Badge className="bg-primary/15 text-primary border-0">{plan.recommended_badge}</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{bestFor[family] || 'Plano Fortify para monitoramento profissional.'}</p>
                </div>
                {isCurrent ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> : <ShieldCheck className="w-5 h-5 text-primary shrink-0" />}
              </div>

              <div>
                <p className="font-mono text-3xl font-bold text-foreground">{formatPrice(plan)}</p>
                <p className="text-xs text-muted-foreground mt-1">por {intervalLabel(plan.billing_interval)}</p>
              </div>

              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <p className="text-xs font-medium text-foreground">Até {plan.account_limit} conta{plan.account_limit === 1 ? '' : 's'} MT5</p>
                <p className="text-xs text-muted-foreground mt-1">{support}</p>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground min-h-[96px]">
                {features.map((feature) => (
                  <p key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </p>
                ))}
              </div>

              <Button
                type="button"
                disabled={isCurrent || isBusy || (plan.id !== 'beta_free' && !billingEnabled)}
                onClick={() => subscription?.stripe_customer_id && !isCurrent ? openPortal() : startCheckout(plan)}
                className="w-full gap-2"
                variant={plan.highlighted ? 'premium' : 'default'}
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isCurrent ? 'Plano atual' : subscription?.stripe_customer_id ? 'Gerenciar assinatura' : 'Assinar'}
              </Button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
