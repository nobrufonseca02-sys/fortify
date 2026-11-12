import { describe, expect, it } from 'vitest';
import { guardOptionsFromBinding } from '@/components/rules/FortifyGuardCard';
import { binding } from '../../services/metaapi-gateway/src/testFixtures';

describe('Fortify Guard: opções de regras para o EA', () => {
  it('oferece as 5 regras calculadas e os lembretes que têm texto oficial da mesa', () => {
    const row = binding();
    row.rule_snapshot.criticalRules.newsRule = 'Proibido operar 2 minutos antes e depois de notícia de alto impacto';
    row.rule_snapshot.criticalRules.maxLots = 'Indisponível';
    row.rule_snapshot.criticalRules.maxContracts = 'Não informado';
    const keys = guardOptionsFromBinding(row as any).map((option) => option.key);
    expect(keys.slice(0, 5)).toEqual(['daily_loss', 'max_drawdown', 'profit_target', 'consistency', 'min_trading_days']);
    expect(keys).toContain('news');
    // Sem texto oficial de tamanho máximo, o lembrete não aparece.
    expect(keys).not.toContain('max_lots');
  });

  it('mostra a regra oficial da mesa ao lado de cada opção', () => {
    const options = guardOptionsFromBinding(binding() as any);
    expect(options.find((option) => option.key === 'daily_loss')?.officialText).toBe('5%');
    expect(options.find((option) => option.key === 'profit_target')?.officialText).toBe('Fase 1: 10%');
  });
});
