import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { FirmLogoStrip } from '@/components/landing/FirmLogoMarquee';
import { AUTH_SIGNUP_PATH, trackCta } from '@/components/landing/PublicShell';
import calculatorShot from '@/assets/screenshots/fortify-risk-calculator-desktop.png';
import { TactileButton } from './TactileButton';
import { Orb } from './Orb';
import { FONT_MONO } from './fonts';

const EASE = [0.22, 1, 0.36, 1] as const;

const ENTER = {
  hidden: { opacity: 0, y: 16, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

const SCREENSHOT_ALT =
  'Tela real da Calculadora de Risco do Fortify com uma simulação em EUR/USD: lote recomendado, folga no limite diário e folga antes do drawdown máximo.';

function HeroCopy() {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? undefined : ENTER;

  return (
    <motion.div
      initial={reduceMotion ? undefined : 'hidden'}
      animate={reduceMotion ? undefined : 'visible'}
      variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <motion.p
        variants={variants}
        transition={{ duration: 0.7, ease: EASE }}
        className={`${FONT_MONO} rounded-full bg-zinc-900/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.6)] backdrop-blur-md sm:text-[11px]`}
      >
        Controle operacional para prop firms
      </motion.p>

      <motion.h1
        variants={variants}
        transition={{ duration: 0.8, ease: EASE }}
        className="max-w-5xl text-balance text-4xl leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[76px]"
      >
        <span>Proteja sua conta</span>
        <motion.span
          aria-hidden="true"
          className="mx-[0.25em] inline-flex translate-y-[0.08em] align-middle"
          animate={reduceMotion ? undefined : { rotate: [-3, 3, -3], y: [-2, 2, -2], scale: [0.82, 0.86, 0.82] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FortifyMark className="h-[0.8em] w-[0.8em] text-white" />
        </motion.span>
        <span className="font-medium text-zinc-400">antes da próxima operação.</span>
      </motion.h1>

      <motion.p
        variants={variants}
        transition={{ duration: 0.7, ease: EASE }}
        className="max-w-2xl text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base"
      >
        Conecte sua conta MT5, vincule o programa contratado e acompanhe drawdown, limite diário e regras da mesa
        em um só painel.
      </motion.p>

      <motion.div
        variants={variants}
        transition={{ duration: 0.7, ease: EASE }}
        className="mt-1 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
      >
        <TactileButton to={AUTH_SIGNUP_PATH} onClick={() => trackCta('hero_primary', 'hero', AUTH_SIGNUP_PATH)}>
          Criar conta
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </TactileButton>
        <TactileButton
          to="/vendas/planos"
          variant="ghost"
          onClick={() => trackCta('hero_secondary', 'hero', '/vendas/planos')}
        >
          Ver planos
        </TactileButton>
      </motion.div>
    </motion.div>
  );
}

function ProductShot() {
  return (
    <figure className="relative w-[min(1040px,92vw)]">
      <div className="relative overflow-hidden rounded-3xl bg-zinc-950 shadow-[0_32px_100px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.25)]">
        <img
          src={calculatorShot}
          alt={SCREENSHOT_ALT}
          width={1184}
          height={844}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
      <figcaption className={`${FONT_MONO} mt-3 text-center text-[10px] uppercase tracking-[0.22em] text-zinc-400`}>
        Tela real · Calculadora de Risco · simulação
      </figcaption>
    </figure>
  );
}

function LogoRail({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div>
      <p className={`${FONT_MONO} mb-3 text-center text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-400`}>
        Mesas proprietárias no catálogo do Fortify
      </p>
      <FirmLogoStrip reduceMotion={reduceMotion} pauseOnHover />
    </div>
  );
}

export function CinematicHero() {
  const reduceMotion = useReducedMotion();
  return reduceMotion ? <StaticHero /> : <ScrollHero />;
}

/** Sem movimento: o mesmo conteúdo em fluxo normal, sem sticky nem transformações. */
function StaticHero() {
  return (
    <section aria-label="Apresentação" className="relative overflow-hidden pb-16 pt-32">
      <div className="absolute inset-0 h-[70vh]">
        <Orb />
      </div>
      <div className="relative z-10 px-6">
        <HeroCopy />
      </div>
      <div className="relative z-10 mt-16 flex justify-center px-4">
        <ProductShot />
      </div>
      <div className="relative z-10 mt-14">
        <LogoRail reduceMotion />
      </div>
    </section>
  );
}

function ScrollHero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 20, restDelta: 0.001 });

  const copyOpacity = useTransform(progress, [0, 0.35], [1, 0]);
  const copyBlur = useTransform(progress, [0, 0.35], ['blur(0px)', 'blur(12px)']);
  const copyY = useTransform(progress, [0, 0.35], [-40, -160]);
  const copyPointer = useTransform(copyOpacity, (v) => (v < 0.1 ? 'none' : 'auto'));

  const orbY = useTransform(progress, [0, 0.7], ['-50%', '-78%']);
  const orbOpacity = useTransform(progress, [0, 0.7], [1, 0.45]);

  const shotOpacity = useTransform(progress, [0.18, 0.5], [0, 1]);
  const shotY = useTransform(progress, [0.18, 0.75], [60, 0]);
  const shotScale = useTransform(progress, [0.18, 0.85], [0.85, 1]);

  const railOpacity = useTransform(progress, [0, 0.18], [1, 0]);
  const railPointer = useTransform(railOpacity, (v) => (v < 0.1 ? 'none' : 'auto'));

  return (
    <section ref={ref} aria-label="Apresentação" className="relative h-[180vh] w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <Orb style={{ y: orbY, opacity: orbOpacity }} />

        <motion.div
          style={{ opacity: copyOpacity, filter: copyBlur, y: copyY, pointerEvents: copyPointer }}
          className="absolute inset-0 z-10 flex items-center justify-center px-6 -mt-16 sm:-mt-32"
        >
          <HeroCopy />
        </motion.div>

        <motion.div
          style={{ opacity: shotOpacity, y: shotY, scale: shotScale }}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center pt-10"
        >
          <ProductShot />
        </motion.div>

        <motion.div
          style={{ opacity: railOpacity, pointerEvents: railPointer }}
          className="absolute inset-x-0 bottom-5 z-30"
        >
          <LogoRail reduceMotion={false} />
        </motion.div>
      </div>
    </section>
  );
}
