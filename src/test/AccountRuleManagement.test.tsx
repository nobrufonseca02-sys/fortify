import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountRuleManagement from '../pages/AccountRuleManagement';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: { user: { id: 'user-1' }, access_token: 'token-1' },
  }),
}));

// Minimal chainable/thenable stand-in for a Supabase query builder: every
// builder method returns itself and awaiting anywhere in the chain yields the
// canned result.
function query(result: any) {
  const stub: any = {};
  for (const method of ['select', 'eq', 'in', 'is', 'not', 'order', 'limit', 'insert']) {
    stub[method] = vi.fn(() => stub);
  }
  stub.maybeSingle = vi.fn(() => Promise.resolve(result));
  stub.single = vi.fn(() => Promise.resolve(result));
  stub.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return stub;
}

let accountRow: any = null;
let ruleSetRows: any[] = [];
const tradingAccountsUpdate = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'trading_accounts') {
        const stub = query({ data: accountRow, error: null });
        stub.update = (payload: any) => {
          tradingAccountsUpdate(payload);
          return query({ error: null });
        };
        return stub;
      }
      if (table === 'rule_set_versions') return query({ data: ruleSetRows, error: null });
      if (table === 'mt5_connections' || table === 'account_rule_bindings') {
        return query({ data: null, error: null });
      }
      return query({ data: [], error: null });
    },
  },
}));

const GENERIC_10K = {
  id: 'version-generic-10k',
  program_id: 'program-generic',
  name: 'Generic Broker-only $10k Risk Template',
  account_size: 10000,
  status: 'active',
  review_status: 'user_custom',
  is_user_custom: true,
  programs: { prop_firm_id: 'firm-generic', prop_firms: { name: 'Generic MT5 Broker', slug: 'generic-mt5-broker' } },
};

// Real prop-firm templates are seeded with no account_size at all — they must
// stay selectable for every account size, exactly as before.
const FTMO_NO_SIZE = {
  id: 'version-ftmo',
  program_id: 'program-ftmo',
  name: 'Evaluation / Verification Starter Rules',
  account_size: null,
  status: 'draft',
  review_status: 'needs_review',
  programs: { prop_firm_id: 'firm-ftmo', prop_firms: { name: 'FTMO', slug: 'ftmo' } },
};

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 'account-1',
    user_id: 'user-1',
    nickname: 'Conta MT5 principal',
    mt5_login: '12345678',
    mt5_server: 'Broker-Server01',
    start_balance: 200000,
    current_balance: 200000,
    account_size: null,
    rule_set_id: null,
    rule_selection_status: 'unconfigured',
    status: 'active',
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/accounts/account-1/rules']}>
      <Routes>
        <Route path="/accounts/:accountId/rules" element={<AccountRuleManagement />} />
      </Routes>
    </MemoryRouter>,
  );
}

function legacyRuleSetSelect() {
  const placeholder = screen.getByRole('option', { name: /Sem regras \/ monitoramento broker-only/ });
  const select = placeholder.closest('select');
  if (!select) throw new Error('Legacy rule-set select não encontrado');
  return select;
}

describe('AccountRuleManagement legacy rule-set size guard', () => {
  beforeEach(() => {
    tradingAccountsUpdate.mockClear();
    accountRow = account();
    ruleSetRows = [GENERIC_10K, FTMO_NO_SIZE];
  });

  it('disables a template built for another account size', async () => {
    renderPage();

    const mismatched = await screen.findByRole('option', {
      name: /Generic Broker-only \$10k Risk Template/,
    });
    expect(mismatched).toBeDisabled();
    expect(mismatched).toHaveTextContent('incompatível com o tamanho desta conta');

    // Versions without a declared size are unaffected by the guard.
    expect(
      screen.getByRole('option', { name: /Evaluation \/ Verification Starter Rules/ }),
    ).not.toBeDisabled();

    expect(
      screen.getByText(/Modelos construídos para outro tamanho de conta ficam desabilitados/),
    ).toBeInTheDocument();
  });

  it('blocks saving an account already bound to a mismatched template', async () => {
    accountRow = account({ rule_set_id: GENERIC_10K.id, rule_selection_status: 'configured' });
    renderPage();

    const alert = await screen.findByText('Modelo incompatível com o tamanho da conta');
    expect(alert).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: 'Salvar regras' });
    expect(saveButton).toBeDisabled();

    fireEvent.click(saveButton);
    expect(tradingAccountsUpdate).not.toHaveBeenCalled();
  });

  it('still allows a correctly sized template to be selected and saved', async () => {
    accountRow = account({ start_balance: 10000, current_balance: 10000 });
    renderPage();

    const compatible = await screen.findByRole('option', {
      name: /Generic Broker-only \$10k Risk Template/,
    });
    expect(compatible).not.toBeDisabled();
    expect(compatible).not.toHaveTextContent('incompatível');

    fireEvent.change(legacyRuleSetSelect(), { target: { value: GENERIC_10K.id } });

    const saveButton = screen.getByRole('button', { name: 'Salvar regras' });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);
    await waitFor(() => expect(tradingAccountsUpdate).toHaveBeenCalledTimes(1));
    expect(tradingAccountsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ rule_set_id: GENERIC_10K.id, rule_selection_status: 'configured' }),
    );
  });

  it('accepts a size inside the tolerance band the suggestions already used', async () => {
    accountRow = account({ start_balance: 10800, current_balance: 10800 });
    renderPage();

    const compatible = await screen.findByRole('option', {
      name: /Generic Broker-only \$10k Risk Template/,
    });
    expect(compatible).not.toBeDisabled();
    expect(
      screen.queryByText(/Modelos construídos para outro tamanho de conta ficam desabilitados/),
    ).not.toBeInTheDocument();
  });
});
