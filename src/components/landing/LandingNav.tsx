import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { useAuth } from '@/hooks/useAuth';
import { AUTH_SIGNUP_PATH } from '@/components/landing/PublicShell';
import { pushDataLayerEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Navbar flutuante compartilhada por todas as páginas públicas de marketing
 * (/vendas e suas páginas internas). Cada item aponta para uma ROTA própria —
 * a landing virou uma tela única, sem rolagem, então "Como funciona", "Mesas"
 * e "FAQ" moraram em páginas separadas.
 */
const LANDING_NAV_LINKS: {
  label: string;
  to: string;
}[] = [
  { label: 'Como usar', to: '/vendas/como-funciona' },
  { label: 'Recursos', to: '/vendas/recursos' },
  { label: 'Mesas', to: '/vendas/mesas' },
  { label: 'Planos', to: '/vendas/planos' },
  { label: 'Quem somos', to: '/vendas/quem-somos' },
  { label: 'FAQ', to: '/vendas/faq' },
];

export function LandingNav({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const darkTone = tone === 'dark';

  const go = (ctaId: string, destination: string) => {
    pushDataLayerEvent('cta_click', { cta_id: ctaId, cta_location: 'header', destination });
    setMenuOpen(false);
    navigate(destination);
  };

  return (
    <div className={cn('relative mx-auto max-w-6xl px-4 sm:px-6', className)}>
      <nav className={cn(
        'flex items-center justify-between gap-3 rounded-full border px-3 py-2 backdrop-blur-md sm:px-4',
        darkTone
          ? 'border-white/10 bg-[#0b1018]/90 shadow-[0_8px_30px_rgba(0,0,0,0.22)]'
          : 'border-zinc-200/80 bg-white/80 shadow-[0_8px_30px_rgba(24,24,27,0.06)]',
      )}>
        <Link to="/vendas" className="flex shrink-0 items-center gap-2 pl-1">
          <FortifyMark className={cn('h-6 w-6', darkTone ? 'text-white' : 'text-zinc-900')} />
          <span className={cn('text-sm font-bold uppercase tracking-[0.14em]', darkTone ? 'text-white' : 'text-zinc-900')}>Fortify</span>
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {LANDING_NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              aria-current={pathname === link.to ? 'page' : undefined}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                pathname === link.to
                  ? darkTone ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-900'
                  : darkTone ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors lg:hidden', darkTone ? 'text-slate-200 hover:bg-white/10' : 'text-zinc-700 hover:bg-zinc-100')}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          {session ? (
            <button
              type="button"
              onClick={() => go('header_dashboard', '/')}
              className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors', darkTone ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'bg-zinc-900 text-white hover:bg-zinc-800')}
            >
              Ir para o painel
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => go('header_login', '/auth')}
                className={cn('hidden rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors sm:inline-flex', darkTone ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900')}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => go('header_signup', AUTH_SIGNUP_PATH)}
                className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors', darkTone ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'bg-zinc-900 text-white hover:bg-zinc-800')}
              >
                Começar agora
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div className={cn('absolute left-4 right-4 top-full z-50 mt-2 overflow-hidden rounded-lg border p-2 backdrop-blur-md sm:left-6 sm:right-6 lg:hidden', darkTone ? 'border-white/10 bg-[#0b1018]/95 shadow-[0_8px_30px_rgba(0,0,0,0.28)]' : 'border-zinc-200/80 bg-white/95 shadow-[0_8px_30px_rgba(24,24,27,0.10)]')}>
          {LANDING_NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === link.to
                  ? darkTone ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-900'
                  : darkTone ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              {link.label}
            </Link>
          ))}
          {!session && (
            <button
              type="button"
              onClick={() => go('header_login_mobile', '/auth')}
              className={cn('block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors', darkTone ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900')}
            >
              Entrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
