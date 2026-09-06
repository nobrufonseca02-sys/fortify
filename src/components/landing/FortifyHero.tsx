import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import iconGmail from '@/assets/brands/icons/gmail.png';
import { LandingNav } from '@/components/landing/LandingNav';
// Ícones oficiais coloridos de cada marca (app-icon/favicon publicado por
// ela). Usados junto com o nome em texto: os wordmarks de firmLogos.ts são
// brancos-sobre-transparente, então em chip branco ficariam invisíveis — e sob
// `brightness-0` viravam silhueta preta, perdendo a cor (o The5ers chegava a
// virar um bloco preto sem forma).
import iconHantec from '@/assets/brands/icons/hantec.png';
import iconGoogle from '@/assets/brands/icons/google.png';
import iconFtmo from '@/assets/brands/icons/ftmo.png';
import iconApex from '@/assets/brands/icons/apex.jpg';
import iconThe5ers from '@/assets/brands/icons/the5ers.png';
import iconTopstep from '@/assets/brands/icons/topstep.jpg';
import iconE8 from '@/assets/brands/icons/e8.png';
import iconFxify from '@/assets/brands/icons/fxify.png';
import iconAlphaCapital from '@/assets/brands/icons/alphacapital.png';
import iconTradingView from '@/assets/brands/icons/tradingview.png';
import { firmLogos } from '@/data/firmLogos';
import logoTradingView from '@/assets/brands/tradingview-mark-transparent.png';
import { cn } from '@/lib/utils';

/**
 * Hero da landing pública (/vendas) — tela ÚNICA, sem rolagem.
 *
 * As demais seções (como funciona, recursos, mesas, FAQ) viraram páginas
 * próprias, acessadas pela LandingNav. Ver src/pages/landing/.
 *
 * Decisão de conteúdo, porque esta página roda tráfego pago: só entram marcas
 * que o Fortify realmente usa/suporta — mesas do catálogo auditado, MetaTrader
 * 5, TradingView (integração real, ver TradingViewProvider), Google (login
 * OAuth real) e Stripe (processador de pagamento real). Binance, Interactive
 * Brokers, cTrader, Rithmic e Nelogica ficaram de fora: não há integração.
 *
 * O aviso legal ("não é recomendação de investimento") saiu do hero a pedido,
 * mas segue nas páginas de FAQ e no rodapé delas.
 */

type OrbitItem = {
  key: string;
  /** Nome da marca (vai no title/alt, não é exibido). */
  label: string;
  /** Ícone colorido da marca. */
  icon: string;
  /**
   * `true` quando o arquivo do ícone é um app-icon de fundo ESCURO sólido
   * (símbolo branco sobre quadrado preto/navy). Dentro do chip branco isso
   * virava um disco preto encostado noutro disco — o efeito de "círculo
   * dentro de círculo". Nesses casos o ícone é invertido para virar um
   * símbolo preto sobre fundo branco, que some dentro do chip.
   */
  darkIcon?: boolean;
  /** Raio horizontal em % da largura do container. */
  rx: number;
  /** Ângulo em graus (0° = direita, 90° = baixo). */
  angle: number;
};

/**
 * SISTEMA ORBITAL DO HERO
 *
 * Esta é a geometria anterior, retomada a pedido. A tentativa seguinte
 * (elipse 0,34 num container de 220vw, com véu radial no centro) deixava as
 * linhas mais amplas, mas o véu apagava justamente os anéis internos — que
 * são os que dão a leitura de "sistema" nesta escala. Aqui as órbitas são
 * grandes circunferências levemente achatadas: só os arcos laterais entram
 * na tela, o que produz as curvas verticais da referência.
 *
 * `RING_FLATTEN` 0,78 é um achatamento discreto, calibrado para manter os
 * chips diagonais dentro da altura útil do miolo — com 0,88 o par mais
 * diagonal (40,7° do horizontal) não caberia em nenhum anel.
 */
const RING_FLATTEN = 0.78;
const ORBIT_CONTAINER_WIDTH = 'w-[min(1120px,100vw)]';
const ORBIT_RINGS = [28, 34.5, 41, 47.5, 54, 61, 68];

/**
 * Os dois segmentos de arco azuis da referência — um à esquerda e um à
 * direita, sobrepostos às linhas cinzas.
 */
const ACCENT_ARCS = [
  { rx: 34.5, from: 191, to: 209 },
  { rx: 41, from: 331, to: 352 },
];

/**
 * Marcas em órbita, em 5 pares espelhados: cada logo da direita tem sua
 * contraparte à esquerda no mesmo anel, no ângulo espelhado. Os ângulos são
 * os medidos na referência, remapeados para a faixa 28%–47,5% porque nosso
 * título é bem mais longo que o dela.
 *
 * `darkIcon` marca os app-icons que vêm com fundo escuro: eles passam por
 * grayscale+invert+contraste e viram símbolo preto sobre o branco do chip,
 * em vez de um disco preto dentro do círculo.
 */
const ORBIT_ITEMS: OrbitItem[] = [
  // Anel 28% — par do Meta/Figma na referência (184,8° / 355,2°)
  { key: 'the5ers', label: 'The5ers', icon: iconThe5ers, rx: 28, angle: 355.2 },
  { key: 'alphacapital', label: 'Alpha Capital Group', icon: iconAlphaCapital, rx: 28, angle: 184.8, darkIcon: true },

  // Anel 34,5% — par do cubo/Google Ads (24,1° / 155,9°)
  { key: 'topstep', label: 'Topstep', icon: iconTopstep, rx: 34.5, angle: 24.1, darkIcon: true },
  { key: 'google', label: 'Google', icon: iconGoogle, rx: 34.5, angle: 155.9 },

  // Anel 41% — dois pares, como na referência, onde 33,7% e 35,4% quase coincidem
  { key: 'apex', label: 'Apex Trader Funding', icon: iconApex, rx: 41, angle: 319.2, darkIcon: true },
  { key: 'hantec', label: 'Hantec Trader', icon: iconHantec, rx: 41, angle: 220.8 },
  { key: 'ftmo', label: 'FTMO', icon: iconFtmo, rx: 41, angle: 346.1, darkIcon: true },
  { key: 'e8', label: 'E8 Markets', icon: iconE8, rx: 41, angle: 193.9, darkIcon: true },

  // Anel 47,5% — par do gradiente/Mailchimp (5,4° / 174,6°)
  { key: 'tradingview', label: 'TradingView', icon: iconTradingView, rx: 47.5, angle: 5.4, darkIcon: true },
  { key: 'fxify', label: 'FXIFY', icon: iconFxify, rx: 47.5, angle: 174.6, darkIcon: true },
];

/**
 * Barra inferior: wordmarks monocromáticos direto no fundo, sem chip. Só
 * entram assets COM canal alpha (todos recebem silhueta escura); Google,
 * Stripe e MetaTrader 5 vão como wordmark tipográfico.
 *
 * `color` é a cor de marca revelada no hover. Os assets que temos no repo são
 * wordmarks BRANCOS sobre transparente (feitos para fundo escuro) — tirar o
 * filtro no hover os deixaria invisíveis neste fundo claro. Por isso o hover
 * não "remove o filtro": ele repinta a silhueta com a cor da própria marca,
 * via `mask-image`, que usa apenas o canal alpha do arquivo.
 *
 * Em telas sem hover (celular) o estado colorido é o padrão — a variante
 * `[@media(hover:none)]` existe para a cor não ficar inalcançável no mobile.
 *
 * Cada cor foi conferida numa fonte da própria marca, não estimada:
 *   Hantec      #FF7A00  fill do hantec-trader.svg oficial + CSS de hantectrader.com
 *   FTMO        #0781FE  CSS de ftmo.com
 *   Apex        #0026FF  CSS de apextraderfunding.com
 *   The5ers     #773971  cor dominante do wordmark oficial (the5ers.png)
 *   Google      #4285F4  azul do ícone oficial (medido no asset: #4889F4)
 *   Stripe      #635BFF  roxo de marca (favicon medido: #533AFE)
 *   TradingView #2962FF  azul de marca (padrão da charting library deles)
 *   MetaTrader  #6A8ABB  azul do ícone oficial da MetaQuotes (medido)
 * Topstep (#44E0F5) e E8 (#19F2CA) usam o ciano/menta do site deles escurecido
 * no mesmo matiz: no tom original o contraste contra o fundo #FAF9F5 fica em
 * 1,5:1 e 1,4:1 — ilegível. Os valores abaixo ficam em ~3,6:1.
 */
const SPONSOR_LOGOS: { key: string; label: string; src?: string; color: string }[] = [
  { key: 'mt5', label: 'MetaTrader 5', color: '#6A8ABB' },
  { key: 'tradingview', label: 'TradingView', src: logoTradingView, color: '#2962FF' },
  // Google e The5ers vão como wordmark: o "G" do Google e o mark do The5ers
  // têm áreas cheias que, sob `brightness-0`, viravam manchas escuras sem
  // forma legível (dá pra ver isso na captura anterior). A referência também
  // usa "Google" como wordmark tipográfico.
  { key: 'google', label: 'Google', color: '#4285F4' },
  { key: 'stripe', label: 'stripe', color: '#635BFF' },
  { key: 'hantec', label: 'Hantec', src: firmLogos['Hantec Trader'], color: '#FF7A00' },
  { key: 'ftmo', label: 'FTMO', src: firmLogos.FTMO, color: '#0781FE' },
  { key: 'apex', label: 'Apex', src: firmLogos['Apex Trader Funding'], color: '#0026FF' },
  { key: 'topstep', label: 'Topstep', src: firmLogos.Topstep, color: '#098FA2' },
  { key: 'the5ers', label: 'The5ers', color: '#773971' },
  { key: 'e8', label: 'E8 Markets', src: firmLogos['E8 Markets'], color: '#089379' },
];

/**
 * Avatar ilustrado (não é foto de pessoa real) com o selo de verificado ao
 * lado, como na referência.
 *
 * Deliberadamente uma ilustração e não um retrato: numa página de anúncio, a
 * foto de uma pessoa real ao lado de "resultado de +$1.250,00" lê como
 * depoimento — e não temos depoimento real para exibir. A ilustração entrega
 * o mesmo efeito visual sem atribuir o resultado a ninguém.
 */
function VerifiedAvatar() {
  return (
    <span className="relative inline-flex h-9 w-9 shrink-0">
      <svg viewBox="0 0 36 36" className="h-9 w-9 rounded-full" aria-hidden="true">
        <defs>
          <linearGradient id="fh-av" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="18" fill="url(#fh-av)" />
        <circle cx="18" cy="14" r="5.6" fill="#F8FAFC" />
        <path d="M5.6 33.5c1.9-6.2 6.7-9.4 12.4-9.4s10.5 3.2 12.4 9.4z" fill="#F8FAFC" />
      </svg>
      {/* Selo de verificado (estilo Meta): estrela de bordas onduladas + check */}
      <svg
        viewBox="0 0 24 24"
        className="absolute -right-0.5 -top-0.5 h-4 w-4 drop-shadow-sm"
        aria-label="Verificado"
        role="img"
      >
        <path
          fill="#1D9BF0"
          d="M12 1.5l2.3 2.1 3.1-.4 1 3 2.8 1.4-.9 3 1.6 2.7-2.3 2.1.1 3.1-3 .9-1.7 2.6-3-.7-2.8 1.3-1.9-2.4-3.1-.4-.3-3.1L.7 14.6 2 11.8.9 8.9l2.9-1.1L4.6 4.8l3.1.1L9.6 2.3z"
        />
        <path
          fill="#FFFFFF"
          d="M10.6 15.8l-3-3 1.3-1.3 1.7 1.7 4-4 1.3 1.3z"
        />
      </svg>
    </span>
  );
}

/** Ícone do Gmail (asset oficial do Google) no chip do card. */
function GmailBadge() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white">
      <img src={iconGmail} alt="Gmail" width={36} height={36} loading="lazy" decoding="async" className="h-5 w-5 object-contain" />
    </span>
  );
}

/** Chip de sincronização. */
function SyncBadge() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

const NOTIFICATIONS = [
  {
    key: 'risk',
    badge: <GmailBadge />,
    title: 'Alerta de risco',
    body: 'Conta FTMO chegou a 80% do drawdown diário.',
    time: 'há 2 min',
  },
  {
    key: 'goal',
    badge: <VerifiedAvatar />,
    title: 'Meta do dia atingida',
    body: 'Resultado de +$1.250,00 registrado no fechamento.',
    time: 'há 18 min',
  },
  {
    key: 'sync',
    badge: <SyncBadge />,
    title: 'Sincronização concluída',
    body: 'Conta MetaTrader 5 sincronizada com sucesso.',
    time: 'há 32 min',
  },
];

/** Posição de um item sobre o arco, em % do container quadrado. */
function orbitPosition(rx: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    left: `${50 + rx * Math.cos(rad)}%`,
    top: `${50 + rx * RING_FLATTEN * Math.sin(rad)}%`,
  };
}

/** Path SVG de um segmento de arco elíptico, em coordenadas do viewBox 0-100. */
function arcPath(rx: number, fromDeg: number, toDeg: number) {
  const ry = rx * RING_FLATTEN;
  const p = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [50 + rx * Math.cos(rad), 50 + ry * Math.sin(rad)];
  };
  const [x1, y1] = p(fromDeg);
  const [x2, y2] = p(toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${rx} ${ry} 0 ${large} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

/**
 * Anéis concêntricos + chips fixos das marcas, numa camada só.
 *
 * Sem animação nenhuma — zero repaint contínuo. Escondida abaixo de `lg`:
 * em tela estreita não existe corredor lateral livre entre o título e a
 * borda, e como fica em `display:none` com `loading="lazy"` o navegador nem
 * baixa os ícones no mobile.
 */
function OrbitField() {
  return (
    <div
      aria-hidden="true"
      /* A máscara faz anéis e chips desvanecerem embaixo, para não passarem
         por cima da barra de logos monocromáticas — o mesmo degradê da
         referência. Duplicada com prefixo -webkit- por causa do Safari. */
      style={{
        maskImage: 'linear-gradient(to bottom, #000 0%, #000 58%, transparent 90%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 58%, transparent 90%)',
      }}
      className={cn(
        'pointer-events-none absolute left-1/2 top-1/2 hidden aspect-square -translate-x-1/2 -translate-y-1/2 lg:block',
        ORBIT_CONTAINER_WIDTH,
      )}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        {ORBIT_RINGS.map((rx) => (
          <ellipse
            key={rx}
            cx="50"
            cy="50"
            rx={rx}
            ry={rx * RING_FLATTEN}
            fill="none"
            stroke="#E6E3DC"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Segmentos azuis da referência, por cima das linhas cinzas */}
        {ACCENT_ARCS.map(({ rx, from, to }) => (
          <path
            key={`${rx}-${from}`}
            d={arcPath(rx, from, to)}
            fill="none"
            stroke="#4F46E5"
            strokeWidth="1.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.75"
          />
        ))}
      </svg>

      {ORBIT_ITEMS.map((item) => (
        <div
          key={item.key}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={orbitPosition(item.rx, item.angle)}
        >
          {/* Chip circular branco com só o símbolo da marca. O nome vai no
              title/alt (leitor de tela e tooltip): escrito no chip virava
              uma fileira de botões. */}
          <div
            title={item.label}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white ring-1 ring-zinc-900/[0.06] shadow-[0_4px_14px_rgba(24,24,27,0.10),0_1px_3px_rgba(24,24,27,0.06)]"
          >
            <img
              src={item.icon}
              alt={item.label}
              loading="lazy"
              decoding="async"
              width={30}
              height={30}
              className={cn(
                'h-[30px] w-[30px]',
                item.darkIcon
                  ? /* grayscale tira o matiz do fundo (o Apex é um degradê azul, o
                       Alpha Capital é navy), invert troca símbolo branco por preto e
                       fundo escuro por claro, e o contraste empurra esse claro até o
                       branco do chip — some o disco preto, fica só o símbolo.
                       object-contain porque, sem o fundo, um corte de object-cover
                       apareceria como símbolo mutilado. */
                    '[filter:grayscale(1)_invert(1)_contrast(1.8)] object-contain'
                  : 'rounded-full object-cover',
              )}
            />
          </div>
        </div>
      ))}
    </div>
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
    // h-[100svh] + overflow-hidden = uma tela só, sem rolagem. `svh` em vez de
    // `vh` porque no mobile a barra de endereço não deve cortar o conteúdo.
    <section className="relative isolate flex h-[100svh] flex-col overflow-hidden bg-[#FAF9F5] pb-6 pt-4 text-zinc-900">
      {/* Luz suave ao centro */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_40%,#FFFFFF_0%,rgba(255,255,255,0.45)_50%,transparent_78%)]"
      />

      <div className="relative z-20 shrink-0">
        <LandingNav />
      </div>

      {/* Miolo: as órbitas são absolutas e centradas NESTE wrapper, então o
          centro dos anéis cai no centro real do conteúdo. */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
        <OrbitField />

        {/* max-w-lg (±256px do centro) mantém o título dentro do corredor
            livre: o chip mais interno (28%) fica a ~266px em 1024px. */}
        <div className="relative z-10 mx-auto max-w-lg px-5 text-center">
          <motion.h1
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 14 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="text-[2rem] font-bold leading-[1.08] tracking-tight text-zinc-900 sm:text-[2.6rem] md:text-[3rem]"
          >
            Plataforma inteligente de gestão de risco
          </motion.h1>

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 14 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(24,24,27,0.18)] transition-colors hover:bg-zinc-800 sm:w-auto"
            >
              Iniciar gratuitamente
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onSecondary}
              className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-50 sm:w-auto"
            >
              Falar com especialista
            </button>
          </motion.div>
        </div>

        {/* Cards de notificação — sobrepostos em leque, como na referência:
            cada card sobe sobre o anterior (-mt), desloca um pouco para a
            direita, e perde escala/opacidade para dar profundidade. O
            z-index decrescente mantém o primeiro à frente. */}
        <div className="relative z-10 mx-auto mt-8 w-full max-w-md px-5 sm:mt-10">
          {NOTIFICATIONS.map((item, index) => (
            <motion.div
              key={item.key}
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 14 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 + index * 0.08 }}
              style={{
                zIndex: NOTIFICATIONS.length - index,
                transform: `scale(${1 - index * 0.035})`,
                opacity: 1 - index * 0.05,
              }}
              className={cn(
                'relative flex items-center gap-3 rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-[0_14px_40px_rgba(24,24,27,0.12)] backdrop-blur-xl',
                index === 1 && '-mt-4 ml-5 mr-[-4px]',
                index === 2 && '-mt-4 ml-10 mr-[-8px]',
              )}
            >
              {item.badge}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight text-zinc-900">{item.title}</p>
                <p className="mt-0.5 truncate text-[12px] leading-snug text-zinc-600">{item.body}</p>
              </div>
              <span className="shrink-0 self-start text-[10px] text-zinc-400">{item.time}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Barra de integrações — wordmarks monocromáticos, sem chip */}
      <div className="relative z-10 mx-auto w-full max-w-6xl shrink-0 px-5">
        <p className="text-center text-[12px] text-zinc-500">
          Integrado às plataformas e mesas que você já usa
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {SPONSOR_LOGOS.map((logo) => (
            <div
              key={logo.key}
              title={logo.label}
              style={{ '--logo-color': logo.color } as CSSProperties}
              className="group/logo relative flex h-5 items-center justify-center"
            >
              {logo.src ? (
                <>
                  <img
                    src={logo.src}
                    alt={logo.label}
                    loading="lazy"
                    decoding="async"
                    /* grayscale + brightness-0 = silhueta escura uniforme,
                       preservando o alpha — o tratamento monocromático da referência.
                       Some no hover para dar lugar à camada colorida. */
                    className="h-full w-auto max-w-[96px] object-contain opacity-50 brightness-0 grayscale transition-opacity duration-200 group-hover/logo:opacity-0 [@media(hover:none)]:opacity-0"
                  />
                  {/* Camada de cor: ocupa exatamente a caixa do <img> (o wrapper
                      encolhe na largura dele) e, com `contain` dos dois lados, o
                      recorte cai em cima do desenho original. Pintada com a cor da
                      marca e mascarada pelo alpha do próprio arquivo — é o que
                      permite colorir um wordmark que no asset é branco. */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[var(--logo-color)] opacity-0 transition-opacity duration-200 group-hover/logo:opacity-100 [@media(hover:none)]:opacity-100"
                    style={{
                      /* Aspas obrigatórias: assets pequenos (ftmo.svg, o mark do
                         TradingView) o Vite inlina como data: URI no build, e um data:
                         URI sem aspas quebra o parser de url(). */
                      maskImage: `url("${logo.src}")`,
                      WebkitMaskImage: `url("${logo.src}")`,
                      maskSize: 'contain',
                      WebkitMaskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                    }}
                  />
                </>
              ) : (
                <span className="text-[15px] font-semibold tracking-tight text-zinc-900/50 transition-colors duration-200 group-hover/logo:text-[var(--logo-color)] [@media(hover:none)]:text-[var(--logo-color)]">
                  {logo.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
