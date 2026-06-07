import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { useAuth } from '@/hooks/useAuth';
import { createPortalSession, isBillingEnabled } from '@/lib/billing';
import { toast } from '@/hooks/use-toast';

export function PlanStatusPanel({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [openingPortal, setOpeningPortal] = useState(false);
  const {
    subscription,
    plans,
    accountLimit,
    activeAccountCount,
    remainingAccounts,
    hasActivePlan,
    isLoading,
    error,
  } = useSubscriptionPlan();

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Carregando plano Fortify...</p>
      </section>
    );
  }

  const statusIcon = hasActivePlan ? CheckCircle2 : AlertTriangle;
  const StatusIcon = statusIcon;
  const billingEnabled = isBillingEnabled();

  const openBillingPortal = async () => {
    if (!session?.access_token) {
      toast({ title: 'Sessão necessária', description: 'Faça login novamente para gerenciar cobrança.', variant: 'destructive' });
      return;
    }
    setOpeningPortal(true);
    try {
      const portal = await createPortalSession(session.access_token);
      window.location.assign(portal.portal_url);
    } catch (error: any) {
      toast({ title: 'Portal indisponível', description: error?.message || 'Assine um plano pago antes de abrir o portal Stripe.', variant: 'destructive' });
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${hasActivePlan ? 'bg-success/10' : 'bg-warning/10'}`}>
            <StatusIcon className={`w-4 h-4 ${hasActivePlan ? 'text-success' : 'text-warning'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {hasActivePlan ? `Plano ${subscription?.plan_name || 'ativo'}` : 'Plano Fortify necessário'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasActivePlan
                ? `${activeAccountCount}/${accountLimit} contas MT5 em monitoramento. Restam ${remainingAccounts}.`
                : 'Escolha um plano ou solicite acesso beta antes de conectar uma nova conta MT5.'}
            </p>
            {error ? (
              <p className="text-xs text-destructive mt-1">Não foi possível validar o plano. Recarregue a sessão ou revise o Supabase.</p>
            ) : null}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          <CreditCard className="w-3 h-3" />
          SaaS
        </div>
      </div>

      {!compact && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => navigate('/pricing')} className="pill-btn pill-btn-primary">
              <CreditCard className="w-4 h-4" />
              Ver planos
            </button>
            {subscription?.stripe_customer_id ? (
              <button type="button" onClick={openBillingPortal} disabled={openingPortal || !billingEnabled} className="pill-btn">
                {openingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Gerenciar cobrança
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs font-semibold text-foreground">{plan.name || plan.plan_name}</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Até {plan.account_limit} conta{plan.account_limit === 1 ? '' : 's'} MT5.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {plan.id === 'beta_free'
                    ? 'Acesso beta'
                    : (plan.price_amount ?? plan.price_cents)
                      ? `${(Number((plan.price_amount ?? plan.price_cents) || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })}/${plan.billing_interval}`
                      : 'Preço a definir'}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
