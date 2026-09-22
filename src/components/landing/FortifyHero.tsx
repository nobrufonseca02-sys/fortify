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
    description: 'Acompanhe o risco da sessão contra a regra vinculada.',
    Icon: Activity,
  },
  {
    title: 'Drawdown total',
    description: 'Leia saldo e equity no contexto do programa contratado.',
    Icon: ShieldCheck,
  },
  {
    title: 'Regras da mesa',
    description: 'Mantenha fonte, versão e perfil da conta organizados.',
    Icon: Database,
  },
];

const preTradeChecks = [
  'Conta MT5 sincronizada',
  'Programa e tamanho confirmados',
  'Risco da operação definido',
];

function RiskConsolePreview() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.55 }}
      className="mx-auto mt-10 w-full max-w-5xl overflow-hidden rounded-lg border border-zinc-800 bg-[#0b1018] sm:mt-12"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Visão de risco da conta</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">Limites, regras vinculadas e sinais da operação.</p>
          </div>
        </div>
        <span className="hidden shrink-0 border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200 sm:inline-flex">
          Exemplo de leitura
        </span>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
        <div className="divide-y divide-white/10">
          <div className="px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold text-cyan-200">Resumo da conta</p>
            <p className="mt-2 max-w-xl text-base font-medium leading-6 text-slate-100 sm:text-lg">
              As regras acompanham o programa e o tamanho selecionados para a conta.
            </p>
          </div>
          {riskSignals.map(({ title, description, Icon }) => (
            <div key={title} className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <aside className="border-t border-white/10 bg-white/[0.025] p-4 lg:border-l lg:border-t-0 sm:p-5">
          <p className="text-xs font-semibold text-slate-400">Antes da entrada</p>
          <div className="mt-4 space-y-3">
            {preTradeChecks.map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-xs leading-5 text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">
            Confira os limites antes de enviar uma ordem.
          </div>
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
    <section className="min-h-[100svh] bg-[#FAF9F5] pb-10 pt-4 text-zinc-900">
      <div className="relative z-20">
        <LandingNav />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-5 pb-8 pt-16 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-xs font-semibold text-primary"
          >
            Gestão de risco para contas de mesa
          </motion.p>
          <RevealText
            as="h1"
            text="Controle de risco para contas de mesa"
            trigger="load"
            stagger={0.035}
            className="mt-4 text-4xl font-bold leading-[1.05] text-zinc-950 sm:text-5xl lg:text-6xl"
          />
          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg"
          >
            Conecte sua conta MT5, escolha o programa contratado e acompanhe os limites que importam antes de operar.
          </motion.p>

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.48 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 sm:w-auto"
            >
              Criar conta
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onSecondary}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-50 sm:w-auto"
            >
              Tirar dúvidas
            </button>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-500"
          >
            <span>Sem execução de ordens</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-zinc-300" />
            <span>Regras versionadas</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-zinc-300" />
            <span>Compatível com MT5</span>
          </motion.div>
        </div>

        <RiskConsolePreview />

        <div className="mt-8 border-t border-zinc-200 pt-5">
          <p className="text-center text-xs font-medium text-zinc-500">
            Ferramentas e mesas presentes no seu fluxo
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {integrationMarks.map((mark) => (
              <img
                key={mark.label}
                src={mark.src}
                alt={mark.label}
                loading="lazy"
                decoding="async"
                className="h-4 w-auto max-w-[96px] object-contain opacity-55 brightness-0"
              />
            ))}
          </div>
        </div>
      </main>
    </section>
  );
}
