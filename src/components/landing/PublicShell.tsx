import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { LandingNav } from '@/components/landing/LandingNav';
import { fortifyMotion } from '@/lib/motion';
import { pushDataLayerEvent } from '@/lib/analytics';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support';
import { cn } from '@/lib/utils';

/**
 * Casca única das páginas públicas (/vendas/*, /pricing deslogado).
 *
 * Mora num arquivo próprio, e não em landingSections.tsx, de propósito:
 * landingSections importa o catálogo de mesas (propFirmRules, ~146 kB de
 * chunk). A PricingPage também precisa da casca e não pode arrastar esse
 * catálogo junto — separar mantém o bundle de /pricing enxuto.
 */

/** Fundo das páginas públicas — o mesmo off-white do hero. */
export const PUBLIC_BG = '#FAF9F5';

/**
 * Força o tema claro enquanto a página pública está montada e restaura o
 * anterior ao sair. Sem tocar no localStorage: a preferência do usuário dentro
 * do app continua intacta. Página de anúncio precisa ser idêntica para todo
 * visitante, independente do tema salvo.
 */
export function useForcedLightTheme(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = 'light';
    return () => {
      if (previous) root.dataset.theme = previous;
      else delete root.dataset.theme;
    };
  }, [enabled]);
}

export function trackCta(ctaId: string, location: string, destination: string) {
  pushDataLayerEvent('cta_click', { cta_id: ctaId, cta_location: location, destination });
}

/** Entrada suave e curta ao entrar no viewport. Respeita prefers-reduced-motion
 *  pelo MotionConfig global (App.tsx), então não precisa de guarda aqui. */
export function ScrollReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...fortifyMotion.reveal, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Faixa de conteúdo com o respiro padrão do sistema público. */
export function PublicSection({
  children,
  className,
  width = 'default',
}: {
  children: ReactNode;
  className?: string;
  /** `narrow` para blocos de leitura (texto corrido), `default` para grades. */
  width?: 'default' | 'narrow';
}) {
  return (
    <section
      className={cn(
        'mx-auto w-full px-5 sm:px-8',
        width === 'narrow' ? 'max-w-3xl' : 'max-w-6xl',
        'py-14 sm:py-20',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Cabeçalho editorial de página interna: eyebrow + título + linha de apoio. */
export function PublicPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mx-auto w-full max-w-6xl px-5 pb-2 pt-14 sm:px-8 sm:pt-20">
      <ScrollReveal className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{eyebrow}</p>
        <h1 className="mt-4 text-[2rem] font-bold leading-[1.06] tracking-[-0.02em] text-zinc-900 text-balance sm:text-[2.6rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-600">{description}</p>
        )}
      </ScrollReveal>
    </header>
  );
}

/**
 * Primitivas compartilhadas pelas quatro páginas públicas. Existem para que
 * "mesmo sistema visual" seja garantido por construção: raio, borda, respiro,
 * escala tipográfica e peso de sombra ficam definidos num lugar só.
 */

/** Cartão padrão: plano, borda de 1px, sem sombra pesada. */
export function PublicCard({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(24,24,27,0.04)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Título de seção + linha de apoio, com o respiro padrão abaixo. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <ScrollReveal className={cn('max-w-2xl', className)}>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{eyebrow}</p>
      )}
      <h2 className="mt-3 text-[1.55rem] font-bold leading-[1.12] tracking-[-0.02em] text-zinc-900 text-balance sm:text-[2rem]">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">{description}</p>
      )}
    </ScrollReveal>
  );
}

/** Botão público. `primary` é o preto sólido do hero; `secondary` é o contorno. */
export function PublicButton({
  children,
  onClick,
  variant = 'primary',
  className,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors',
        variant === 'primary'
          ? 'bg-zinc-900 text-white shadow-[0_10px_30px_rgba(24,24,27,0.16)] hover:bg-zinc-800'
          : 'border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Faixa de fechamento reutilizada no fim de cada página pública. */
export function PublicClosingCta({
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <PublicSection>
      <ScrollReveal>
        <div className="rounded-3xl border border-zinc-200/80 bg-white px-6 py-12 text-center sm:px-12">
          <h2 className="mx-auto max-w-xl text-[1.55rem] font-bold leading-[1.12] tracking-[-0.02em] text-zinc-900 text-balance sm:text-[2rem]">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-zinc-600">{description}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PublicButton onClick={onPrimary} className="w-full sm:w-auto">
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </PublicButton>
            {secondaryLabel && onSecondary && (
              <PublicButton variant="secondary" onClick={onSecondary} className="w-full sm:w-auto">
                {secondaryLabel}
              </PublicButton>
            )}
          </div>
        </div>
      </ScrollReveal>
    </PublicSection>
  );
}
const FOOTER_LINKS: { label: string; to: string }[] = [
  { label: 'Como usar', to: '/vendas/como-funciona' },
  { label: 'Recursos', to: '/vendas/recursos' },
  { label: 'Mesas suportadas', to: '/vendas/mesas' },
  { label: 'Quem somos', to: '/vendas/quem-somos' },
  { label: 'Planos', to: '/vendas/planos' },
  { label: 'FAQ', to: '/vendas/faq' },
  { label: 'Blog', to: '/blog' },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-zinc-200/80">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <FortifyMark className="h-6 w-6 text-zinc-900" />
              <span className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-900">Fortify</span>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-zinc-500">
              Plataforma de gestão de risco para contas de mesas proprietárias. O Fortify não é
              corretora, não dá aconselhamento financeiro e não fornece sinais de entrada.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-3">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-900"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-900"
            >
              Suporte
            </a>
          </nav>
        </div>

        <p className="mt-10 border-t border-zinc-200/80 pt-6 text-[12px] text-zinc-400">
          © {new Date().getFullYear()} Fortify. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

/**
 * Página pública completa: tema claro + navbar fixa + conteúdo + rodapé.
 *
 * `forceLightTheme` existe porque a PricingPage é compartilhada: deslogada ela
 * é uma página pública (tema claro), logada ela vive dentro do AppLayout e tem
 * que respeitar o tema que o usuário escolheu no produto.
 */
export function PublicShell({
  children,
  forceLightTheme = true,
  className,
}: {
  children: ReactNode;
  forceLightTheme?: boolean;
  className?: string;
}) {
  useForcedLightTheme(forceLightTheme);

  return (
    <div className={cn('min-h-screen bg-[#FAF9F5] text-zinc-900', className)}>
      <div className="sticky top-0 z-30 bg-[#FAF9F5]/85 py-4 backdrop-blur-md">
        <LandingNav />
      </div>
      {children}
      <PublicFooter />
    </div>
  );
}
