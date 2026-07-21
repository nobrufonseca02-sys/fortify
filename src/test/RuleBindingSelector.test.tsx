import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RuleBindingSelector } from '../components/rules/RuleBindingSelector';
import {
  emptyRuleBindingDraft,
  getOperationalRulePrograms,
  isRuleBindingDraftComplete,
  type RuleBindingDraft,
} from '../lib/ruleBinding';
import type { RuleBindingInitialSelection } from '../components/rules/RuleBindingSelector';

function SelectorHarness() {
  const [draft, setDraft] = useState<RuleBindingDraft>(emptyRuleBindingDraft);
  return (
    <>
      <RuleBindingSelector
        value={draft}
        onChange={setDraft}
        platformConstraint="MT5"
      />
      <button type="button" disabled={!isRuleBindingDraftComplete(draft)}>
        Salvar vínculo
      </button>
    </>
  );
}

function InitialSelectorHarness({ initialSelection }: { initialSelection: RuleBindingInitialSelection }) {
  const [draft, setDraft] = useState<RuleBindingDraft>(emptyRuleBindingDraft);
  return (
    <>
      <RuleBindingSelector
        value={draft}
        onChange={setDraft}
        initialSelection={initialSelection}
      />
      <button type="button" disabled={!isRuleBindingDraftComplete(draft)}>
        Salvar vínculo
      </button>
    </>
  );
}

describe('RuleBindingSelector', () => {
  it('does not expose unavailable firms as operational choices', () => {
    render(<SelectorHarness />);
    const firmSelect = screen.getByLabelText('Mesa proprietária');

    expect(within(firmSelect).queryByRole('option', { name: 'Fundscap' })).not.toBeInTheDocument();
    expect(within(firmSelect).queryByRole('option', { name: 'MyFundedFX' })).not.toBeInTheDocument();
  });

  it('chains firm, program, variant, platform and version before enabling save', () => {
    render(<SelectorHarness />);
    const program = getOperationalRulePrograms('MT5')[0];
    const accountSize = program.accountLevelRules.find((account) =>
      account.platforms.some((platform) => /mt5/i.test(platform)),
    )!;
    const platform = accountSize.platforms.find((item) => /mt5/i.test(item))!;

    const saveButton = screen.getByRole('button', { name: 'Salvar vínculo' });
    expect(saveButton).toBeDisabled();
    expect(screen.getByTestId('rule-binding-readiness')).toHaveTextContent('Seleção incompleta');

    fireEvent.change(screen.getByLabelText('Mesa proprietária'), {
      target: { value: program.firmSlug },
    });
    fireEvent.change(screen.getByLabelText('Programa'), {
      target: { value: program.programSlug },
    });
    fireEvent.change(screen.getByLabelText('Tamanho ou variante'), {
      target: { value: accountSize.id },
    });
    fireEvent.change(screen.getByLabelText('Plataforma'), {
      target: { value: platform },
    });
    fireEvent.change(screen.getByLabelText('Versão da regra'), {
      target: { value: accountSize.versions[0].id },
    });

    expect(saveButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Aceitar regras manuais'));

    expect(saveButton).toBeEnabled();
    expect(screen.getByTestId('rule-binding-readiness')).toHaveTextContent('Vínculo pronto para salvar');
    expect(screen.getByText('Automático via MT5')).toBeInTheDocument();
    expect(screen.getByText('Conferência manual')).toBeInTheDocument();
  });

  it('applies a valid initial selection and still allows manual changes', async () => {
    const program = getOperationalRulePrograms().find((item) => item.firmSlug === 'ftmo')!;
    const accountSize = program.accountLevelRules.find((account) =>
      account.platforms.some((platform) => /mt5/i.test(platform)),
    )!;
    const platform = accountSize.platforms.find((item) => /mt5/i.test(item))!;
    const initialSelection = {
      propFirmSlug: program.firmSlug,
      programSlug: program.programSlug,
      accountSizeId: accountSize.id,
      platform,
      ruleVersionId: accountSize.versions[0].id,
    };

    render(<InitialSelectorHarness initialSelection={initialSelection} />);

    await waitFor(() => expect(screen.getByLabelText('Mesa proprietária')).toHaveValue(program.firmSlug));
    expect(screen.getByLabelText('Programa')).toHaveValue(program.programSlug);
    expect(screen.getByLabelText('Tamanho ou variante')).toHaveValue(accountSize.id);
    expect(screen.getByLabelText('Plataforma')).toHaveValue(platform);
    expect(screen.getByLabelText('Versão da regra')).toHaveValue(accountSize.versions[0].id);
    expect(screen.getByLabelText('Aceitar regras manuais')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Salvar vínculo' })).toBeDisabled();

    const anotherFirm = getOperationalRulePrograms().find((item) => item.firmSlug !== program.firmSlug)!;
    fireEvent.change(screen.getByLabelText('Mesa proprietária'), {
      target: { value: anotherFirm.firmSlug },
    });

    expect(screen.getByLabelText('Mesa proprietária')).toHaveValue(anotherFirm.firmSlug);
    expect(screen.getByLabelText('Programa')).toHaveValue('');
    expect(screen.getByLabelText('Aceitar regras manuais')).toBeDisabled();
  });
});
