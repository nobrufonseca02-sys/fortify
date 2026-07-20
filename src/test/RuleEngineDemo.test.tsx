import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RuleEngineDemoPanel } from '../components/rules/RuleEngineDemoPanel';
import {
  ruleEngineDemoScenarios,
  type RuleEngineDemoScenarioId,
} from '../lib/ruleEngine/demoFixtures';

function scenario(id: RuleEngineDemoScenarioId) {
  const selected = ruleEngineDemoScenarios.find((item) => item.id === id);
  if (!selected) throw new Error(`Cenário demo não encontrado: ${id}`);
  return selected;
}

describe('safe rule engine demo mode', () => {
  it('loads all controlled scenarios with the expected engine status', () => {
    expect(ruleEngineDemoScenarios).toHaveLength(10);

    for (const item of ruleEngineDemoScenarios) {
      expect(item.evaluation.overallStatus).toBe(item.expectedStatus);
      expect(item.binding.rule_snapshot_hash).toMatch(/^demo-fnv1a64:/);
      expect(item.evaluation.source.officialSourceUrls.length).toBeGreaterThan(0);
      expect(['Fundscap', 'MyFundedFX']).not.toContain(
        item.binding.rule_snapshot.propFirm.name,
      );
    }
  });

  it('demonstrates automatic, conservative and BlackArrow behavior', () => {
    expect(
      scenario('safe').evaluation.automaticRules.map((rule) => rule.label),
    ).toEqual(['Perda diária', 'Drawdown máximo', 'Meta de lucro']);
    expect(
      scenario('warning').evaluation.automaticRules.find(
        (rule) => rule.key === 'daily_loss',
      ),
    ).toMatchObject({
      currentValue: 3_750,
      limitValue: 5_000,
      status: 'warning',
    });
    expect(
      scenario('breached').evaluation.automaticRules.find(
        (rule) => rule.key === 'max_drawdown',
      ),
    ).toMatchObject({
      currentValue: 11_000,
      limitValue: 10_000,
      status: 'breached',
    });
    expect(
      scenario('profit_target_near').evaluation.automaticRules.find(
        (rule) => rule.key === 'profit_target',
      )?.percentage,
    ).toBe(95);
    expect(
      scenario('profit_target_reached').evaluation.automaticRules.find(
        (rule) => rule.key === 'profit_target',
      )?.message,
    ).toContain('atingida');
    expect(
      scenario('insufficient_daily_history').evaluation.automaticRules.find(
        (rule) => rule.key === 'daily_loss',
      )?.message,
    ).toContain('Histórico diário insuficiente');
    expect(
      scenario('manual_rule').evaluation.automaticRules.find(
        (rule) => rule.key === 'daily_loss',
      )?.monitorability,
    ).toBe('manual_check');
    expect(
      scenario('unsupported_rule').evaluation.automaticRules.find(
        (rule) => rule.key === 'max_drawdown',
      )?.monitorability,
    ).toBe('not_supported_yet');
    expect(
      scenario('futures_blackarrow').evaluation.automaticRules.every(
        (rule) => rule.status === 'not_monitorable',
      ),
    ).toBe(true);
  });

  it('renders explicit demo safeguards and allows scenario selection', () => {
    render(<RuleEngineDemoPanel />);

    expect(screen.getByTestId('demo-mode-badge')).toHaveTextContent(
      'Modo demonstração',
    );
    expect(screen.getByText(/Dados simulados/)).toBeInTheDocument();
    expect(screen.getByText(/Não representa conexão MT5 real/)).toBeInTheDocument();
    expect(screen.getByText(/não gera custo MetaApi/)).toBeInTheDocument();
    expect(screen.getByText('Perda diária')).toBeInTheDocument();
    expect(screen.getByText('Drawdown máximo')).toBeInTheDocument();
    expect(screen.getByText('Meta de lucro')).toBeInTheDocument();
    expect(screen.getByText('Validação manual')).toBeInTheDocument();
    expect(screen.getByText('Ainda não suportado')).toBeInTheDocument();
    expect(screen.getByText(/Assinatura demo:/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Cenário de validação'), {
      target: { value: 'futures_blackarrow' },
    });

    expect(screen.getByText('NP Future')).toBeInTheDocument();
    expect(screen.getAllByText(/BlackArrow/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        'Futures, BlackArrow ou plataforma sem conector MT5 não recebem cálculo automático.',
      ).length,
    ).toBeGreaterThan(0);
  });
});
