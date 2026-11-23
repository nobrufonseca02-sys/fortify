import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BellRing, Flame, Gift, Lock, MessageCircle, Play, ShieldCheck } from 'lucide-react';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { FirmLogoStrip } from '@/components/landing/FirmLogoMarquee';
import { useForcedTheme } from '@/components/landing/PublicShell';
import { Orb } from '@/components/landing/cinematic/Orb';
import { Reveal } from '@/components/landing/cinematic/CinematicPage';
import { CINEMATIC_FONT_VARS, FONT_MONO, FONT_SANS, useCinematicFonts } from '@/components/landing/cinematic/fonts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { trackGrupoVipLead } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import {
  GRUPO_VIP_POSTER,
  GRUPO_VIP_VIDEO_URL,
  OFERTA,
  WHATSAPP_VIP_GROUP_URL,
  ofertaAtiva,
} from '@/content/grupoVip';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Navegador interno do Instagram/Facebook. Ali `target="_blank"` costuma abrir
 * outra aba do próprio navegador interno, que nem sempre entrega o link ao app
 * do WhatsApp. Navegar na mesma aba deixa o sistema abrir o app direto.
 */
function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(navigator.userAgent);
}

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------

function WhatsAppCta({
  location,
  children,
  size = 'lg',
  className,
}: {
  location: string;
  children: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackGrupoVipLead(location);
    if (isInAppBrowser()) {
      event.preventDefault();
      // Pequena folga para o pixel e o dataLayer saírem antes da navegação.
      window.setTimeout(() => {
        window.location.href = WHATSAPP_VIP_GROUP_URL;
      }, 180);
    }
  };

  return (
    <motion.a
      href={WHATSAPP_VIP_GROUP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 25 }}
      className={cn(
        'group relative isolate inline-flex w-full select-none items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-white font-semibold uppercase tracking-[0.04em] text-zinc-950',
        'shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_40px_-12px_rgba(165,88,251,0.65)] transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_16px_48px_-10px_rgba(165,88,251,0.85)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        size === 'lg' ? 'min-h-14 px-6 text-[15px] sm:text-base' : 'min-h-12 px-5 text-sm',
        className,
      )}
    >
      {/* Brilho que atravessa o botão de tempos em tempos: chama o olho sem piscar. */}
      {!reduceMotion && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 -z-10 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-violet-300/50 to-transparent"
          animate={{ x: ['0%', '450%'] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.8, ease: 'easeInOut' }}
        />
      )}
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </motion.a>
  );
}

// ---------------------------------------------------------------------------
// Barra de urgência
// ---------------------------------------------------------------------------

function UrgencyBar() {
  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-violet-950/95 via-zinc-950/95 to-indigo-950/95 backdrop-blur-md">
      <p className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-2.5 text-center text-[12px] leading-snug text-zinc-200 sm:text-[13px]">
        <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-white">Black November:</strong> de{' '}
          <s className="text-zinc-400">{OFERTA.precoDe}</s> por{' '}
          <strong className="font-semibold text-white">{OFERTA.precoPor}/mês</strong> até {OFERTA.prazoTexto}
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroMedia() {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="relative w-full">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)]">
        {playing && GRUPO_VIP_VIDEO_URL ? (
          <video
            className="absolute inset-0 h-full w-full bg-black object-contain"
            src={GRUPO_VIP_VIDEO_URL}
            poster={GRUPO_VIP_POSTER}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <>
            {/* Ativo LCP: carrega já, com prioridade, nas dimensões reais para não haver salto de layout. */}
            <img
              src={GRUPO_VIP_POSTER}
              alt="Fortify Guard aberto no MetaTrader 5: conta dentro das regras, folga de perda diária, drawdown máximo, consistência e dias mínimos."
              width={1280}
              height={720}
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {GRUPO_VIP_VIDEO_URL && (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                aria-label="Assistir ao vídeo do Fortify Guard"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-zinc-950 shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105">
                  <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
                </span>
              </button>
            )}
          </>
        )}
      </div>
      <figcaption className={`${FONT_MONO} mt-2.5 text-center text-[10px] uppercase tracking-[0.22em] text-zinc-500`}>
        Tela real · Fortify Guard no MT5
      </figcaption>
    </figure>
  );
}

function Hero({ ctaRef }: { ctaRef: RefObject<HTMLDivElement> }) {
  const reduceMotion = useReducedMotion();
  // Entrada curta e escalonada; sem movimento, tudo aparece de uma vez (é o LCP).
  const enter = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: EASE, delay },
        };

  return (
    <section aria-labelledby="grupo-vip-titulo" className="relative overflow-hidden px-5 pb-12 pt-7 sm:pt-14">
      {/* Iluminação atmosférica: o eclipse do Orb no topo, atrás do título. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-[22vh] h-[52vh] opacity-80 sm:-top-[30vh] sm:h-[70vh]">
        <Orb />
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <motion.p
          {...enter(0)}
          className={`${FONT_MONO} inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-md sm:text-[11px]`}
        >
          <span aria-hidden="true" className="inline-flex">
            <FortifyMark className="h-3 w-3 text-white" />
          </span>
          Grupo VIP oficial · Fortify Guard
        </motion.p>

        <motion.h1
          id="grupo-vip-titulo"
          {...enter(0.06)}
          className="mt-4 text-balance text-[30px] font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl"
        >
          Libere 3 dias de acesso gratuito ao <span className="text-violet-300">Fortify Guard</span> no MT5
        </motion.h1>

        <motion.p
          {...enter(0.12)}
          className="mt-3 max-w-xl text-pretty text-[15px] leading-relaxed text-zinc-400 sm:text-base"
        >
          Monitore em tempo real o drawdown diário, equity flutuante e regras oficiais de 14 grandes mesas
          proprietárias antes de colocar sua conta em risco.
        </motion.p>

        {/* Sem animação de entrada: é o maior elemento da dobra e tem que pintar logo. */}
        <div className="mt-6 w-full">
          <HeroMedia />
        </div>

        <motion.div
          ref={ctaRef}
          {...enter(0.24)}
          className="mt-6 w-full max-w-md"
        >
          <WhatsAppCta location="hero">Entrar no Grupo VIP do WhatsApp</WhatsAppCta>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-zinc-400">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Acesso 100% gratuito ao grupo · Sem necessidade de cartão
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Benefícios
// ---------------------------------------------------------------------------

type Beneficio = { icon: typeof Gift; titulo: string; texto: string; destaque?: boolean };

function beneficios(comOferta: boolean): Beneficio[] {
  const lista: Beneficio[] = [
    {
      icon: Gift,
      titulo: '3 dias de teste grátis imediato',
      texto: 'Link exclusivo liberado assim que você entra no grupo, para instalar o EA no MT5.',
    },
    {
      icon: ShieldCheck,
      titulo: 'Blindagem de regras ao vivo',
      texto: 'Acompanhamento de limite diário, trailing drawdown e consistência de lote.',
    },
    {
      icon: BellRing,
      titulo: 'Notícias em tempo real',
      texto: 'Alerta de eventos de alto impacto com contagem regressiva em minutos.',
    },
  ];
  if (comOferta) {
    lista.push({
      icon: Lock,
      titulo: 'Condição travada por 12 meses',
      texto: `De ${OFERTA.precoDe} por ${OFERTA.precoPor}/mês, exclusivo para membros do grupo até ${OFERTA.prazoTexto}.`,
      destaque: true,
    });
  }
  return lista;
}

function Beneficios({ comOferta }: { comOferta: boolean }) {
  return (
    <section aria-labelledby="grupo-vip-beneficios" className="px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <h2 id="grupo-vip-beneficios" className="text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          O que você recebe dentro do grupo
        </h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {beneficios(comOferta).map(({ icon: Icon, titulo, texto, destaque }, index) => (
            <Reveal as="li" key={titulo} delay={index * 0.06}>
              <div
                className={cn(
                  'flex h-full gap-4 rounded-2xl p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
                  destaque
                    ? 'bg-gradient-to-br from-violet-950/70 to-indigo-950/60 shadow-[0_0_0_1px_rgba(165,88,251,0.45)]'
                    : 'bg-zinc-900/60',
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    destaque ? 'bg-violet-500/20 text-violet-200' : 'bg-white/5 text-zinc-200',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-white">{titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{texto}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Mesas
// ---------------------------------------------------------------------------

function Mesas() {
  const reduceMotion = useReducedMotion();
  return (
    <section aria-labelledby="grupo-vip-mesas" className="py-10">
      <h2
        id="grupo-vip-mesas"
        className={`${FONT_MONO} mb-4 px-5 text-center text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-400`}
      >
        Mesas proprietárias com regras no Fortify
      </h2>
      <FirmLogoStrip reduceMotion={Boolean(reduceMotion)} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

function faq(comOferta: boolean) {
  const itens = [
    {
      q: 'Preciso pagar algo para entrar no grupo?',
      a: 'Não. A entrada no grupo e o teste de 3 dias do Fortify Guard são gratuitos, sem cartão.',
    },
    {
      q: 'Funciona em qual plataforma?',
      a: 'Direto no MetaTrader 5 para desktop. O Fortify Guard é instalado como EA no seu MT5 e mostra o painel no próprio gráfico.',
    },
  ];
  if (comOferta) {
    itens.push({
      q: `Até quando vale o desconto de ${OFERTA.precoPor}?`,
      a: `É exclusivo para quem estiver no grupo, até ${OFERTA.prazoTexto} (horário de Brasília).`,
    });
  }
  return itens;
}

function Faq({ comOferta }: { comOferta: boolean }) {
  return (
    <section aria-labelledby="grupo-vip-faq" className="px-5 py-12">
      <div className="mx-auto max-w-2xl">
        <h2 id="grupo-vip-faq" className="text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Dúvidas rápidas
        </h2>
        <Accordion type="single" collapsible className="mt-6">
          {faq(comOferta).map(({ q, a }, index) => (
            <AccordionItem key={q} value={`item-${index}`} className="border-white/10">
              <AccordionTrigger className="min-h-12 text-left text-[15px] text-zinc-100 hover:no-underline">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-zinc-400">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA fixa no rodapé (mobile)
// ---------------------------------------------------------------------------

/**
 * Aparece só depois que o botão do hero sai da tela por cima — enquanto ele está
 * visível, duas chamadas iguais competiriam. Fica abaixo (z-40) do aviso de
 * cookies (z-50) para não esconder a escolha de consentimento.
 */
function StickyCta({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.3, ease: EASE }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:hidden"
        >
          <WhatsAppCta location="sticky_footer" size="md">
            Entrar no Grupo VIP
          </WhatsAppCta>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useHeroCtaOutOfView() {
  const ref = useRef<HTMLDivElement>(null);
  const [outOfView, setOutOfView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      // Só conta como "saiu" quando ficou acima da viewport (a pessoa rolou para baixo).
      setOutOfView(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, outOfView };
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function GrupoVipPage() {
  useForcedTheme('dark');
  useCinematicFonts();
  const comOferta = ofertaAtiva();
  const { ref: heroCtaRef, outOfView } = useHeroCtaOutOfView();

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Grupo VIP Fortify Guard · 3 dias grátis no MT5';
    // Página de campanha: não deve competir com /vendas na busca orgânica.
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, follow';
    document.head.appendChild(robots);
    return () => {
      document.title = anterior;
      robots.remove();
    };
  }, []);

  return (
    <div
      style={CINEMATIC_FONT_VARS}
      className={`${FONT_SANS} relative min-h-screen w-full overflow-x-hidden bg-black text-white antialiased`}
    >
      {comOferta && <UrgencyBar />}

      <main className="pb-24 sm:pb-0">
        <Hero ctaRef={heroCtaRef} />
        <Beneficios comOferta={comOferta} />
        <Mesas />
        <Faq comOferta={comOferta} />

        <section className="px-5 pb-14 pt-4">
          <div className="mx-auto max-w-md text-center">
            <WhatsAppCta location="final">Entrar no Grupo VIP do WhatsApp</WhatsAppCta>
            <p className="mt-3 text-[12px] text-zinc-500">Entrada gratuita · Você pode sair do grupo quando quiser</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-[11px] leading-relaxed text-zinc-500">
        <p className="mx-auto max-w-xl">
          O Fortify é uma ferramenta de monitoramento de risco e regras. Não oferece sinais, recomendação de
          investimento nem garantia de aprovação ou resultado. Operar no mercado financeiro envolve risco de perda.
        </p>
        <p className="mt-3">
          {/* <a> e não <Link>: esta página roda num router próprio, sem a rota /vendas. */}
          <a href="/vendas" className="underline-offset-2 hover:text-zinc-300 hover:underline">
            Conheça o Fortify
          </a>
        </p>
      </footer>

      <StickyCta visible={outOfView} />
    </div>
  );
}
