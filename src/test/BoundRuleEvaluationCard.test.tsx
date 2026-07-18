import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BoundRuleEvaluationCard } from '../components/rules/BoundRuleEvaluationCard';
import { evaluateBoundAccountRules } from '../lib/ruleEngine/evaluateAccountRules';
import { createLinkedRuleEngineInput } from './fixtures/ruleEngineFixtures';

describe('BoundRuleEvaluationCard', () => {
  it('renders a linked snapshot with automatic, manual and unsupported rules', () => {
    const evaluation = evaluateBoundAccountRules(createLinkedRuleEngineInput());

    render(<BoundRuleEvaluationCard evaluation={evaluation} />);

    expect(screen.getByText('Regras do snapshot versionado')).toBeInTheDocument();
    expect(screen.getByText('Perda diária')).toBeInTheDocument();
    expect(screen.getByText('Drawdown máximo')).toBeInTheDocument();
    expect(screen.getByText('Meta de lucro')).toBeInTheDocument();
    expect(screen.getByText('Validação manual')).toBeInTheDocument();
    expect(screen.getByText('Notícias')).toBeInTheDocument();
    expect(screen.getByText('Ainda não suportado')).toBeInTheDocument();
    expect(screen.getByText('Detecção de copy trading')).toBeInTheDocument();
    expect(screen.getByText(/sha256:abc123/)).toBeInTheDocument();
  });

  it('renders partial operational data without throwing or inventing values', () => {
    const evaluation = evaluateBoundAccountRules(
      createLinkedRuleEngineInput({
        snapshots: [],
        trades: [],
        positions: [],
        account: {
          startBalance: 100_000,
          currentBalance: 99_000,
          currentEquity: 99_000,
          phase: 'Fase 1',
        },
      }),
    );

    render(<BoundRuleEvaluationCard evaluation={evaluation} />);

    expect(
      screen.getByText(
        'Histórico diário insuficiente para calcular esta regra com precisão.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Não monitorável')).toBeInTheDocument();
    expect(screen.getAllByText('Sem dados').length).toBeGreaterThan(0);
  });
});
