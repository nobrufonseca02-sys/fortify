import type { CSSProperties, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ChevronDown, HelpCircle, Link2, RefreshCw, Shield, Square, XCircle } from 'lucide-react';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { propFirmFilterOptions } from '@/data/propFirmRules';
import markFtmo from '@/assets/brands/icons/ftmo-mark.svg';
import markHantec from '@/assets/brands/icons/hantec-mark.svg';
import markAlphaCapital from '@/assets/brands/icons/alphacapital-mark.svg';
import markApex from '@/assets/brands/icons/apex-mark.svg';
import markThe5ers from '@/assets/brands/icons/the5ers.png';
import { cn } from '@/lib/utils';
import { FONT_DISPLAY, FONT_MONO } from './fonts';
import { GlassCard } from './CinematicPage';

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEW = { once: true, margin: '0px 0px -12% 0px' } as const;

function useEnter(delay = 0) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return {};
  return {
    initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
    whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
    viewport: VIEW,
    transition: { duration: 0.7, ease: EASE, delay },
  };
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex w-full flex-wrap items-center gap-[1px] sm:w-auto">
      {items.map((item, index) => (
        <li
          key={item}
          className={cn(
            'flex flex-1 items-center justify-center bg-zinc-900/60 px-3 py-1 text-center sm:flex-initial',
            index === 0 ? 'rounded-l-full rounded-r-sm' : index === items.length - 1 ? 'rounded-l-sm rounded-r-full' : 'rounded-sm',
          )}
        >
          <span className="whitespace-nowrap text-[11px] font-medium text-zinc-400">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FeatureSection({
  id,
  eyebrow,
  title,
  body,
  chips,
  visual,
  reverse = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  chips: string[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  const eyebrowEnter = useEnter(0);
  const titleEnter = useEnter(0.08);
  const bodyEnter = useEnter(0.16);
  const chipsEnter = useEnter(0.24);
  const visualEnter = useEnter(0.12);

  return (
    <section aria-labelledby={`${id}-title`} className="relative w-full overflow-hidden bg-black px-6 py-20 md:py-28">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className={cn('flex flex-col items-start text-left lg:col-span-5', reverse && 'lg:order-2 lg:col-start-8')}>
          <motion.p {...eyebrowEnter} className={`${FONT_MONO} mb-4 text-[11px] uppercase tracking-[0.22em] text-zinc-400`}>
            {eyebrow}
          </motion.p>
          <motion.h2
            id={`${id}-title`}
            {...titleEnter}
            className={`${FONT_DISPLAY} mb-4 text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl`}
          >
            {title}
          </motion.h2>
          <motion.p {...bodyEnter} className="mb-8 max-w-xl text-pretty text-sm leading-relaxed text-zinc-400">
            {body}
          </motion.p>
          <motion.div {...chipsEnter} className="w-full sm:w-auto">
            <Chips items={chips} />
          </motion.div>
        </div>
        <motion.div {...visualEnter} className={cn('lg:col-span-7', reverse && 'lg:order-1 lg:col-start-1')}>
          {visual}
        </motion.div>
      </div>
    </section>
  );
}

const BINDING_FIELDS = ['Mesa proprietária', 'Programa', 'Tamanho ou variante', 'Plataforma', 'Versão da regra'];

function BindingVisual() {
  const reduceMotion = useReducedMotion();
  return (
    <GlassCard>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">Vínculo oficial de regras</p>
        <span className={`${FONT_MONO} rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400`}>
          Estrutura do seletor
        </span>
      </div>
      <ol className="space-y-2.5">
        {BINDING_FIELDS.map((field, index) => (
          <motion.li
            key={field}
            initial={reduceMotion ? undefined : { opacity: 0, x: -12 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={VIEW}
            transition={{ duration: 0.5, ease: EASE, delay: 0.2 + index * 0.08 }}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-3"
          >
            <span className={`${FONT_MONO} flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[11px] text-zinc-400 ring-1 ring-white/10`}>
              {index + 1}
            </span>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5">
              <span className="text-[13px] text-zinc-200">{field}</span>
              <span className="flex items-center gap-1 text-[12px] text-zinc-500">
                Selecione <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </motion.li>
        ))}
      </ol>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-white/15 px-3.5 py-3">
        <Square className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
        <p className="text-[13px] leading-5 text-zinc-300">
          Confirmação manual das regras
          <span className="block text-[12px] text-zinc-500">Nunca vem marcada. O vínculo só é salvo depois que você revisa.</span>
        </p>
      </div>
    </GlassCard>
  );
}

const LIMIT_METERS = [
  { label: 'Se bater o stop, sobra hoje', value: 'US$ 450,00', of: 'de US$ 500,00', fill: 0.9 },
  { label: 'Folga antes do drawdown máximo', value: 'US$ 950,00', of: 'de US$ 1.000,00', fill: 0.95 },
];

function LimitsVisual() {
  const reduceMotion = useReducedMotion();
  return (
    <GlassCard>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">Resumo do trade</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[12px] text-emerald-300">
          <Shield className="h-3.5 w-3.5" aria-hidden="true" /> Seguro
        </span>
      </div>
      <p className={`${FONT_MONO} text-[10px] uppercase tracking-[0.2em] text-zinc-400`}>Lote recomendado</p>
      <p className="mt-1 text-5xl font-semibold tabular-nums tracking-tight text-white">0,10</p>
      <div className="mt-6 space-y-5">
        {LIMIT_METERS.map((meter, index) => (
          <div key={meter.label}>
            <div className="flex items-baseline justify-between gap-3">
              <p className={`${FONT_MONO} text-[10px] uppercase tracking-[0.18em] text-zinc-400`}>{meter.label}</p>
              <p className="text-[12px] text-emerald-300">Folga confortável</p>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{meter.value}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
              <motion.div
                className="h-full origin-left rounded-full bg-emerald-400"
                style={reduceMotion ? { transform: `scaleX(${meter.fill})` } : undefined}
                initial={reduceMotion ? undefined : { scaleX: 0 }}
                whileInView={reduceMotion ? undefined : { scaleX: meter.fill }}
                viewport={VIEW}
                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 + index * 0.15 }}
              />
            </div>
            <p className={`${FONT_MONO} mt-1.5 text-[11px] text-zinc-500`}>{meter.of}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[12px] text-zinc-500">Mesma simulação do print acima: EUR/USD, saldo de 10.000, risco de 0,5%.</p>
    </GlassCard>
  );
}

const HEALTH_STATES = [
  { label: 'SEGURO', note: 'Sua conta está dentro dos limites.', Icon: Shield, tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30' },
  { label: 'ATENÇÃO', note: 'Você está se aproximando de um limite.', Icon: AlertTriangle, tone: 'text-amber-300 bg-amber-400/10 border-amber-400/30' },
  { label: 'VIOLADO', note: 'Uma ou mais regras foram violadas.', Icon: XCircle, tone: 'text-rose-300 bg-rose-400/10 border-rose-400/30' },
  { label: 'SEM DADOS', note: 'Conta sem conexão MT5 ou ainda sem avaliação de regras.', Icon: HelpCircle, tone: 'text-zinc-300 bg-zinc-400/10 border-zinc-400/20' },
];

const CONNECTION_STATES = [
  { label: 'Conectada', Icon: Link2 },
  { label: 'Sincronizando', Icon: RefreshCw },
  { label: 'Desconectada', Icon: XCircle },
  { label: 'Erro de autenticação', Icon: AlertTriangle },
];

function HealthVisual() {
  const reduceMotion = useReducedMotion();
  return (
    <GlassCard>
      <p className="mb-5 text-sm font-semibold text-white">Estados que o painel de contas mostra</p>
      <ul className="space-y-2.5">
        {HEALTH_STATES.map(({ label, note, Icon, tone }, index) => (
          <motion.li
            key={label}
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={VIEW}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 + index * 0.08 }}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-3"
          >
            <span className={cn('inline-flex w-[108px] shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', tone)}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </span>
            <span className="text-[13px] leading-5 text-zinc-300">{note}</span>
          </motion.li>
        ))}
      </ul>
      <p className={`${FONT_MONO} mb-2.5 mt-6 text-[10px] uppercase tracking-[0.2em] text-zinc-400`}>Conexão MT5</p>
      <div className="flex flex-wrap gap-2">
        {CONNECTION_STATES.map(({ label, Icon }) => (
          <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-[12px] text-zinc-300 ring-1 ring-white/10">
            <Icon className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}

// Só o símbolo de cada marca, sem fundo próprio: o único círculo é o chip da órbita.
// `invert` é para marca preta (The5ers), que sumiria no fundo escuro.
type OrbitMark = { label: string; src: string; start: number; invert?: boolean };

const OUTER_RING: OrbitMark[] = [
  { label: 'FTMO', src: markFtmo, start: -60 },
  { label: 'Hantec Trader', src: markHantec, start: 60 },
  { label: 'Alpha Capital Group', src: markAlphaCapital, start: 180 },
];

const INNER_RING: OrbitMark[] = [
  { label: 'Apex Trader Funding', src: markApex, start: -45 },
  { label: 'The5ers', src: markThe5ers, start: 135, invert: true },
];

function OrbitChip({ mark, dir, duration }: { mark: OrbitMark; dir: 1 | -1; duration: string }) {
  const vars = { '--start': `${mark.start}deg`, '--dir': dir, '--duration': duration } as CSSProperties;
  return (
    <div className="fortify-orbit-arm pointer-events-none absolute left-1/2 top-0 -ml-6 flex h-1/2 w-12 origin-bottom flex-col items-center justify-start" style={vars}>
      <div className="fortify-orbit-counter pointer-events-auto -mt-6" style={vars}>
        <div className="relative flex size-12 overflow-hidden rounded-full border border-white/20 bg-zinc-900 shadow-md transition-transform duration-300 hover:scale-110">
          <img src={mark.src} alt={mark.label} title={mark.label} className={cn('m-auto size-6 object-contain', mark.invert && 'invert')} loading="lazy" decoding="async" />
        </div>
      </div>
    </div>
  );
}

function OrbitVisual() {
  return (
    <div className="relative flex min-h-[360px] items-center justify-center sm:min-h-[420px]">
      <div className="relative mx-auto flex aspect-[16/10] w-full max-w-[22rem] items-center justify-between overflow-visible p-6 [mask-image:linear-gradient(to_bottom,black_0%,black_75%,transparent_100%)] sm:max-w-sm">
        <div className="absolute inset-6 flex aspect-square items-center justify-center rounded-full border-t border-white/15 bg-gradient-to-b from-white/10 to-transparent to-25%">
          {OUTER_RING.map((mark) => (
            <OrbitChip key={mark.label} mark={mark} dir={1} duration="25s" />
          ))}
        </div>
        <div className="absolute inset-20 flex aspect-square scale-90 items-center justify-center rounded-full border-t border-white/15 bg-gradient-to-b from-white/10 to-transparent to-25%">
          {INNER_RING.map((mark) => (
            <OrbitChip key={mark.label} mark={mark} dir={-1} duration="20s" />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 mx-auto my-2 flex w-fit justify-center">
          <div className="relative z-20 rounded-full border border-white/20 bg-black p-1">
            <div className="flex size-16 items-center justify-center rounded-full bg-black shadow-2xl shadow-white/10">
              <FortifyMark className="size-8 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductSections() {
  const firmCount = propFirmFilterOptions.firms.length;

  return (
    <div className="relative z-30 bg-black">
      <FeatureSection
        id="regras"
        eyebrow="01 · Regras vinculadas à conta"
        title="A regra certa, presa à conta certa."
        body="Cada conta é ligada a uma mesa, um programa, um tamanho, uma plataforma e uma versão da regra. O vínculo fica registrado com a versão usada, e só é salvo depois da sua confirmação manual."
        chips={['Versão registrada', 'Confirmação manual', 'Uma regra por conta']}
        visual={<BindingVisual />}
      />
      <FeatureSection
        id="limites"
        eyebrow="02 · Limites visíveis antes da entrada"
        title="Saiba quanto sobra antes de clicar."
        body="A Calculadora de Risco transforma entrada e stop em lote, e mostra o que resta do limite diário e do drawdown se o stop for atingido."
        chips={['Lote pelo risco', 'Folga do dia', 'Folga do drawdown']}
        visual={<LimitsVisual />}
        reverse
      />
      <FeatureSection
        id="saude"
        eyebrow="03 · Saúde por conta MT5"
        title="Cada conta com o próprio estado."
        body="O painel de contas mostra a conexão MT5 e a saúde de cada conta em relação às regras vinculadas. Sem conexão ou sem avaliação, a conta aparece como sem dados, em vez de parecer segura."
        chips={['Por conta', 'Conexão MT5', 'Sem dados ≠ seguro']}
        visual={<HealthVisual />}
      />
      <FeatureSection
        id="biblioteca"
        eyebrow="04 · Biblioteca de mesas proprietárias"
        title="As regras das mesas, num só lugar."
        body={`A biblioteca reúne ${firmCount} mesas proprietárias com os programas, tamanhos e regras de cada uma. Escolha o programa que você contratou e leve a seleção direto para o vínculo da sua conta.`}
        chips={[`${firmCount} mesas`, 'Programas e tamanhos', 'Direto para a conta']}
        visual={<OrbitVisual />}
        reverse
      />
    </div>
  );
}
