import { describe, expect, it } from 'vitest';
import {
  ORBIT_LIMITS,
  ORBIT_RINGS,
  ORBIT_VIEWPORTS,
  orbitBandHalf,
  orbitContainerWidth,
  orbitOffset,
} from '../components/landing/orbitGeometry';
import { ORBIT_ITEMS } from '../components/landing/FortifyHero';

/**
 * Este teste existe porque a geometria das órbitas já quebrou duas vezes em
 * formatos de tela que não estavam na conta — a última em 1842×866, largo e
 * baixo, onde a largura satura no teto do container enquanto a faixa central
 * encolhe e os chips saem por cima da navbar e da barra de logos.
 *
 * Ele checa a matemática, não o DOM: para cada tela da matriz, onde cada chip
 * cai em relação ao centro. Mudar um raio ou um ângulo sem rodar isso quebra
 * o teste em vez de quebrar a página.
 */

const { chipRadius, edgeMargin, bandPadding, textHalfWidth, textHalfHeight } = ORBIT_LIMITS;

describe('geometria das órbitas', () => {
  it('mantém os pares espelhados: cada logo da direita tem par no mesmo anel', () => {
    const right = ORBIT_ITEMS.filter((item) => item.angle < 90 || item.angle > 270);
    const left = ORBIT_ITEMS.filter((item) => item.angle >= 90 && item.angle <= 270);
    expect(right).toHaveLength(5);
    expect(left).toHaveLength(5);

    for (const item of right) {
      const espelho = (180 - item.angle + 360) % 360;
      const par = left.find((l) => l.rx === item.rx && Math.abs(l.angle - espelho) < 0.01);
      expect(par, `sem par espelhado para ${item.label} (${item.rx}% / ${item.angle}°)`).toBeTruthy();
    }
  });

  it('fica perto dos ângulos medidos no exemplo de referência', () => {
    // Alvos do exemplo, lado direito. Não dá para bater exato: a órbita mais
    // em pé (achatamento 0,7) empurra alguns pares alguns graus para caber na
    // faixa central. O que precisa valer é a proximidade.
    const alvos = [8, 28, 46, 312, 346];
    const direita = ORBIT_ITEMS.filter((item) => item.angle < 90 || item.angle > 270)
      .map((item) => item.angle)
      .sort((a, b) => a - b);

    expect(direita).toHaveLength(alvos.length);
    let desvioTotal = 0;
    direita.forEach((angulo, i) => {
      const desvio = Math.abs(((angulo - alvos[i] + 540) % 360) - 180);
      desvioTotal += desvio;
      expect(desvio, `${angulo}° está longe do alvo ${alvos[i]}° do exemplo`).toBeLessThanOrEqual(10);
    });
    expect(desvioTotal, 'desvio angular somado contra o exemplo').toBeLessThanOrEqual(20);
  });

  it('põe todo chip sobre um anel realmente desenhado', () => {
    for (const item of ORBIT_ITEMS) {
      expect(ORBIT_RINGS, `${item.label} está em ${item.rx}%, que não é um anel`).toContain(item.rx);
    }
  });

  it('mantém o espaçamento entre anéis uniforme, como no exemplo', () => {
    const passos = ORBIT_RINGS.slice(1).map((r, i) => +(r - ORBIT_RINGS[i]).toFixed(2));
    expect(new Set(passos).size).toBe(1);
  });

  for (const { vw, vh } of ORBIT_VIEWPORTS) {
    describe(`${vw}x${vh}`, () => {
      const W = orbitContainerWidth(vw, vh);
      const halfBand = orbitBandHalf(vh);

      it('não deixa nenhum chip sair do viewport nem invadir navbar/barra de logos', () => {
        for (const item of ORBIT_ITEMS) {
          const { x, y } = orbitOffset(W, item.rx, item.angle);
          expect(
            Math.abs(x) + chipRadius,
            `${item.label} sai pela lateral`,
          ).toBeLessThanOrEqual(vw / 2 - edgeMargin);
          expect(
            Math.abs(y) + chipRadius,
            `${item.label} sai da faixa central`,
          ).toBeLessThanOrEqual(halfBand - bandPadding);
        }
      });

      it('não deixa nenhum chip cair sobre a caixa de texto', () => {
        for (const item of ORBIT_ITEMS) {
          const { x, y } = orbitOffset(W, item.rx, item.angle);
          const invadeX = Math.abs(x) - chipRadius < textHalfWidth;
          const invadeY = Math.abs(y) - chipRadius < textHalfHeight;
          expect(invadeX && invadeY, `${item.label} cobre o texto`).toBe(false);
        }
      });

      it('não deixa dois chips colidirem', () => {
        for (let i = 0; i < ORBIT_ITEMS.length; i++) {
          for (let j = i + 1; j < ORBIT_ITEMS.length; j++) {
            const a = orbitOffset(W, ORBIT_ITEMS[i].rx, ORBIT_ITEMS[i].angle);
            const b = orbitOffset(W, ORBIT_ITEMS[j].rx, ORBIT_ITEMS[j].angle);
            const colide =
              Math.abs(a.x - b.x) < 2 * chipRadius && Math.abs(a.y - b.y) < 2 * chipRadius;
            expect(
              colide,
              `${ORBIT_ITEMS[i].label} colide com ${ORBIT_ITEMS[j].label}`,
            ).toBe(false);
          }
        }
      });

      it('estende as órbitas além da borda, cobrindo a página', () => {
        const saindo = ORBIT_RINGS.filter((r) => W * (r / 100) > vw / 2);
        expect(saindo.length, 'nenhum anel alcança a borda da tela').toBeGreaterThanOrEqual(2);
      });
    });
  }
});
