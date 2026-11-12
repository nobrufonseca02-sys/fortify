import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BoundRuleEvaluationCard } from '../components/rules/BoundRuleEvaluationCard';
import { evaluateBoundAccountRules } from '../lib/ruleEngine/evaluateAccountRules';
import { createLinkedRuleEngineInput } from './fixtures/ruleEngineFixtures';

describe('BoundRuleEvaluationCard', () => {
  it('uma linha por regra, com o número que importa e sem texto técnico', () => {
    const evaluation = evaluateBoundAccountRules(createLinkedRuleEngineInput());

    render(<BoundRuleEvaluationCard evaluation={evaluation} />);

    expect(screen.getByText('Regras')).toBeInTheDocument();
    expect(screen.getByText('Perda diária')).toBeInTheDocument();
    expect(screen.getByText('Drawdown máximo')).toBeInTheDocument();
    expect(screen.getByText('Meta de lucro')).toBeInTheDocument();
    expect(screen.queryByText(/sha256/)).not.toBeInTheDocument();
    expect(screen.queryByText('Validação manual')).not.toBeInTheDocument();
  });

  it('regra sem histórico mostra "Sem dados", sem inventar valor', () => {
    const evaluation = evaluateBoundAccountRules(
      createLinkedRuleEngineInput({
        snapshots: [],
        trades: [],
        positions: [],
        account: { startBalance: 100_000, currentBalance: 99_000, currentEquity: 99_000, phase: 'Fase 1' },
      }),
    );

    render(<BoundRuleEvaluationCard evaluation={evaluation} />);

    expect(screen.getAllByText('Sem dados').length).toBeGreaterThan(0);
  });

  it('conta que ainda não mandou dado nunca aparece como quebrada', () => {
    const evaluation = evaluateBoundAccountRules(
      createLinkedRuleEngineInput({
        snapshots: [],
        trades: [],
        positions: [],
        account: { startBalance: 100_000, currentBalance: 0, currentEquity: 0, phase: 'Fase 1' },
      }),
    );

    render(<BoundRuleEvaluationCard evaluation={evaluation} hasData={false} />);

    expect(screen.getByText('Aguardando dados')).toBeInTheDocument();
    expect(screen.queryByText('Quebrada')).not.toBeInTheDocument();
    expect(screen.queryByText('Limite atingido')).not.toBeInTheDocument();
  });
});
