import { motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { CheckCircle2, Loader2, PlusCircle, ShieldCheck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CinematicPricing } from '@/components/landing/cinematic/CinematicPricing';
import { usePricingCheckout } from '@/hooks/usePricingCheckout';
import {
  INCLUDED_IN_EVERY_PLAN,
  bestFor,
  hasConfiguredPrice,
  intervalLabel,
  planFamily,
  priceValue,
  secondaryFeatures,
  supportLabels,
} from '@/lib/pricingCatalog';

/**
 * A mesma tela serve a duas rotas:
 *
 * - `variant='auto'` (/pricing): pública quando deslogado, dentro do
 *   AppLayout quando logado. É a tela de assinatura do produto.
 * - `variant='public'` (/vendas/planos): SEMPRE pública, mesmo com sessão.
 *   É a página de planos do site — clicar em Planos no menu do site não
 *   pode jogar o visitante para dentro do produto.
 *
 * Catálogo e checkout vêm de `usePricingCheckout` nos dois casos; só a
 * camada visual muda.
 */
export default function PricingPage({ variant = 'auto' }: { variant?: 'auto' | 'public' } = {}) {
  const pricing = usePricingCheckout();
  const {
    session,
    isLoading,
    visiblePlans,
    addonPlan,
    anuaisLiberados,
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
  } = pricing;

  // Em /vendas/planos a página pública é obrigatória. Em /pricing ela vale só
  // para quem está deslogado — logado, quem dá a moldura é o AppLayout, e o
  // tema escolhido no produto tem que ser respeitado.
  if (variant === 'public' || !session) {
    return <CinematicPricing pricing={pricing} />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <header className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Planos Fortify</p>
        <h1 className="mt-3 text-[2rem] font-bold leading-[1.08] tracking-[-0.02em] text-foreground text-balance sm:text-[2.6rem]">
          Planos para sua operação
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground text-balance">
          Monitore regras, alertas de limite e contas MT5. O limite de contas varia conforme o plano.
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
          <button
            type="button"
            onClick={() => setIntervalo('month')}
            className={
              intervaloEfetivo === 'month'
                ? 'rounded-full bg-background px-4 py-1.5 font-semibold text-foreground shadow-sm'
                : 'rounded-full px-4 py-1.5 text-muted-foreground transition-colors hover:text-foreground'
            }
          >
            Mensal
          </button>
          {anuaisLiberados ? (
            <button
              type="button"
              onClick={() => setIntervalo('year')}
              className={
                intervaloEfetivo === 'year'
                  ? 'rounded-full bg-background px-4 py-1.5 font-semibold text-foreground shadow-sm'
                  : 'rounded-full px-4 py-1.5 text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              Anual
            </button>
          ) : (
            <span
              title="Um dos planos anuais está cadastrado com desconto abaixo do mínimo. A aba liga sozinha quando o preço for corrigido."
              className="cursor-not-allowed rounded-full px-4 py-1.5 text-muted-foreground/60"
            >
              Anual <span className="text-[10px] uppercase tracking-wide">em breve</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(isLoading ? [] : visiblePlans).map((plan) => {
          const family = planFamily(plan);
          const action = planAction(plan);
          const support = supportLabels[String(plan.support_tier || 'basic')] || supportLabels.basic;
          const planFeatures = secondaryFeatures(plan);

          return (
            <motion.article
              key={family}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`relative flex flex-col rounded-lg border bg-card p-6 ${
                plan.highlighted ? 'border-primary/70 bg-primary/[0.03]' : 'border-border'
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
                {action.isCurrent ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : null}
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
              <div className="mt-5 rounded-lg border border-border bg-muted/40 px-4 py-3">
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
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={`w-full gap-2 ${action.disabled ? '' : 'cursor-pointer'}`}
                  variant={plan.highlighted ? 'premium' : 'outline'}
                >
                  {action.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {action.label}
                </Button>
                {action.disabledReason ? (
                  <p className="mt-2 text-[11px] text-destructive">{action.disabledReason}</p>
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
      <section className="mt-10 rounded-lg border border-border bg-card p-6">
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

      <section className="mt-4 flex flex-col gap-5 rounded-lg border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Conta MT5 extra</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Conta extra: R$119/mês. Adicione capacidade ao seu plano ativo.
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
}
