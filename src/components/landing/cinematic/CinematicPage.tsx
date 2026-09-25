import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useForcedTheme } from '@/components/landing/PublicShell';
import { cn } from '@/lib/utils';
import { CinematicNav } from './CinematicNav';
import { CinematicFooter } from './FinalCta';
import { Orb } from './Orb';
import { CINEMATIC_FONT_VARS, FONT_DISPLAY, FONT_MONO, FONT_SANS, useCinematicFonts } from './fonts';

const EASE = [0.22, 1, 0.36, 1] as const;
const IN_VIEW = { once: true, margin: '0px 0px -10% 0px' } as const;

/**
 * Casca de toda página pública no visual da landing: fundo preto, fontes do
 * template, navegação fixa e rodapé. O tema escuro é forçado para que peças
 * do app usadas aqui (acordeão, carrossel, toasts, aviso de cookies) sigam o
 * mesmo fundo, sem depender do tema que o visitante salvou dentro do produto.
 */
export function CinematicPage({
  children,
  checkoutLinkInFooter = false,
}: {
  children: ReactNode;
  checkoutLinkInFooter?: boolean;
}) {
  useForcedTheme('dark');
  useCinematicFonts();

  return (
    <div style={CINEMATIC_FONT_VARS} className={`${FONT_SANS} relative min-h-screen w-full bg-black text-white antialiased`}>
      <CinematicNav />
      <main>{children}</main>
      <CinematicFooter checkoutLink={checkoutLinkInFooter} />
    </div>
  );
}

/** Entrada do template: sobe, clareia e perde o desfoque ao entrar na tela. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li';
}) {
  const reduceMotion = useReducedMotion();
  const Tag = as === 'li' ? motion.li : motion.div;
  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={IN_VIEW}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16, filter: 'blur(8px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: 0.7, ease: EASE, delay },
        };

  return (
    <section aria-labelledby="page-title" className="relative overflow-x-clip px-6 pb-12 pt-36 sm:pb-16 sm:pt-44">
      <div className="absolute inset-x-0 top-0 h-[64vh]">
        <Orb />
      </div>
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <motion.p
          {...enter(0.05)}
          className={`${FONT_MONO} rounded-full bg-zinc-900/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.6)] backdrop-blur-md sm:text-[11px]`}
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          id="page-title"
          {...enter(0.15)}
          className="text-balance text-4xl leading-[1.08] tracking-tight text-white sm:text-6xl"
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p {...enter(0.25)} className="max-w-2xl text-pretty text-sm leading-relaxed text-zinc-300 sm:text-base">
            {description}
          </motion.p>
        )}
      </div>
    </section>
  );
}

/** Página interna completa: casca + cabeçalho com o orbe de luz. */
export function CinematicSubPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <CinematicPage>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
    </CinematicPage>
  );
}

export function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('relative z-10 mx-auto w-full max-w-6xl px-5 py-12 sm:px-6 sm:py-16', className)}>
      {children}
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && (
        <Reveal>
          <p className={`${FONT_MONO} mb-4 text-[11px] uppercase tracking-[0.22em] text-zinc-400`}>{eyebrow}</p>
        </Reveal>
      )}
      <Reveal delay={0.08}>
        <h2 className={`${FONT_DISPLAY} text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl`}>{title}</h2>
      </Reveal>
      {description && (
        <Reveal delay={0.16}>
          <p className="mt-4 text-pretty text-sm leading-relaxed text-zinc-400">{description}</p>
        </Reveal>
      )}
    </div>
  );
}

/** Card de vidro do template: moldura com gradiente e miolo escuro translúcido. */
export function GlassCard({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={cn(
        'relative h-full w-full rounded-[1.6rem] border border-white/10 bg-gradient-to-b from-white/10 via-white/[0.04] to-transparent p-1.5 shadow-[0_32px_100px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)]',
        className,
      )}
    >
      <div
        className={cn(
          'relative h-full overflow-hidden rounded-[1.25rem] border border-white/5 bg-zinc-950/90 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-6',
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
