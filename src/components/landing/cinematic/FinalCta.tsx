import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { LANDING_NAV_LINKS } from '@/components/landing/navLinks';
import { AUTH_SIGNUP_PATH, trackCta } from '@/components/landing/PublicShell';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support';
import { TactileButton } from './TactileButton';
import { FONT_DISPLAY } from './fonts';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Substitui o fundo WebGL do template por luz em CSS: mesmo clima, sem dependência nova. */
function GlowField() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <motion.div
        className="absolute -left-1/4 top-1/2 h-[140%] w-3/4 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(165,88,251,0.45),transparent)] blur-2xl"
        animate={reduceMotion ? undefined : { x: ['0%', '12%', '0%'], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-1/4 top-0 h-[120%] w-2/3 rounded-full bg-[radial-gradient(closest-side,rgba(73,34,229,0.5),transparent)] blur-2xl"
        animate={reduceMotion ? undefined : { x: ['0%', '-10%', '0%'], opacity: [0.8, 0.5, 0.8] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
    </div>
  );
}

const FOOTER_EXTRA = [
  { label: 'Blog', to: '/blog' },
  { label: 'Entrar', to: '/auth' },
];

// /pricing é a tela de assinatura do produto (abre dentro do app com sessão):
// só a landing aponta para ela; as páginas internas levam a /vendas/planos.
const CHECKOUT_LINK = { label: 'Escolher plano', to: '/pricing' };

type Secondary = { label: string; to?: string; href?: string; destination: string };

const DEFAULT_TITLE = 'Veja os limites da sua conta antes da próxima ordem.';
const DEFAULT_BODY =
  'Crie a conta, conecte o MT5 e vincule o programa da sua mesa. O Fortify mostra o estado da conta; as ordens continuam na sua plataforma.';
const DEFAULT_SECONDARY: Secondary = { label: 'Ver planos', to: '/vendas/planos', destination: '/vendas/planos' };
const DEFAULT_TRACKING = { primary: 'final_primary', secondary: 'final_secondary', location: 'final_cta' };

export function FinalCta({
  title = DEFAULT_TITLE,
  body = DEFAULT_BODY,
  secondary = DEFAULT_SECONDARY,
  tracking = DEFAULT_TRACKING,
}: {
  title?: string;
  body?: string;
  secondary?: Secondary;
  tracking?: { primary: string; secondary: string; location: string };
}) {
  const reduceMotion = useReducedMotion();
  const enter = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
          whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
          viewport: { once: true, margin: '0px 0px -12% 0px' },
          transition: { duration: 0.7, ease: EASE, delay },
        };

  return (
    <section
      aria-labelledby="cta-title"
      className="relative z-30 flex min-h-[80vh] w-full items-center justify-center overflow-hidden bg-black px-6 py-20"
    >
      <motion.div
        {...enter()}
        className="relative w-full max-w-5xl rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent p-1.5 shadow-[0_32px_100px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.25)] sm:p-2"
      >
        <div className="relative flex w-full flex-col justify-between gap-10 overflow-hidden rounded-[1.6rem] border border-white/5 bg-zinc-950/90 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:gap-14 sm:p-12 md:p-14">
          <GlowField />
          <div className="relative z-10 flex max-w-xl flex-col items-start text-left">
            <motion.h2
              id="cta-title"
              {...enter(0.1)}
              className={`${FONT_DISPLAY} text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl`}
            >
              {title}
            </motion.h2>
            <motion.p {...enter(0.2)} className="mt-4 text-pretty text-sm leading-relaxed text-zinc-400">
              {body}
            </motion.p>
          </div>
          <motion.div {...enter(0.3)} className="relative z-10 flex flex-col gap-3 sm:ml-auto sm:flex-row sm:items-center">
            <TactileButton to={AUTH_SIGNUP_PATH} onClick={() => trackCta(tracking.primary, tracking.location, AUTH_SIGNUP_PATH)}>
              Criar conta
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TactileButton>
            <TactileButton
              to={secondary.to}
              href={secondary.href}
              variant="glass"
              onClick={() => trackCta(tracking.secondary, tracking.location, secondary.destination)}
            >
              {secondary.label}
            </TactileButton>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

export function CinematicFooter({ checkoutLink = false }: { checkoutLink?: boolean }) {
  const links = [...LANDING_NAV_LINKS, ...(checkoutLink ? [CHECKOUT_LINK] : []), ...FOOTER_EXTRA];
  return (
    <footer className="relative z-30 flex w-full justify-center bg-black px-6 pb-10">
      <div className="flex w-full max-w-5xl flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 text-xs text-zinc-400 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-2">
            <FortifyMark className="size-4 text-zinc-300" />
            <span>© {new Date().getFullYear()} Fortify.</span>
          </div>
          <p className="max-w-xs text-center text-[11px] leading-relaxed text-zinc-500 sm:text-left">
            O Fortify não é corretora, não executa ordens, não dá aconselhamento financeiro e não garante aprovação em desafios de mesas proprietárias.
          </p>
        </div>
        <nav aria-label="Rodapé" className="flex max-w-lg flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-end">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="transition-colors hover:text-zinc-200 focus-visible:text-zinc-100 focus-visible:underline focus-visible:outline-none">
              {link.label}
            </Link>
          ))}
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCta('footer_support', 'footer', 'whatsapp_support')}
            className="transition-colors hover:text-zinc-200 focus-visible:text-zinc-100 focus-visible:underline focus-visible:outline-none"
          >
            Falar com suporte
          </a>
        </nav>
      </div>
    </footer>
  );
}
