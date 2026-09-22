import { motion, useReducedMotion } from 'motion/react';
import { Activity, ArrowRight, CheckCircle2, Database, ShieldCheck } from 'lucide-react';
import { LandingNav } from '@/components/landing/LandingNav';
import { RevealText } from '@/components/landing/publicMotion';
import { firmLogos } from '@/data/firmLogos';
import logoTradingView from '@/assets/brands/tradingview-mark-transparent.png';

// Mantido como contrato de teste para validar a geometria da animacao retirada
// da interface de vendas. O novo hero nao renderiza esses itens.
export const ORBIT_ITEMS = [
  { key: 'the5ers', label: 'The5ers', rx: 40, angle: 8 },
  { key: 'alphacapital', label: 'Alpha Capital Group', rx: 40, angle: 172 },
  { key: 'ftmo', label: 'FTMO', rx: 48, angle: 346 },
  { key: 'e8', label: 'E8 Markets', rx: 48, angle: 194 },
  { key: 'topstep', label: 'Topstep', rx: 56, angle: 29 },
  { key: 'google', label: 'Google', rx: 56, angle: 151 },
  { key: 'apex', label: 'Apex Trader Funding', rx: 40, angle: 318 },
  { key: 'hantec', label: 'Hantec Trader', rx: 40, angle: 222 },
  { key: 'tradingview', label: 'TradingView', rx: 48, angle: 41 },
  { key: 'fxify', label: 'FXIFY', rx: 48, angle: 139 },
] as const;

const integrationMarks = [
  { label: 'TradingView', src: logoTradingView },
  { label: 'FTMO', src: firmLogos.FTMO },
  { label: 'Topstep', src: firmLogos.Topstep },
  { label: 'Hantec', src: firmLogos['Hantec Trader'] },
  { label: 'E8 Markets', src: firmLogos['E8 Markets'] },
];

const riskSignals = [
  {
    title: 'Limite diário',
    description: 'O uso da sessão é comparado à regra da conta.',
    state: 'Leitura por conta',
    Icon: Activity,
  },
  {
    title: 'Drawdown',
    description: 'Saldo e equity são lidos no contexto do programa.',
    state: 'Regra do programa',
    Icon: ShieldCheck,
  },
  {
    title: 'Regras vinculadas',
    description: 'Fonte, versão e perfil ficam ligados à conta.',
    state: 'Histórico da regra',
    Icon: Database,
  },
];

const operatingChecks = [
  'Conta MT5 sincronizada',
  'Programa e tamanho vinculados',
  'Limites disponíveis no painel',
];

const operatingAreas = [
  ['Limite diário', 'Margem da sessão'],
  ['Drawdown', 'Regra do programa'],
  ['Regras', 'Versão vinculada'],
];

function RiskConsolePreview() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.55 }}
      className="mx-auto mt-10 w-full max-w-6xl overflow-hidden rounded-lg border border-[#252b36] bg-[#10141c] sm:mt-12"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Visão de risco da conta</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">Leitura operacional antes de abrir uma ordem.</p>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 sm:inline-flex">
          Estrutura do painel
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.5fr)]">
        <section className="px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-cyan-200">Conta e regras</p>
              <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">O contexto certo para cada limite.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                O programa e o tamanho vinculados definem como o Fortify interpreta a conta.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">Dados do seu ambiente</span>
          </div>
          <div className="divide-y divide-white/10">
            {riskSignals.map(({ title, description, state, Icon }) => (
              <div key={title} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                  </div>
                </div>
                <span className="w-fit rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300">
                  {state}
                </span>
              </div>
            ))}
          </div>
        </section>

        <aside className="border-t border-white/10 bg-[#0c0f15] px-5 py-6 lg:border-l lg:border-t-0 sm:px-6 sm:py-7">
          <p className="text-xs font-semibold text-slate-400">Antes da entrada</p>
          <div className="mt-5 space-y-4">
            {operatingChecks.map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm leading-5 text-slate-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-400">
            O Fortify mostra o estado da conta. As ordens continuam na sua plataforma de negociação.
          </p>
        </aside>
      </div>
    </motion.div>
  );
}

export function FortifyHero({
  onPrimary,
  onSecondary,
}: {
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="min-h-[100svh] bg-[#07090d] pb-10 text-white">
      <div className="border-b border-white/10">
        <LandingNav tone="dark" variant="bare" />
      </div>

      <main className="mx-auto w-full max-w-6xl px-5 pb-10 pt-16 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="max-w-4xl">
          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-xs font-semibold text-cyan-200"
          >
            Monitoramento para MT5
          </motion.p>
          <RevealText
            as="h1"
            text="Fortify para contas de mesa"
            trigger="load"
            stagger={0.035}
            className="mt-4 text-4xl font-semibold leading-[1.04] text-white sm:text-5xl lg:text-6xl"
          />
          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg"
          >
            Vincule o programa contratado e acompanhe limite diário, drawdown e regras da mesa antes da próxima ordem.
          </motion.p>

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.48 }}
            className="mt-8 flex flex-col items-start gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-200 sm:w-auto"
            >
              Criar conta
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onSecondary}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-white transition-colors hover:border-cyan-200/60 hover:bg-white/5 sm:w-auto"
            >
              Falar com suporte
            </button>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.62 }}
            className="mt-12 grid overflow-hidden border-y border-white/10 text-left sm:grid-cols-3"
          >
            {operatingAreas.map(([label, detail], index) => (
              <div
                key={label}
                className={`px-4 py-4 ${index > 0 ? 'border-t border-white/10 sm:border-l sm:border-t-0' : ''}`}
              >
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{detail}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <RiskConsolePreview />

        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="text-center text-xs font-medium text-slate-500">
            Mesas e ferramentas presentes no seu fluxo
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {integrationMarks.map((mark) => (
              <img
                key={mark.label}
                src={mark.src}
                alt={mark.label}
                loading="lazy"
                decoding="async"
                className="h-4 w-auto max-w-[96px] object-contain opacity-60"
              />
            ))}
          </div>
        </div>
      </main>
    </section>
  );
}
