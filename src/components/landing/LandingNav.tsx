import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { useAuth } from '@/hooks/useAuth';
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
  { label: 'Planos', to: '/pricing' },
  { label: 'Quem somos', to: '/vendas/quem-somos' },
  { label: 'FAQ', to: '/vendas/faq' },
];

export function LandingNav({ className }: { className?: string }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (ctaId: string, destination: string) => {
    pushDataLayerEvent('cta_click', { cta_id: ctaId, cta_location: 'header', destination });
    setMenuOpen(false);
    navigate(destination);
  };

  return (
    <div className={cn('relative mx-auto max-w-6xl px-4 sm:px-6', className)}>
      <nav className="flex items-center justify-between gap-3 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-2 shadow-[0_8px_30px_rgba(24,24,27,0.06)] backdrop-blur-md sm:px-4">
        <Link to="/vendas" className="flex shrink-0 items-center gap-2 pl-1">
          <FortifyMark className="h-6 w-6 text-zinc-900" />
          <span className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-900">Fortify</span>
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
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 lg:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          {session ? (
            <button
              type="button"
              onClick={() => go('header_dashboard', '/')}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Ir para o painel
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => go('header_login', '/auth')}
                className="hidden rounded-full px-3.5 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:inline-flex"
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => go('header_signup', '/auth')}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Começar agora
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div className="absolute left-4 right-4 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-[0_8px_30px_rgba(24,24,27,0.10)] backdrop-blur-md sm:left-6 sm:right-6 lg:hidden">
          {LANDING_NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === link.to
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              {link.label}
            </Link>
          ))}
          {!session && (
            <button
              type="button"
              onClick={() => go('header_login_mobile', '/auth')}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              Entrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
