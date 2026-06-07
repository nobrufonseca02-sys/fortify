import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionPlan, type FortifyPlan } from '@/hooks/useSubscriptionPlan';
import { createCheckoutSession, isBillingEnabled } from '@/lib/billing';
import { toast } from '@/hooks/use-toast';

function formatPrice(plan: FortifyPlan) {
  const amount = plan.price_amount ?? plan.price_cents;
  if (plan.id === 'beta_free') return 'Beta';
  if (!amount) return 'Preço a definir';
  return `${(amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })}/${plan.billing_interval || 'mês'}`;
}

function planUseCase(plan: FortifyPlan) {
  const id = String(plan.slug || plan.id).toLowerCase();
  if (id.includes('annual')) return 'Melhor para traders que ja validaram o fluxo e querem operar varias contas.';
  if (id.includes('vip')) return 'Melhor para clientes com operacao multi-conta e acompanhamento mais amplo.';
  if (id.includes('monthly')) return 'Melhor para comecar com monitoramento profissional sem compromisso anual.';
  if (id.includes('beta')) return 'Acesso inicial controlado para testar MT5, regras e sync real.';
  return 'Monitoramento Fortify com limite de contas definido pelo plano.';
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { plans, subscription, isLoading } = useSubscriptionPlan();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [resumeAttempted, setResumeAttempted] = useState(false);
  const billingEnabled = isBillingEnabled();
  const currentPlanId = subscription?.plan_id;
  const intendedPlan = useMemo(
    () => searchParams.get('checkoutPlan') || window.sessionStorage.getItem('fortify_intended_plan'),
    [searchParams],
  );

  const startCheckout = async (plan: FortifyPlan) => {
    if (plan.id === 'beta_free') {
      toast({ title: 'Plano beta', description: 'Seu acesso beta é liberado pelo Fortify, sem checkout Stripe.' });
      return;
    }
    if (!billingEnabled) {
      toast({ title: 'Billing desativado', description: 'Ative VITE_BILLING_ENABLED e configure Stripe no gateway para usar checkout.', variant: 'destructive' });
      return;
    }
    if (!session?.access_token) {
      window.sessionStorage.setItem('fortify_intended_plan', plan.slug || plan.id);
      toast({ title: 'Sessao necessaria', description: 'Entre ou crie sua conta para continuar o checkout.' });
      navigate('/auth');
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

  useEffect(() => {
    if (resumeAttempted || !session?.access_token || !intendedPlan || plans.length === 0) return;
    const plan = plans.find((item) => item.id === intendedPlan || item.slug === intendedPlan);
    if (!plan || plan.id === currentPlanId) {
      window.sessionStorage.removeItem('fortify_intended_plan');
      return;
    }

    setResumeAttempted(true);
    window.sessionStorage.removeItem('fortify_intended_plan');
    startCheckout(plan);
  }, [currentPlanId, intendedPlan, plans, resumeAttempted, session?.access_token]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="rounded-2xl hero-surface edge-top p-7 md:p-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Billing · Fortify SaaS</p>
          <h1 className="display-editorial-sm text-gradient-steel">Planos <span className="text-gradient-primary">Fortify</span></h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 max-w-md leading-relaxed">
            Escolha o limite de contas MT5 que cada cliente pode monitorar. O checkout é processado pelo Stripe pelo backend seguro do Fortify.
          </p>
        </div>
        <button onClick={() => (session ? navigate('/settings') : navigate('/auth'))} className="pill-btn">
          <CreditCard className="w-4 h-4" />
          {session ? 'Billing' : 'Entrar'}
        </button>
      </div>

      {!billingEnabled && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">Checkout Stripe desativado localmente</p>
          <p className="text-xs text-muted-foreground mt-1">
            Configure `VITE_BILLING_ENABLED=true` no frontend e `STRIPE_SECRET_KEY` no gateway para criar sessões reais.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(isLoading ? [] : plans).map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const isBusy = busyPlan === plan.id;
          return (
            <section key={plan.id} className="rounded-xl border border-border bg-card p-5 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{plan.name || plan.plan_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatPrice(plan)}</p>
                </div>
                {isCurrent ? <CheckCircle2 className="w-5 h-5 text-success" /> : <ShieldCheck className="w-5 h-5 text-primary" />}
              </div>

              <div>
                <p className="font-mono text-3xl font-bold text-foreground">{plan.account_limit}</p>
                <p className="text-xs text-muted-foreground mt-1">conta{plan.account_limit === 1 ? '' : 's'} MT5 em monitoramento</p>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p>Conexão MT5 via MetaApi</p>
                <p>Sync de snapshots, posições e trades</p>
                <p>Regras e plano de risco por conta</p>
                <p>{planUseCase(plan)}</p>
              </div>

              <button
                type="button"
                disabled={isCurrent || isBusy || (plan.id !== 'beta_free' && !billingEnabled)}
                onClick={() => startCheckout(plan)}
                className={`w-full pill-btn ${isCurrent ? '' : 'pill-btn-primary'} justify-center disabled:opacity-50 disabled:pointer-events-none`}
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isCurrent ? 'Plano atual' : plan.id === 'beta_free' ? 'Solicitar beta' : 'Assinar'}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
