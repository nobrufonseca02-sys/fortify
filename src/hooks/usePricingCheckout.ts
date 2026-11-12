import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AUTH_SIGNUP_PATH } from '@/components/landing/PublicShell';
import { useSubscriptionPlan, type FortifyPlan } from '@/hooks/useSubscriptionPlan';
import {
  createAddonCheckoutSession,
  createCheckoutSession,
  createGuestCheckoutSession,
  isBillingEnabled,
} from '@/lib/billing';
import { hasMarketingConsent, trackBeginCheckout, trackSelectPlan } from '@/lib/analytics';
import { toast } from '@/hooks/use-toast';
import {
  SEMESTER_INTERVAL,
  SEMESTRAL_SOB_CONSULTA,
  hasConfiguredPrice,
  isAddonPlan,
  isCommercialPlan,
  isValidStripePrice,
  planFamily,
  semestraisProntosParaVenda,
  type IntervaloCobranca,
} from '@/lib/pricingCatalog';

export type PlanAction = {
  label: string;
  disabled: boolean;
  disabledReason: string;
  busy: boolean;
  isCurrent: boolean;
  onClick: () => void;
};

/**
 * Catálogo, estado e checkout da tela de planos. Um hook só serve a tela do
 * produto (/pricing logado) e a página pública (/vendas/planos e /pricing
 * deslogado): preço, limite de contas e checkout continuam vindo de um lugar.
 *
 * O checkout é uma sessão Stripe criada pelo gateway, que exige JWT do
 * Supabase. Sem sessão o botão guarda o plano escolhido e manda para /auth;
 * ao voltar, o checkout retoma sozinho na mesma página de onde saiu.
 */
export function usePricingCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const {
    plans,
    subscription,
    isLoading,
    extraAccountQuantity,
    accountLimit,
    activeAccountCount,
    hasActivePlan,
  } = useSubscriptionPlan();
  const semestraisLiberados = useMemo(() => semestraisProntosParaVenda(plans), [plans]);
  // Mensal continua sendo o padrão: o semestral é upsell, não pedágio de entrada.
  const [intervalo, setIntervalo] = useState<IntervaloCobranca>('month');
  const intervaloEfetivo: IntervaloCobranca = semestraisLiberados ? intervalo : 'month';
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [busyAddon, setBusyAddon] = useState(false);
  const [resumeAttempted, setResumeAttempted] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const billingEnabled = isBillingEnabled();
  const currentPlanId = subscription?.plan_id;
  // Matches the gateway's own gates (findBaseSubscriptionForAddon / create-portal-session):
  // both only require an active, unexpired subscription with a Stripe customer attached —
  // stripe_subscription_id can be null for manually-granted plans, so it must not be required here.
  const hasActivePaidStripeSubscription = Boolean(
    hasActivePlan &&
    subscription?.stripe_customer_id &&
    subscription.plan_id !== 'beta_free',
  );
  const intendedPlan = useMemo(
    () => searchParams.get('checkoutPlan') || window.sessionStorage.getItem('intended_plan_slug') || window.sessionStorage.getItem('fortify_intended_plan'),
    [searchParams],
  );

  const visiblePlans = useMemo(() => {
    return plans.filter((plan) => (
      isCommercialPlan(plan) &&
      plan.billing_interval === intervaloEfetivo &&
      !isAddonPlan(plan) &&
      hasConfiguredPrice(plan)
    ));
  }, [plans, intervaloEfetivo]);

  /** Mensal de cada família: base para mostrar a economia do semestral. */
  const mensalPorFamilia = useMemo(() => {
    const mapa = new Map<string, FortifyPlan>();
    for (const plan of plans) {
      if (isCommercialPlan(plan) && plan.billing_interval === 'month') mapa.set(planFamily(plan), plan);
    }
    return mapa;
  }, [plans]);

  /**
   * No semestral, a família sem checkout configurado (hoje só pode ser o Pro)
   * vira card "A consultar". Assim que a linha semestral dela ganha Price ID
   * no banco, ela entra em visiblePlans com preço e este card some sozinho.
   * O card usa o mensal da família só para mostrar limite de contas e suporte.
   */
  const planosSobConsulta = useMemo(() => {
    if (intervaloEfetivo !== SEMESTER_INTERVAL) return [];
    const familiasComCheckout = new Set(visiblePlans.map((plan) => planFamily(plan)));
    return SEMESTRAL_SOB_CONSULTA
      .filter((familia) => !familiasComCheckout.has(familia))
      .map((familia) => mensalPorFamilia.get(familia))
      .filter((plan): plan is FortifyPlan => Boolean(plan));
  }, [intervaloEfetivo, mensalPorFamilia, visiblePlans]);

  const addonPlan = useMemo(
    () => plans.find((plan) => isAddonPlan(plan)) ?? null,
    [plans],
  );

  const startCheckout = async (plan: FortifyPlan) => {
    const planSelector = plan.slug || plan.id;
    setCheckoutError(null);
    setCheckoutNotice(null);

    if (plan.id === 'beta_free') {
      const message = 'Seu acesso beta é liberado pelo Fortify, sem checkout Stripe.';
      setCheckoutNotice(message);
      toast({ title: 'Plano beta', description: message });
      return;
    }

    // Dispara antes de qualquer ramificação: é o mesmo passo do funil tanto
    // para quem vai ao cadastro quanto para quem segue direto ao checkout.
    trackSelectPlan({
      slug: planSelector,
      name: plan.name,
      priceCents: plan.price_amount,
      currency: plan.currency,
      autenticado: Boolean(session?.access_token),
    });

    if (!hasConfiguredPrice(plan)) {
      const message = 'Este plano ainda não possui um Price ID válido da Stripe.';
      setCheckoutError(message);
      toast({ title: 'Plano indisponível', description: message, variant: 'destructive' });
      return;
    }

    if (!billingEnabled) {
      const message = 'O checkout Stripe foi desativado neste ambiente.';
      setCheckoutError(message);
      toast({ title: 'Checkout desativado', description: message, variant: 'destructive' });
      return;
    }

    setBusyPlan(plan.id);
    try {
      // Sem login, Assinar vai direto para a Stripe: a conta é criada depois do
      // pagamento, pelo e-mail usado lá (rota /checkout/sucesso).
      const checkout = session?.access_token
        ? await createCheckoutSession(planSelector, session.access_token, hasMarketingConsent())
        : await createGuestCheckoutSession(planSelector, hasMarketingConsent());
      const checkoutUrl = String(checkout.checkout_url || '');
      if (!checkoutUrl.startsWith('https://checkout.stripe.com/')) {
        throw new Error('A Stripe retornou uma URL inválida para checkout.');
      }
      window.sessionStorage.setItem('fortify_pending_plan_slug', planSelector);
      trackBeginCheckout({ slug: planSelector, name: plan.name, priceCents: plan.price_amount, currency: plan.currency });
      setCheckoutNotice('Checkout criado. Redirecionando para a Stripe...');
      window.location.href = checkoutUrl;
    } catch (error: any) {
      const message = error?.message || 'Revise a configuração Stripe do gateway.';
      console.error('Fortify checkout failed', { plan: planSelector, message });
      setCheckoutError(message);
      toast({ title: 'Checkout indisponível', description: message, variant: 'destructive' });
    } finally {
      setBusyPlan(null);
    }
  };

  const startAddonCheckout = async () => {
    setCheckoutError(null);
    setCheckoutNotice(null);

    if (!session?.access_token) {
      const message = 'Entre ou crie sua conta para adicionar contas extras.';
      setCheckoutNotice(message);
      toast({ title: 'Sessão necessária', description: message });
      navigate(AUTH_SIGNUP_PATH);
      return;
    }

    if (!hasActivePaidStripeSubscription) {
      const message = 'Você precisa ter um plano ativo para adicionar contas extras.';
      setCheckoutError(message);
      toast({ title: 'Plano necessário', description: message, variant: 'destructive' });
      return;
    }

    if (!addonPlan || !isValidStripePrice(addonPlan.stripe_price_id)) {
      const message = 'Este plano ainda não possui um Price ID válido da Stripe.';
      setCheckoutError(message);
      toast({ title: 'Conta extra indisponível', description: message, variant: 'destructive' });
      return;
    }

    if (!billingEnabled) {
      const message = 'O checkout Stripe foi desativado neste ambiente.';
      setCheckoutError(message);
      toast({ title: 'Checkout desativado', description: message, variant: 'destructive' });
      return;
    }

    setBusyAddon(true);
    try {
      const checkout = await createAddonCheckoutSession(addonPlan.slug || addonPlan.id, session.access_token);
      setCheckoutNotice('Checkout criado. Redirecionando para a Stripe...');
      window.location.href = checkout.checkout_url;
    } catch (error: any) {
      const message = error?.message || 'Revise a configuração Stripe do gateway.';
      console.error('Fortify add-on checkout failed', { plan: addonPlan.slug || addonPlan.id, message });
      setCheckoutError(message);
      toast({ title: 'Conta extra indisponível', description: message, variant: 'destructive' });
    } finally {
      setBusyAddon(false);
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

  const planAction = (plan: FortifyPlan): PlanAction => {
    const isCurrent = currentPlanId === plan.id;
    const hasValidPrice = hasConfiguredPrice(plan);
    const label = !hasValidPrice
      ? 'Indisponível'
      : isCurrent
        ? hasActivePaidStripeSubscription
          ? 'Gerenciar assinatura'
          : 'Plano atual'
        : hasActivePaidStripeSubscription
          ? 'Alterar plano'
          : 'Assinar';
    const busy = busyPlan === plan.id;
    return {
      label,
      busy,
      isCurrent,
      disabled: busy || !hasValidPrice || (isCurrent && !hasActivePaidStripeSubscription),
      disabledReason: hasValidPrice ? '' : 'Este plano ainda não possui um Price ID válido da Stripe.',
      onClick: () => {
        if (isCurrent && hasActivePaidStripeSubscription) {
          navigate('/subscription');
          return;
        }
        if (isCurrent) return;
        if (hasActivePaidStripeSubscription) {
          // Already subscribed to a different plan — route through the change-plan flow
          // instead of starting a second Checkout session (which would create a duplicate
          // Stripe subscription rather than switching plans).
          navigate(`/subscription?targetPlan=${encodeURIComponent(plan.slug || plan.id)}`);
          return;
        }
        startCheckout(plan);
      },
    };
  };

  return {
    session,
    isLoading,
    visiblePlans,
    planosSobConsulta,
    mensalPorFamilia,
    addonPlan,
    semestraisLiberados,
    intervaloEfetivo,
    setIntervalo,
    billingEnabled,
    checkoutError,
    checkoutNotice,
    busyAddon,
    hasActivePaidStripeSubscription,
    extraAccountQuantity,
    accountLimit,
    activeAccountCount,
    startAddonCheckout,
    planAction,
  };
}

export type PricingCheckout = ReturnType<typeof usePricingCheckout>;
