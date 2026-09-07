/**
 * Geometria do sistema orbital do hero, derivada do exemplo de referência.
 *
 * Mora num módulo próprio para poder ser verificada por teste: já quebrou duas
 * vezes em formatos de tela que não estavam na conta (a última foi 1842×866 —
 * largo e baixo, onde a largura satura no teto e a faixa central encolhe).
 *
 * Do exemplo: anéis com espaçamento UNIFORME de 8%, e
 * as marcas em 5 pares espelhados nos ângulos 8°, 346°, 28°, 312° e 46° do lado
 * direito, com o espelho em 180−ângulo à esquerda.
 *
 * O que NÃO é feito aqui: proteger as palavras do centro pelo raio do primeiro
 * anel. Essa regra é impossível na nossa escala — em 1024×700 o anel grande o
 * bastante para conter a caixa de texto (472×435) já é mais largo que a
 * meia-tela, e nenhum chip caberia nele. Quem protege o texto é o clareado
 * colado nele (`TextVeil` em FortifyHero).
 */

/**
 * Proporção ry/rx. 0,7 é o TETO desta composição, não uma preferência:
 * acima disso a elipse fica alta demais e, com anéis grandes o bastante
 * para alcançar as bordas laterais, os chips de cima passam da navbar e os
 * de baixo entram na barra de logos. O solver não acha solução válida em
 * 0,75 nem acima, em nenhuma folga razoável.
 */
export const RING_FLATTEN = 0.7;

/** Classe Tailwind do container. A ALTURA também limita: sem o termo `vh`, numa
 *  tela larga e baixa os anéis ficam do tamanho da tela grande enquanto a faixa
 *  central encolhe, e os chips batem na navbar e na barra de logos. */
export const ORBIT_CONTAINER_WIDTH = 'w-[min(1600px,95vw,135vh)]';

/**
 * Anéis em % da largura do container, espaçamento uniforme de 8%.
 *
 * Os anéis novos entram PARA DENTRO (16, 24, 32), não para fora. Medido no
 * navegador: em 1440x900 só cinco anéis chegam a aparecer, o maior é o 72 —
 * 80, 88 e 96 já passam inteiros por fora do viewport. Anel maior que isso é
 * nó no DOM que ninguém vê, então para fora não há linha a ganhar sem mexer
 * no tamanho do container (o que moveria todos os chips).
 *
 * O 8 ficou de fora porque o véu do texto cobre 100% dele. Do 16 em diante
 * sobra arco visível dos dois lados do conteúdo.
 */
export const ORBIT_RINGS = Array.from({ length: 11 }, (_, i) => 16 + i * 8);

/** Os mesmos limites usados pelo solver, para o teste conferir o que foi resolvido. */
export const ORBIT_LIMITS = {
  chipRadius: 24,
  /** Folga mínima até a borda lateral do viewport. */
  edgeMargin: 24,
  /** Folga mínima até a navbar (topo) e a barra de logos (base). */
  bandPadding: 38,
  /** Semi-eixos da caixa de texto, medidos no navegador: 472×435 px. */
  textHalfWidth: 256,
  textHalfHeight: 225,
  /** Altura da faixa central = viewport − navbar − barra de logos. Medido. */
  bandChrome: 152,
} as const;

/** Telas em que a geometria precisa valer — inclui as combinações largo+baixo. */
export const ORBIT_VIEWPORTS = [
  { vw: 1024, vh: 700 },
  { vw: 1280, vh: 720 },
  { vw: 1366, vh: 768 },
  { vw: 1440, vh: 900 },
  { vw: 1536, vh: 864 },
  { vw: 1600, vh: 900 },
  { vw: 1842, vh: 866 },
  { vw: 1920, vh: 1080 },
  { vw: 2560, vh: 1080 },
  { vw: 2560, vh: 1440 },
] as const;

/** Largura efetiva do container — o mesmo `min()` da classe acima. */
export function orbitContainerWidth(vw: number, vh: number) {
  return Math.min(1600, 0.95 * vw, 1.35 * vh);
}

export function orbitBandHalf(vh: number) {
  return (vh - ORBIT_LIMITS.bandChrome) / 2;
}

/** Posição do chip em px a partir do centro, para um dado container. */
export function orbitOffset(containerWidth: number, rx: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: containerWidth * (rx / 100) * Math.cos(rad),
    y: containerWidth * (rx / 100) * RING_FLATTEN * Math.sin(rad),
  };
}

/** Posição em % do container, para o `style` do chip. */
export function orbitPosition(rx: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    left: `${50 + rx * Math.cos(rad)}%`,
    top: `${50 + rx * RING_FLATTEN * Math.sin(rad)}%`,
  };
}

/** Path SVG de um arco elíptico, em coordenadas do viewBox 0-100. */
export function arcPath(rx: number, fromDeg: number, toDeg: number) {
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
