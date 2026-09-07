import type { ElementType, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Movimento das páginas públicas.
 *
 * Reproduz o padrão da referência (GSAP SplitText + ScrollTrigger) com o
 * `motion/react` que o projeto já usa — sem somar uma segunda biblioteca de
 * animação, e sem o SplitText, que é pago.
 *
 * Duas coisas medidas na referência e mantidas aqui:
 *  - a revelação é DISCRETA ao entrar na tela (`scrub: false`, `pin: false`
 *    em todos os 25 ScrollTriggers dela). O scroll é só o gatilho, não um
 *    controle de posição — nada de conteúdo amarrado à barra de rolagem.
 *  - o gatilho dispara em ~70-80% da altura da tela, não na borda.
 */

/**
 * Dispara quando o bloco entra pela borda de baixo, um pouco antes de aparecer
 * de fato (os 12% de folga inferior).
 *
 * A borda de CIMA fica em zero de propósito. Com margem negativa no topo, o
 * gatilho vira uma FAIXA no meio da tela — e qualquer bloco que caia acima
 * dela num salto de rolagem (link com âncora, posição restaurada, fling de
 * trackpad) nunca cruza a faixa e, por causa do `once`, fica invisível para
 * sempre. Zero no topo garante que estar visível já basta para revelar.
 */
const IN_VIEW = { once: true, margin: '0px 0px -12% 0px' } as const;

const WORD_TRANSITION = { duration: 0.55, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * Título revelado palavra por palavra, cada uma subindo de trás de uma máscara.
 *
 * Só para TÍTULOS e frases curtas. Quebrar parágrafo longo multiplica nós no
 * DOM sem ganho visível — a referência tem 112 elementos quebrados e paga esse
 * preço; aqui o texto corrido continua entrando como bloco (`ScrollReveal`).
 *
 * Acessibilidade: o texto completo vive no `aria-label` do container e as
 * palavras ficam `aria-hidden`. Sem isso, leitor de tela leria palavra por
 * palavra como se fossem frases separadas.
 */
export function RevealText({
  text,
  as: Tag = 'span',
  className,
  delay = 0,
  stagger = 0.045,
  trigger = 'inView',
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  /** Intervalo entre palavras. */
  stagger?: number;
  /** `load` para o hero (que não rola), `inView` para o resto. */
  trigger?: 'load' | 'inView';
}) {
  const reduceMotion = useReducedMotion();
  const words = text.split(' ');

  // Com movimento reduzido não há o que revelar: entrega o texto pronto.
  if (reduceMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  const animation = trigger === 'load' ? { animate: 'visivel' } : { whileInView: 'visivel', viewport: IN_VIEW };

  return (
    <Tag className={className} aria-label={text}>
      <motion.span
        aria-hidden="true"
        className="inline"
        initial="oculto"
        {...animation}
        variants={{
          visivel: { transition: { staggerChildren: stagger, delayChildren: delay } },
          oculto: {},
        }}
      >
        {words.map((word, index) => (
          // O wrapper com overflow-hidden é a máscara: a palavra sobe de trás
          // dele em vez de simplesmente aparecer. align-bottom evita o pulo de
          // linha de base que inline-block introduz.
          <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom">
            <motion.span
              className="inline-block"
              variants={{
                oculto: { y: '110%' },
                visivel: { y: 0 },
              }}
              transition={WORD_TRANSITION}
            >
              {word}
              {index < words.length - 1 ? ' ' : ''}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/**
 * Bloco que sobe e aparece ao entrar na tela. É o `ScrollReveal` do
 * PublicShell, repetido aqui com o mesmo gatilho do RevealText para os dois
 * ficarem em fase quando aparecem juntos.
 */
export function RevealBlock({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={IN_VIEW}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
