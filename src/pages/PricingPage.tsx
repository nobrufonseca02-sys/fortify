import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { CheckCircle2, Loader2, PlusCircle, ShieldCheck, Star } from 'lucide-react';
import { PublicShell } from '@/components/landing/PublicShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionPlan, type FortifyPlan } from '@/hooks/useSubscriptionPlan';
import { createAddonCheckoutSession, createCheckoutSession, isBillingEnabled } from '@/lib/billing';
import { hasMarketingConsent, trackBeginCheckout } from '@/lib/analytics';
import { toast } from '@/hooks/use-toast';

const EXTRA_ACCOUNT_ADDON_SLUG = 'extra_account_monthly';

/**
 * O que não varia entre os planos. Sai dos cards para uma faixa única: com
 * isso cada card mostra só o que de fato distingue um plano do outro
 * (preço, limite de contas e suporte), que é o que torna a comparação rápida.
 */
const INCLUDED_IN_EVERY_PLAN = [
  'Monitoramento de perda diária, perda total e drawdown',
  'Regras versionadas e auditáveis por conta',
  'Alertas de limite crítico',
  'Biblioteca de mesas proprietárias',
  'Calculadora de risco por operação',
  'Painel de saúde da conta MT5',
];
// Monthly only, deliberately. Annual rows exist in the plans table
// (beginner_annual etc., migration 20260608090000_resolved_stripe_price_ids.sql)
// but per that migration's own header their Stripe prices were created in
// *test* mode and were never re-verified against whatever mode the gateway's
// live key actually uses — docs/fortify/07-stripe-billing.md still documents
// the commercial catalog as monthly-only. Surfacing them here without first
// validating each price against live Stripe (and re-deriving whether the
// annual discount is still real — Enterprise's has decayed to ~0% since the
// monthly price was last updated) risks a real checkout failure or, worse, a
// captured payment with no matching entitlement. Don't add them back without
// doing that verification first.
const MAIN_PLAN_SLUGS = new Set([
  'beginner_monthly',
  'advanced_monthly',
  'pro_monthly',
  'enterprise_monthly',
]);

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

function isAddonPlan(plan: FortifyPlan) {
  const slug = String(plan.slug || plan.id).toLowerCase();
  return String(plan.plan_type || '').toLowerCase() === 'add_on' || slug === EXTRA_ACCOUNT_ADDON_SLUG;
}

function isValidStripePrice(value?: string | null) {
  return typeof value === 'string' && /^price_[A-Za-z0-9]+$/.test(value);
}

function hasConfiguredPrice(plan: FortifyPlan) {
  const amount = Number(plan.price_amount ?? plan.price_cents ?? 0);
  return amount > 0 && isValidStripePrice(plan.stripe_price_id);
}

function intervalLabel(interval?: string | null) {
  return interval === 'year' ? 'ano' : 'mês';
}

/** Raw major-unit amount for NumberFlow, which formats its own currency string. */
function priceValue(plan: FortifyPlan) {
  return Number(plan.price_amount ?? plan.price_cents ?? 0) / 100;
}

/**
 * A mesma tela serve a duas rotas:
 *
 * - `variant='auto'` (/pricing): pública quando deslogado, dentro do
 *   AppLayout quando logado. É a tela de assinatura do produto.
 * - `variant='public'` (/vendas/planos): SEMPRE pública, mesmo com sessão.
 *   É a página de planos do site — clicar em Planos no menu do site não
 *   pode jogar o visitante para dentro do produto.
 *
 * O checkout é o mesmo nos dois casos: uma sessão Stripe criada pelo
 * gateway, que exige JWT do Supabase. Sem sessão o botão guarda o plano
 * escolhido e manda para /auth; ao voltar, o checkout retoma sozinho na
 * mesma página de onde saiu.
 */
export default function PricingPage({ variant = 'auto' }: { variant?: 'auto' | 'public' } = {}) {
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
      MAIN_PLAN_SLUGS.has(String(plan.slug || plan.id)) &&
      plan.billing_interval === 'month' &&
      !isAddonPlan(plan) &&
      hasConfiguredPrice(plan)
    ));
  }, [plans]);

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

    if (!session?.access_token) {
      window.sessionStorage.setItem('fortify_intended_plan', planSelector);
      window.sessionStorage.setItem('intended_plan_slug', planSelector);
      // Guarda a rota de origem: quem clicou em Assinar na página pública
      // precisa voltar para ela depois do login, e não cair no produto.
      window.sessionStorage.setItem('fortify_checkout_return_path', window.location.pathname);
      const message = 'Entre ou crie sua conta para continuar o checkout.';
      setCheckoutNotice(message);
      toast({ title: 'Sessão necessária', description: message });
      navigate('/auth');
      return;
    }

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
      const checkout = await createCheckoutSession(planSelector, session.access_token, hasMarketingConsent());
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
      navigate('/auth');
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

  // Em /vendas/planos a casca pública é obrigatória. Em /pricing ela vale só
  // para quem está deslogado — logado, quem dá a moldura é o AppLayout, e o
  // tema escolhido no produto tem que ser respeitado.
  const isPublic = variant === 'public' || !session;

  const content = (
    <div
      className={
        isPublic
          ? 'mx-auto w-full max-w-6xl px-5 pb-16 pt-4 sm:px-8 sm:pt-8'
          : 'mx-auto w-full max-w-6xl p-6'
      }
    >
      <header className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Planos Fortify</p>
        <h1 className="mt-3 text-[2rem] font-bold leading-[1.08] tracking-[-0.02em] text-foreground text-balance sm:text-[2.6rem]">
          Escolha o plano da sua operação
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground text-balance">
          Todo plano inclui o monitoramento de regras, os alertas de limite crítico e o painel de
          contas MT5. O que muda é quantas contas você acompanha ao mesmo tempo.
        </p>
      </header>

      {!billingEnabled && (
        <div className="mt-8 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">Checkout Stripe desativado localmente</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure `VITE_BILLING_ENABLED=true` no frontend e `STRIPE_SECRET_KEY` no gateway para
            criar sessões reais.
          </p>
        </div>
      )}

      {(checkoutError || checkoutNotice) && (
        <div
          className={`mt-8 rounded-lg border p-4 ${
            checkoutError ? 'border-destructive/35 bg-destructive/10' : 'border-primary/30 bg-primary/10'
          }`}
        >
          <p className="text-sm font-medium text-foreground">
            {checkoutError ? 'Checkout indisponível' : 'Checkout Stripe'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{checkoutError || checkoutNotice}</p>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-1 text-sm">
          <span className="rounded-full bg-background px-4 py-1.5 font-semibold text-foreground shadow-sm">
            Mensal
          </span>
          <span
            title="Cobrança anual chega em breve — os planos anuais ainda estão em validação."
            className="cursor-not-allowed rounded-full px-4 py-1.5 text-muted-foreground/60"
          >
            Anual <span className="text-[10px] uppercase tracking-wide">em breve</span>
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(isLoading ? [] : visiblePlans).map((plan) => {
          const family = planFamily(plan);
          const isCurrent = currentPlanId === plan.id;
          const isBusy = busyPlan === plan.id;
          const support = supportLabels[String(plan.support_tier || 'basic')] || supportLabels.basic;
          // O limite de contas e o nível de suporte já têm lugar próprio no card.
          // Vários registros de plan_features repetem exatamente essas duas
          // informações ('ate 3 contas MT5', 'suporte padrao'), então elas são
          // filtradas aqui para a lista secundária mostrar só o que é de fato novo.
          const planFeatures = (
            Array.isArray(plan.plan_features) ? plan.plan_features : []
          ).filter((feature) => !/conta|suporte/i.test(String(feature)));

          const hasValidPrice = hasConfiguredPrice(plan);
          const disabledReason = !hasValidPrice
            ? 'Este plano ainda não possui um Price ID válido da Stripe.'
            : '';
          const buttonLabel = !hasValidPrice
            ? 'Indisponível'
            : isCurrent
              ? hasActivePaidStripeSubscription
                ? 'Gerenciar assinatura'
                : 'Plano atual'
              : hasActivePaidStripeSubscription
                ? 'Alterar plano'
                : 'Assinar';
          const handlePlanClick = () => {
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
          };

          return (
            <motion.article
              key={family}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                plan.highlighted ? 'border-primary/70 shadow-[0_8px_30px_hsl(var(--primary)/0.08)]' : 'border-border'
              }`}
            >
              {plan.highlighted && plan.recommended_badge && (
                <div className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1">
                  <Star className="h-3 w-3 fill-current text-primary-foreground" />
                  <span className="text-[11px] font-semibold text-primary-foreground">
                    {plan.recommended_badge}
                  </span>
                </div>
              )}

              {/* 1. Identidade do plano */}
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold text-foreground">{plan.name || plan.plan_name}</h2>
                {isCurrent ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {bestFor[family] || 'Plano Fortify para monitoramento profissional.'}
              </p>

              {/* 2. Preço */}
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold tabular-nums text-foreground">
                  <NumberFlow
                    value={priceValue(plan)}
                    format={{
                      style: 'currency',
                      currency: String(plan.currency || 'brl').toUpperCase(),
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }}
                    transformTiming={{ duration: 450, easing: 'ease-out' }}
                  />
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  / {intervalLabel(plan.billing_interval)}
                </span>
              </div>

              {/* 3. Limite de contas — o eixo real de comparação entre os planos */}
              <div className="mt-5 rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="font-mono text-xl font-bold tabular-nums leading-none text-foreground">
                  {plan.account_limit}
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {plan.account_limit === 1 ? 'conta MT5 monitorada' : 'contas MT5 monitoradas'}
                </p>
              </div>

              {/* 4. Benefício principal */}
              <p className="mt-4 text-xs font-medium text-foreground">{support}</p>

              {/* 5. CTA */}
              <div className="mt-5">
                <Button
                  type="button"
                  disabled={isBusy || !hasValidPrice || (isCurrent && !hasActivePaidStripeSubscription)}
                  onClick={handlePlanClick}
                  className={`w-full gap-2 ${
                    isBusy || !hasValidPrice || (isCurrent && !hasActivePaidStripeSubscription)
                      ? ''
                      : 'cursor-pointer'
                  }`}
                  variant={plan.highlighted ? 'premium' : 'outline'}
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {buttonLabel}
                </Button>
                {disabledReason ? (
                  <p className="mt-2 text-[11px] text-destructive">{disabledReason}</p>
                ) : null}
              </div>

              {/* 6. Detalhe secundário, depois do CTA de propósito */}
              <ul
                className={`mt-6 flex-1 space-y-2.5 ${
                  planFeatures.length ? 'border-t border-border pt-5' : ''
                }`}
              >
                {planFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-left">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          );
        })}
      </div>

      {/* O que não muda entre os planos — evita repetir a mesma lista em cada card */}
      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-semibold text-foreground">Incluído em todos os planos</p>
        <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED_IN_EVERY_PLAN.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Conta MT5 extra</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Conta extra — R$119/mês. Adicione capacidade ao seu plano ativo.
          </p>
          <p className="text-xs text-muted-foreground">
            {hasActivePaidStripeSubscription
              ? `Contas extras ativas: ${extraAccountQuantity}. Uso atual: ${activeAccountCount}/${accountLimit || 0} contas.`
              : 'Você precisa ter um plano ativo para adicionar contas extras.'}
          </p>
        </div>
        <Button
          type="button"
          onClick={startAddonCheckout}
          disabled={busyAddon || !hasActivePaidStripeSubscription || !addonPlan || !hasConfiguredPrice(addonPlan)}
          className="gap-2 md:min-w-[220px]"
          variant="outline"
        >
          {busyAddon ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          {addonPlan && hasConfiguredPrice(addonPlan) ? 'Adicionar conta extra' : 'Indisponível'}
        </Button>
      </section>
    </div>
  );

  return isPublic ? <PublicShell>{content}</PublicShell> : content;
}
