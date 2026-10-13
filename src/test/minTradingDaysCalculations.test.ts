import { describe, expect, it } from 'vitest';
import { evaluateMinTradingDays } from '../lib/ruleEngine/minTradingDaysCalculations';

function trade(closeTime: string) {
  return { profit: 0, closeTime };
}

describe('evaluateMinTradingDays', () => {
  it('counts distinct trading days against a plain requirement', () => {
    const result = evaluateMinTradingDays({
      ruleText: '4 dias em cada fase; prazo ilimitado',
      trades: [trade('2026-07-14T14:00:00.000Z'), trade('2026-07-15T09:00:00.000Z')],
      currency: 'USD',
    });
    expect(result.status).toBe('safe');
    expect(result.currentValue).toBe(2);
    expect(result.limitValue).toBe(4);
    expect(result.remainingValue).toBe(2);
    expect(result.message).toContain('2 de 4');
  });

  it('collapses multiple trades on the same day into a single trading day', () => {
    const result = evaluateMinTradingDays({
      ruleText: '2 dias separados; sem prazo máximo',
      trades: [
        trade('2026-07-14T09:00:00.000Z'),
        trade('2026-07-14T14:00:00.000Z'),
        trade('2026-07-15T09:00:00.000Z'),
      ],
      currency: 'USD',
    });
    expect(result.currentValue).toBe(2);
    expect(result.limitValue).toBe(2);
    expect(result.message).toContain('atingido');
  });

  it('ignores trades with unparseable closeTime instead of fabricating "today"', () => {
    const result = evaluateMinTradingDays({
      ruleText: '3 dias; sem prazo máximo, com atividade a cada 30 dias',
      trades: [trade('not-a-date'), trade('2026-07-14T09:00:00.000Z')],
      currency: 'USD',
    });
    expect(result.currentValue).toBe(1);
    expect(result.limitValue).toBe(3);
  });

  it.each([
    'Sem mínimo',
    'Sem mínimo; prazo ilimitado',
    'Sem mínimo ou máximo; ao menos um trade aberto e fechado a cada 60 dias',
    'Sem mínimo publicado para aprovação; duração da Challenge de 30 dias',
    // A cláusula oficial de "sem mínimo" ganha de comentário derivado que vem
    // depois dela no mesmo texto.
    'Sem mínimo; lógica do Best Day exige ao menos 3 dias; inatividade em 7 dias',
  ])('treats "%s" as an explicit zero-day minimum', (ruleText) => {
    const result = evaluateMinTradingDays({ ruleText, trades: [], currency: 'USD' });
    expect(result.status).toBe('safe');
    expect(result.currentValue).toBe(0);
    expect(result.limitValue).toBe(0);
  });

  it.each([
    ['3 dias lucrativos por fase, cada um com pelo menos 0,5%; sem prazo máximo', 'dias lucrativos'],
    ['5 dias positivos por ciclo, com lucro mínimo diário por plano', 'dias positivos'],
    ['7 dias; cada dia deve representar ao menos 0,1% do saldo', 'limiar diário'],
    ['Mínimo prático de 2 dias por causa da consistência de 50%', 'comentário derivado'],
    ['Prazo de 5 dias de negociação para concluir; confirmar contagem no dashboard', 'prazo-limite'],
  ])('declines to compute a rule that is not a plain day-count (%s / %s)', (ruleText) => {
    const result = evaluateMinTradingDays({ ruleText, trades: [], currency: 'USD' });
    expect(result.status).toBe('not_monitorable');
    expect(result.currentValue).toBeNull();
  });

  it('declines a composite rule with more than one distinct day count', () => {
    const result = evaluateMinTradingDays({
      ruleText: '5 dias operados e 10 dias totais para payout; inatividade em 60 dias',
      trades: [],
      currency: 'USD',
    });
    expect(result.status).toBe('not_monitorable');
    expect(result.message).toContain('mais de uma contagem');
  });

  it('declines when the text has no identifiable day count at all', () => {
    const result = evaluateMinTradingDays({ ruleText: 'Verificar no site oficial', trades: [], currency: 'USD' });
    expect(result.status).toBe('not_monitorable');
  });

  it('adds a per-phase caveat without disqualifying the calculation', () => {
    const result = evaluateMinTradingDays({
      ruleText: '5 dias por fase; sem prazo máximo; inatividade em 60 dias',
      trades: [trade('2026-07-14T09:00:00.000Z')],
      currency: 'USD',
    });
    expect(result.status).toBe('safe');
    expect(result.detail).toContain('por fase');
  });

  it('adds a hold-time caveat without disqualifying the calculation', () => {
    const result = evaluateMinTradingDays({
      ruleText: '2 dias; operações válidas devem permanecer abertas por pelo menos 30 segundos',
      trades: [trade('2026-07-14T09:00:00.000Z')],
      currency: 'USD',
    });
    expect(result.status).toBe('safe');
    expect(result.currentValue).toBe(1);
    expect(result.limitValue).toBe(2);
    expect(result.detail).toContain('tempo mínimo de permanência');
  });
});
