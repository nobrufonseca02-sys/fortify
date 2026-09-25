import { useRef, type MouseEvent, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { AlertTriangle, CheckCircle2, Info, Loader2, PlusCircle, ShieldCheck, Star } from 'lucide-react';
import type { FortifyPlan } from '@/hooks/useSubscriptionPlan';
import type { PricingCheckout } from '@/hooks/usePricingCheckout';
import { FirmLogoStrip } from '@/components/landing/FirmLogoMarquee';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support';
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
import { cn } from '@/lib/utils';
import { FinalCta } from './FinalCta';
import { CinematicPage } from './CinematicPage';
import { Orb } from './Orb';
import { TactileButton } from './TactileButton';
import { FONT_DISPLAY, FONT_MONO } from './fonts';

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEW = { once: true, margin: '0px 0px -10% 0px' } as const;

function useEnter() {
  const reduceMotion = useReducedMotion();
  return (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
          whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
          viewport: VIEW,
          transition: { duration: 0.7, ease: EASE, delay },
        };
}

function Header({ pricing }: { pricing: PricingCheckout }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const orbY = useTransform(scrollYProgress, [0, 1], ['-50%', '-70%']);
  const orbOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);
  const enter = useEnter();
  const { intervaloEfetivo, setIntervalo, anuaisLiberados } = pricing;

  return (
    <section ref={ref} aria-labelledby="planos-title" className="relative overflow-x-clip px-6 pb-16 pt-36 sm:pt-44">
      <div className="absolute inset-x-0 top-0 h-[80vh]">
        <Orb style={reduceMotion ? undefined : { y: orbY, opacity: orbOpacity }} />
      </div>
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <motion.p
          {...enter(0.05)}
          className={`${FONT_MONO} rounded-full bg-zinc-900/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.6)] backdrop-blur-md sm:text-[11px]`}
        >
          Planos Fortify
        </motion.p>
        <motion.h1
          id="planos-title"
          {...enter(0.15)}
          className="text-balance text-4xl leading-[1.08] tracking-tight text-white sm:text-6xl"
        >
          Escolha pelo número de contas <span className="font-medium text-zinc-400">que você opera.</span>
        </motion.h1>
        <motion.p {...enter(0.25)} className="max-w-xl text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
          Todo plano inclui monitoramento de regras, alertas e painel de contas. O que muda é o limite de contas MT5 e
          o nível de suporte.
        </motion.p>
        <motion.div
          {...enter(0.35)}
          role="group"
          aria-label="Período de cobrança"
          className="relative inline-flex items-center rounded-full bg-zinc-900/80 p-1 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.6)] backdrop-blur-md"
        >
          <IntervalButton active={intervaloEfetivo === 'month'} onClick={() => setIntervalo('month')}>
            Mensal
          </IntervalButton>
          {anuaisLiberados ? (
            <IntervalButton active={intervaloEfetivo === 'year'} onClick={() => setIntervalo('year')}>
              Anual
            </IntervalButton>
          ) : (
            <span
              title="Um dos planos anuais está cadastrado com desconto abaixo do mínimo. A aba liga sozinha quando o preço for corrigido."
              className="cursor-not-allowed rounded-full px-4 py-1.5 text-zinc-500"
            >
              Anual <span className={`${FONT_MONO} text-[9px] uppercase tracking-[0.16em]`}>em breve</span>
            </span>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function IntervalButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'relative rounded-full px-4 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        active ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-100',
      )}
    >
      {active && (
        <motion.span
          layoutId="interval-pill"
          className="absolute inset-0 -z-0 rounded-full bg-white"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function Notice({ tone, title, children }: { tone: 'warning' | 'error' | 'info'; title: string; children: string }) {
  const Icon = tone === 'info' ? Info : AlertTriangle;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md',
        tone === 'error' && 'border-rose-400/30 bg-rose-400/10',
        tone === 'warning' && 'border-amber-300/30 bg-amber-300/10',
        tone === 'info' && 'border-white/10 bg-zinc-900/70',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{children}</p>
      </div>
    </div>
  );
}

/** Luz que segue o cursor dentro do card, como as superfícies do template. */
function trackSpotlight(event: MouseEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
}

function PlanCard({ plan, pricing, index }: { plan: FortifyPlan; pricing: PricingCheckout; index: number }) {
  const reduceMotion = useReducedMotion();
  const family = planFamily(plan);
  const action = pricing.planAction(plan);
  const support = supportLabels[String(plan.support_tier || 'basic')] || supportLabels.basic;
  const features = secondaryFeatures(plan);
  const highlighted = Boolean(plan.highlighted);

  return (
    <motion.article
      layout
      initial={reduceMotion ? undefined : { opacity: 0, y: 24, filter: 'blur(8px)' }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={VIEW}
      transition={{ duration: 0.7, ease: EASE, delay: index * 0.08 }}
      onMouseMove={trackSpotlight}
      className={cn(
        'group relative flex flex-col rounded-[1.6rem] p-1.5 transition-transform duration-300 hover:-translate-y-1',
        highlighted
          ? 'bg-gradient-to-b from-[rgba(165,88,251,0.55)] via-[rgba(73,34,229,0.25)] to-white/5 shadow-[0_32px_100px_-20px_rgba(115,60,240,0.45)]'
          : 'bg-gradient-to-b from-white/10 via-white/[0.04] to-transparent shadow-[0_32px_100px_rgba(0,0,0,0.9)]',
      )}
    >
      {highlighted && plan.recommended_badge && (
        <div className="absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-[0_8px_24px_-8px_rgba(255,255,255,0.5)]">
          <Star className="h-3 w-3 fill-current text-zinc-950" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-zinc-950">{plan.recommended_badge}</span>
        </div>
      )}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-white/5 bg-zinc-950/95 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(420px_circle_at_var(--spot-x,50%)_var(--spot-y,0%),rgba(255,255,255,0.07),transparent_40%)]"
        />

        <div className="relative flex items-center gap-1.5">
          <h2 className={`${FONT_DISPLAY} text-xl font-semibold tracking-tight text-white`}>{plan.name || plan.plan_name}</h2>
          {action.isCurrent ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-label="Plano atual" /> : null}
        </div>
        <p className="relative mt-1 min-h-[2.5rem] text-xs leading-relaxed text-zinc-400">
          {bestFor[family] || 'Plano Fortify para monitoramento profissional.'}
        </p>

        <div className="relative mt-6 flex items-baseline gap-1">
          <span className="text-4xl font-semibold tabular-nums tracking-tight text-white">
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
          <span className="text-sm font-medium text-zinc-500">/ {intervalLabel(plan.billing_interval)}</span>
        </div>

        <div className="relative mt-5 rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3">
          <p className={`${FONT_MONO} text-2xl font-medium tabular-nums leading-none text-white`}>{plan.account_limit}</p>
          <p className={`${FONT_MONO} mt-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-400`}>
            {plan.account_limit === 1 ? 'conta MT5 monitorada' : 'contas MT5 monitoradas'}
          </p>
        </div>

        <p className="relative mt-4 text-xs font-medium text-zinc-200">{support}</p>

        <div className="relative mt-5">
          <TactileButton
            variant={highlighted ? 'primary' : 'glass'}
            disabled={action.disabled}
            onClick={action.onClick}
            className="w-full"
          >
            {action.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {action.label}
          </TactileButton>
          {action.disabledReason ? <p className="mt-2 text-[11px] text-rose-300">{action.disabledReason}</p> : null}
        </div>

        {features.length > 0 && (
          <ul className="relative mt-6 flex-1 space-y-2.5 border-t border-white/10 pt-5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-xs text-zinc-400">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.article>
  );
}

function PlanGrid({ pricing }: { pricing: PricingCheckout }) {
  const { isLoading, visiblePlans } = pricing;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Carregando planos">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[420px] animate-pulse rounded-[1.6rem] bg-zinc-900/60 ring-1 ring-white/5" />
        ))}
      </div>
    );
  }

  if (visiblePlans.length === 0) {
    return (
      <Notice tone="info" title="Planos indisponíveis no momento">
        Não foi possível carregar o catálogo agora. Tente de novo em instantes ou fale com o suporte.
      </Notice>
    );
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
      {visiblePlans.map((plan, index) => (
        <PlanCard key={planFamily(plan)} plan={plan} pricing={pricing} index={index} />
      ))}
    </div>
  );
}

function GlassPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[1.6rem] border border-white/10 bg-gradient-to-b from-white/10 via-white/[0.04] to-transparent p-1.5', className)}>
      <div className="rounded-[1.25rem] border border-white/5 bg-zinc-950/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-8">
        {children}
      </div>
    </div>
  );
}

function Included() {
  const enter = useEnter();
  const reduceMotion = useReducedMotion();
  return (
    <motion.section {...enter()} aria-labelledby="incluido-title">
      <GlassPanel>
        <p className={`${FONT_MONO} text-[10px] uppercase tracking-[0.22em] text-zinc-400`}>Em todos os planos</p>
        <h2 id="incluido-title" className={`${FONT_DISPLAY} mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl`}>
          Incluído em todos os planos
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED_IN_EVERY_PLAN.map((item, index) => (
            <motion.li
              key={item}
              initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={VIEW}
              transition={{ duration: 0.5, ease: EASE, delay: 0.1 + index * 0.06 }}
              className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-3 text-[13px] leading-5 text-zinc-300"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      </GlassPanel>
    </motion.section>
  );
}

function ExtraAccount({ pricing }: { pricing: PricingCheckout }) {
  const enter = useEnter();
  const {
    addonPlan,
    busyAddon,
    hasActivePaidStripeSubscription,
    extraAccountQuantity,
    activeAccountCount,
    accountLimit,
    startAddonCheckout,
  } = pricing;
  const addonReady = Boolean(addonPlan && hasConfiguredPrice(addonPlan));

  return (
    <motion.section {...enter()} aria-labelledby="extra-title">
      <GlassPanel>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-zinc-300" aria-hidden="true" />
              <h2 id="extra-title" className="text-sm font-semibold text-white">
                Conta MT5 extra
              </h2>
            </div>
            <p className="text-sm text-zinc-300">Conta extra: R$119/mês. Adicione capacidade ao seu plano ativo.</p>
            <p className="text-xs text-zinc-500">
              {hasActivePaidStripeSubscription
                ? `Contas extras ativas: ${extraAccountQuantity}. Uso atual: ${activeAccountCount}/${accountLimit || 0} contas.`
                : 'Você precisa ter um plano ativo para adicionar contas extras.'}
            </p>
          </div>
          <TactileButton
            variant="glass"
            onClick={startAddonCheckout}
            disabled={busyAddon || !hasActivePaidStripeSubscription || !addonReady}
            className="md:min-w-[220px]"
          >
            {busyAddon ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlusCircle className="h-4 w-4" aria-hidden="true" />}
            {addonReady ? 'Adicionar conta extra' : 'Indisponível'}
          </TactileButton>
        </div>
      </GlassPanel>
    </motion.section>
  );
}

export function CinematicPricing({ pricing }: { pricing: PricingCheckout }) {
  const reduceMotion = useReducedMotion();
  const { billingEnabled, checkoutError, checkoutNotice } = pricing;

  return (
    <CinematicPage>
        <Header pricing={pricing} />

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-5 pb-16 sm:px-6">
          {!billingEnabled && (
            <Notice tone="warning" title="Checkout Stripe desativado localmente">
              Configure `VITE_BILLING_ENABLED=true` no frontend e `STRIPE_SECRET_KEY` no gateway para criar sessões reais.
            </Notice>
          )}
          {(checkoutError || checkoutNotice) && (
            <Notice tone={checkoutError ? 'error' : 'info'} title={checkoutError ? 'Checkout indisponível' : 'Checkout Stripe'}>
              {checkoutError || checkoutNotice || ''}
            </Notice>
          )}

          <div className="pt-4">
            <PlanGrid pricing={pricing} />
          </div>
        </div>

        <div className="relative z-10 py-10">
          <p className={`${FONT_MONO} mb-3 text-center text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-400`}>
            Mesas proprietárias no catálogo do Fortify
          </p>
          <FirmLogoStrip reduceMotion={Boolean(reduceMotion)} pauseOnHover />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-4 px-5 pt-10 sm:px-6">
          <Included />
          <ExtraAccount pricing={pricing} />
        </div>

        <FinalCta
          title="Dúvidas antes de escolher o plano?"
          body="Fale com o suporte para entender qual plano cobre as suas contas, ou crie a conta e escolha o plano depois."
          secondary={{ label: 'Falar com suporte', href: SUPPORT_WHATSAPP_URL, destination: 'whatsapp_support' }}
        />
    </CinematicPage>
  );
}
