import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { useAuth } from '@/hooks/useAuth';
import { createPortalSession, isBillingEnabled } from '@/lib/billing';
import { toast } from '@/hooks/use-toast';

const supportLabels: Record<string, string> = {
  basic: 'Suporte básico',
  standard: 'Suporte padrão',
  priority: 'Suporte prioritário',
  enterprise: 'Suporte VIP/Enterprise',
};

function formatPlanPrice(plan: any) {
  if (plan.id === 'beta_free') return 'Acesso beta';
  const amount = Number((plan.price_amount ?? plan.price_cents) || 0);
  if (!amount) return 'Preço a confirmar';
  return `${(amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: String(plan.currency || 'brl').toUpperCase() })}/${plan.billing_interval === 'year' ? 'ano' : 'mês'}`;
}

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
      toast({ title: 'Portal indisponível', description: error?.message || 'Você ainda não possui uma assinatura ativa. Escolha um plano para começar.', variant: 'destructive' });
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-2.5">
        <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${hasActivePlan ? 'text-success' : 'text-warning'}`} aria-hidden="true" />
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
                Gerenciar assinatura
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
                  {formatPlanPrice(plan)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {supportLabels[String(plan.support_tier || 'basic')] || supportLabels.basic}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
