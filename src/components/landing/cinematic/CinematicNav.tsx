import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { LANDING_NAV_LINKS } from '@/components/landing/navLinks';
import { AUTH_SIGNUP_PATH, trackCta } from '@/components/landing/PublicShell';
import { useAuth } from '@/hooks/useAuth';
import { TactileButton } from './TactileButton';
import { FONT_DISPLAY } from './fonts';

export function CinematicNav() {
  const { session } = useAuth();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desfoque progressivo do topo: some a borda dura quando o conteúdo passa por baixo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[120px] backdrop-blur-[8px] [background:linear-gradient(to_top,transparent,rgb(0,0,0))] [mask-image:linear-gradient(rgb(0,0,0)_50%,transparent)]"
      />

      <motion.header
        initial={reduceMotion ? undefined : { opacity: 0, y: -12, filter: 'blur(6px)' }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-3 z-50 px-4 sm:px-6"
      >
        <nav aria-label="Navegação principal" className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            to="/vendas"
            className="flex items-center gap-2 rounded-full px-1 py-1 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <FortifyMark className="h-6 w-6 text-white" />
            <span className={`${FONT_DISPLAY} text-[17px] font-semibold tracking-tight`}>Fortify</span>
          </Link>

          <div className="hidden items-center gap-0.5 rounded-full bg-zinc-900/70 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.6)] backdrop-blur-md lg:flex">
            {LANDING_NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {session ? (
              <TactileButton to="/" size="sm" onClick={() => trackCta('header_dashboard', 'header', '/')}>
                Ir para o painel
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </TactileButton>
            ) : (
              <>
                <TactileButton
                  to="/auth"
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => trackCta('header_login', 'header', '/auth')}
                >
                  Entrar
                </TactileButton>
                <TactileButton
                  to={AUTH_SIGNUP_PATH}
                  size="sm"
                  onClick={() => trackCta('header_signup', 'header', AUTH_SIGNUP_PATH)}
                >
                  Criar conta
                </TactileButton>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="cinematic-mobile-menu"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-200 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-md transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
            >
              {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              id="cinematic-mobile-menu"
              initial={reduceMotion ? undefined : { opacity: 0, y: -8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.25 }}
              className="mx-auto mt-2 max-w-6xl rounded-2xl bg-zinc-950 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_48px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl lg:hidden"
            >
              {LANDING_NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              {!session && (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Entrar
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
