import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Flame, MessageCircle, Play, ShieldCheck } from 'lucide-react';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { useForcedTheme } from '@/components/landing/PublicShell';
import { Orb } from '@/components/landing/cinematic/Orb';
import { Reveal } from '@/components/landing/cinematic/CinematicPage';
import { CINEMATIC_FONT_VARS, FONT_MONO, FONT_SANS, useCinematicFonts } from '@/components/landing/cinematic/fonts';
import { cn } from '@/lib/utils';
import { WHATSAPP_VIP_GROUP_URL } from '@/content/grupoVip';
import {
  BF_INCLUI,
  BF_OFERTA,
  BF_POSTER,
  BF_VIDEO_URL,
  bfAtiva,
  bfCheckoutUrl,
  bfTempoRestante,
} from '@/content/blackFriday';
import { trackBlackFridayCheckout, trackBlackFridayLead } from './blackFridayTracking';

/**
 * Página da campanha de Black Friday no Meta Ads: Fortify Guard vitalício por
 * R$ 197, pagamento único, até 27/11 às 23h59. Mesmo visual e mesmo
 * rastreamento da /grupo-vip, com conteúdo próprio em src/content/blackFriday.ts.
 *
 * Depois do prazo a página troca sozinha, sem recarregar: o botão de pagamento
 * some, aparece "Oferta de Black Friday encerrada" e o botão do grupo continua.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Navegador interno do Instagram/Facebook. Ali `target="_blank"` costuma abrir
 * outra aba do próprio navegador interno, que nem sempre entrega o link ao app
 * (WhatsApp) ou volta direito do checkout. Navegar na mesma aba resolve.
 */
function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(navigator.userAgent);
}

/** Relógio da página: a cada segundo, para a contagem andar e a oferta fechar na hora certa. */
function useAgora() {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return agora;
}

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

const CTA_BASE = cn(
  'group relative isolate inline-flex min-h-14 w-full select-none items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3 text-center text-[15px] font-semibold leading-snug tracking-[-0.005em] sm:px-6 sm:text-base',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
);

const CTA_VARIANTE = {
  primario:
    'bg-white text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_40px_-12px_rgba(165,88,251,0.65)] transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_16px_48px_-10px_rgba(165,88,251,0.85)]',
  secundario:
    'bg-white/[0.06] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.2)] transition-colors duration-300 hover:bg-white/[0.1]',
} as const;

function CtaLink({
  href,
  variante,
  icon,
  onTrack,
  children,
}: {
  href: string;
  variante: keyof typeof CTA_VARIANTE;
  icon: ReactNode;
  onTrack: () => void;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onTrack();
    if (isInAppBrowser()) {
      event.preventDefault();
      // Pequena folga para o pixel e o dataLayer saírem antes da navegação.
      window.setTimeout(() => {
        window.location.href = href;
      }, 180);
    }
  };

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 25 }}
      className={cn(CTA_BASE, CTA_VARIANTE[variante])}
    >
      {/* Brilho que atravessa o botão principal de tempos em tempos: chama o olho sem piscar. */}
      {variante === 'primario' && !reduceMotion && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 -z-10 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-violet-300/50 to-transparent"
          animate={{ x: ['0%', '450%'] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.8, ease: 'easeInOut' }}
        />
      )}
      {icon}
      <span>{children}</span>
    </motion.a>
  );
}

function CheckoutCta({ href, local }: { href: string; local: string }) {
  return (
    <CtaLink
      href={href}
      variante="primario"
      onTrack={() => trackBlackFridayCheckout(local)}
      icon={<ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />}
    >
      Garantir acesso vitalício por R$197
    </CtaLink>
  );
}

function GrupoCta({ local, variante }: { local: string; variante: keyof typeof CTA_VARIANTE }) {
  return (
    <CtaLink
      href={WHATSAPP_VIP_GROUP_URL}
      variante={variante}
      onTrack={() => trackBlackFridayLead(local)}
      icon={<MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />}
    >
      Entrar no grupo VIP
    </CtaLink>
  );
}

// ---------------------------------------------------------------------------
// Barra do topo e contagem
// ---------------------------------------------------------------------------

function UrgencyBar() {
  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-violet-950/95 via-zinc-950/95 to-indigo-950/95 backdrop-blur-md">
      <p className="mx-auto flex max-w-3xl items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 text-center text-[11.5px] leading-snug text-zinc-200 sm:gap-2 sm:py-2.5 sm:text-[13px]">
        <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-white">Black Friday:</strong> vitalício por{' '}
          <strong className="font-semibold text-white">{BF_OFERTA.preco}</strong> até {BF_OFERTA.prazoCurto}
        </span>
      </p>
    </div>
  );
}

const plural = (n: number, palavra: string) => `${n} ${palavra}${n === 1 ? '' : 's'}`;

function Contagem({ agora }: { agora: number }) {
  const { dias, horas, minutos, segundos } = bfTempoRestante(agora);
  const partes: Array<[number, string]> = [
    [dias, dias === 1 ? 'dia' : 'dias'],
    [horas, 'h'],
    [minutos, 'min'],
    [segundos, 's'],
  ];

  return (
    <div className="flex w-full flex-col items-center lg:items-start">
      <p className={`${FONT_MONO} text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400`}>A oferta termina em</p>
      <div
        role="timer"
        aria-label={`Faltam ${plural(dias, 'dia')}, ${plural(horas, 'hora')}, ${plural(minutos, 'minuto')} e ${plural(segundos, 'segundo')}`}
        className="mt-2 flex gap-2"
      >
        {partes.map(([valor, rotulo], index) => (
          <div
            key={index}
            className="flex w-[60px] flex-col items-center rounded-xl bg-zinc-900/80 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-md sm:w-16"
          >
            <span className="text-[22px] font-semibold leading-none tabular-nums text-white sm:text-2xl">
              {String(valor).padStart(2, '0')}
            </span>
            <span className={`${FONT_MONO} mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-400`}>{rotulo}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-zinc-500">Até {BF_OFERTA.prazoTexto}, horário de Brasília</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vídeo do anúncio
// ---------------------------------------------------------------------------

function VideoDaOferta() {
  const [tocando, setTocando] = useState(false);

  return (
    <figure className="mx-auto w-[min(62vw,250px)] sm:w-[270px] lg:w-[320px]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)]">
        {tocando ? (
          <video
            className="absolute inset-0 h-full w-full bg-black object-contain"
            src={BF_VIDEO_URL}
            poster={BF_POSTER}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <button
            type="button"
            onClick={() => setTocando(true)}
            className="group absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
            aria-label="Assistir ao vídeo da Black Friday do Fortify Guard"
          >
            {/* A capa carrega já, nas dimensões reais, para não haver salto de layout. */}
            <img
              src={BF_POSTER}
              alt=""
              width={1080}
              height={1920}
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/85 to-transparent" />
            <span className="absolute inset-x-0 bottom-4 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[13px] font-semibold text-zinc-950 shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105">
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Assistir ao vídeo
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className={`${FONT_MONO} mt-2.5 text-center text-[10px] uppercase tracking-[0.22em] text-zinc-500`}>
        Simulação ilustrativa · 30 s
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero({ ativa, agora, checkoutUrl }: { ativa: boolean; agora: number; checkoutUrl: string }) {
  const reduceMotion = useReducedMotion();
  // Entrada curta e escalonada; sem movimento, tudo aparece de uma vez.
  const enter = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: EASE, delay },
        };

  return (
    <section aria-labelledby="bf-titulo" className="relative overflow-hidden px-5 pb-12 pt-5 sm:pt-12 lg:pt-16">
      {/* Iluminação atmosférica: o eclipse do Orb no topo, atrás do título. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-[22vh] h-[52vh] opacity-80 sm:-top-[30vh] sm:h-[70vh]">
        <Orb />
      </div>

      {/* No celular: texto, contagem e botões, depois o vídeo (quem chega já viu o anúncio).
          No desktop: texto e botões à esquerda, vídeo à direita. */}
      <div className="relative z-10 mx-auto grid max-w-5xl gap-6 [grid-template-areas:'texto'_'acoes'_'video'] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[1fr_1fr] lg:gap-x-16 lg:gap-y-7 lg:[grid-template-areas:'texto_video'_'acoes_video']">
        <div className="flex flex-col items-center text-center [grid-area:texto] lg:items-start lg:self-end lg:text-left">
          <motion.p
            {...enter(0)}
            className={`${FONT_MONO} inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-md sm:text-[11px]`}
          >
            <span aria-hidden="true" className="inline-flex">
              <FortifyMark className="h-3 w-3 text-white" />
            </span>
            Black Friday · Fortify Guard
          </motion.p>

          <motion.h1
            id="bf-titulo"
            {...enter(0.06)}
            className="mt-3 text-balance text-[30px] font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[52px]"
          >
            {ativa ? (
              <>
                Fortify Guard <span className="text-violet-300">vitalício</span> por {BF_OFERTA.preco}
              </>
            ) : (
              'Oferta de Black Friday encerrada'
            )}
          </motion.h1>

          <motion.p
            {...enter(0.12)}
            className="mt-3 max-w-xl text-pretty text-[15px] leading-relaxed text-zinc-400 sm:text-base"
          >
            {ativa
              ? 'Pagamento único e acesso vitalício. O Fortify Guard acompanha as regras da sua mesa ao vivo no MT5.'
              : `O pagamento de ${BF_OFERTA.preco} não está mais disponível. O grupo VIP do Fortify Guard continua aberto.`}
          </motion.p>
        </div>

        <motion.div {...enter(0.18)} className="flex w-full flex-col items-center [grid-area:acoes] lg:items-start lg:self-start">
          {ativa && <Contagem agora={agora} />}
          <div className={cn('w-full max-w-md space-y-2.5', ativa && 'mt-5')}>
            {ativa && <CheckoutCta href={checkoutUrl} local="topo" />}
            <GrupoCta local="topo" variante={ativa ? 'secundario' : 'primario'} />
          </div>
          {ativa && (
            <p className="mt-2.5 max-w-md text-center text-[12px] leading-relaxed text-zinc-400 lg:text-left">
              Cartão ou Pix · Acesso liberado em até 12 h no mesmo e-mail do pagamento
            </p>
          )}
        </motion.div>

        {/* Sem animação de entrada: a capa é um dos maiores elementos da dobra e tem que pintar logo. */}
        <div className="[grid-area:video] lg:self-center">
          <VideoDaOferta />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// O que a oferta inclui
// ---------------------------------------------------------------------------

function Inclui() {
  return (
    <section aria-labelledby="bf-inclui" className="px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <h2 id="bf-inclui" className="text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          O que a oferta inclui
        </h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {BF_INCLUI.map((item, index) => (
            <Reveal
              as="li"
              key={item}
              delay={index * 0.05}
              // O último item é a frase mais longa: ocupa a linha inteira no desktop.
              className={index === BF_INCLUI.length - 1 ? 'sm:col-span-2' : undefined}
            >
              <div className="flex h-full items-center gap-3 rounded-2xl bg-zinc-900/60 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[15px] font-medium text-zinc-100">{item}</span>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Fechamento
// ---------------------------------------------------------------------------

function Fechamento({ ativa, checkoutUrl }: { ativa: boolean; checkoutUrl: string }) {
  return (
    <section aria-labelledby="bf-fim" className="px-5 pb-14 pt-4">
      <div className="mx-auto max-w-md text-center">
        <h2 id="bf-fim" className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {ativa ? `Fortify Guard vitalício por ${BF_OFERTA.preco}` : 'Oferta de Black Friday encerrada'}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
          {ativa
            ? `Pagamento único. Só até ${BF_OFERTA.prazoTexto}, horário de Brasília.`
            : 'O grupo VIP do Fortify Guard continua aberto.'}
        </p>
        <div className="mt-5 space-y-2.5">
          {ativa && <CheckoutCta href={checkoutUrl} local="fim" />}
          <GrupoCta local="fim" variante={ativa ? 'secundario' : 'primario'} />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function BlackFridayPage() {
  useForcedTheme('dark');
  useCinematicFonts();
  const agora = useAgora();
  const ativa = bfAtiva(agora);
  // Os utm_* da URL da página seguem para o checkout da Stripe.
  const checkoutUrl = useMemo(() => bfCheckoutUrl(window.location.search), []);

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Black Friday Fortify Guard · Vitalício por R$ 197';
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
      {ativa && <UrgencyBar />}

      <main>
        <Hero ativa={ativa} agora={agora} checkoutUrl={checkoutUrl} />
        {ativa && <Inclui />}
        <Fechamento ativa={ativa} checkoutUrl={checkoutUrl} />
      </main>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-[11px] leading-relaxed text-zinc-500">
        <p className="mx-auto max-w-xl">Operar envolve risco. O Fortify não é recomendação de investimento.</p>
        <p className="mx-auto mt-2 max-w-xl">
          Oferta de Black Friday válida até 27/11/2026 às 23h59, horário de Brasília. Pagamento processado pela Stripe.
        </p>
        <p className="mt-3">
          {/* <a> e não <Link>: esta página roda num router próprio, sem a rota /vendas. */}
          <a href="/vendas" className="underline-offset-2 hover:text-zinc-300 hover:underline">
            Conheça o Fortify
          </a>
        </p>
      </footer>
    </div>
  );
}
