import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function PricingPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { plans, subscription, isLoading } = useSubscriptionPlan();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const billingEnabled = isBillingEnabled();
  const currentPlanId = subscription?.plan_id;

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
      toast({ title: 'Sessão necessária', description: 'Faça login novamente antes de assinar.', variant: 'destructive' });
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
        <button onClick={() => navigate('/settings')} className="pill-btn">
          <CreditCard className="w-4 h-4" />
          Billing
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
