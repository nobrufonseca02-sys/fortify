import { afterEach, describe, expect, it, vi } from 'vitest';
import { provisionAndConnectTradingAccount } from '../lib/accountProvisioning';
import { getOperationalRulePrograms, resolveRuleBinding, type RuleBindingDraft } from '../lib/ruleBinding';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase as mockedSharedSupabase } from '@/integrations/supabase/client';

function mt5Draft(): RuleBindingDraft {
  const program = getOperationalRulePrograms('MT5')[0];
  const accountSize = program.accountLevelRules.find((account) =>
    account.platforms.some((platform) => /mt5/i.test(platform)),
  )!;
  const platform = accountSize.platforms.find((item) => /mt5/i.test(item))!;
  const version = accountSize.versions[0];

  return {
    propFirmSlug: program.firmSlug,
    programSlug: program.programSlug,
    accountSizeId: accountSize.id,
    platform,
    ruleVersionId: version.id,
    manualRuleAcknowledgement: true,
  };
}

function baseParams(supabaseInsertClient: any) {
  const draft = mt5Draft();
  const resolvedBinding = resolveRuleBinding(draft)!;

  return {
    supabase: supabaseInsertClient,
    userId: 'user-1',
    accessToken: 'token-1',
    gatewayUrl: 'http://gateway.local',
    resolvedBinding,
    ruleBindingDraft: draft,
    accountName: 'Minha conta',
    startBalance: 100000,
    currency: 'USD',
    mt5Login: 'login-1',
    mt5Server: 'server-1',
    mt5Broker: 'Broker X',
    mt5Password: 'secret',
  };
}

function supabaseClientReturning(result: { data: { id: string } | null; error: { message: string } | null }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  return { from } as any;
}

function mockBindingInsertOnce(result: { data: any; error: { message: string } | null }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  (mockedSharedSupabase.from as any).mockReturnValue({ insert });
}

describe('provisionAndConnectTradingAccount', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns no tradingAccountId when the initial insert fails, without touching the gateway', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const supabaseInsertClient = supabaseClientReturning({ data: null, error: { message: 'insert boom' } });

    const result = await provisionAndConnectTradingAccount(baseParams(supabaseInsertClient));

    expect(result.tradingAccountId).toBeNull();
    expect(result.insertMessage).toBe('insert boom');
    expect(result.connectOk).toBe(false);
    expect(result.bindingOk).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports connectOk and bindingOk when both the gateway and the binding save succeed', async () => {
    const supabaseInsertClient = supabaseClientReturning({ data: { id: 'account-1' }, error: null });
    mockBindingInsertOnce({ data: { id: 'binding-1' }, error: null });
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ connection: { id: 'conn-1' } }),
    } as Response);

    const result = await provisionAndConnectTradingAccount(baseParams(supabaseInsertClient));

    expect(result.tradingAccountId).toBe('account-1');
    expect(result.connectOk).toBe(true);
    expect(result.connectMessage).toBeNull();
    expect(result.bindingOk).toBe(true);
  });

  it('still returns the tradingAccountId when the gateway call fails (no dead end)', async () => {
    const supabaseInsertClient = supabaseClientReturning({ data: { id: 'account-2' }, error: null });
    mockBindingInsertOnce({ data: { id: 'binding-2' }, error: null });
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'wrong_mt5_credentials' }),
    } as Response);

    const result = await provisionAndConnectTradingAccount(baseParams(supabaseInsertClient));

    expect(result.tradingAccountId).toBe('account-2');
    expect(result.connectOk).toBe(false);
    expect(result.connectMessage).toBeTruthy();
    expect(result.bindingOk).toBe(true);
  });

  it('still returns the tradingAccountId when the rule-binding save fails', async () => {
    const supabaseInsertClient = supabaseClientReturning({ data: { id: 'account-3' }, error: null });
    mockBindingInsertOnce({ data: null, error: { message: 'binding boom' } });
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ connection: { id: 'conn-3' } }),
    } as Response);

    const result = await provisionAndConnectTradingAccount(baseParams(supabaseInsertClient));

    expect(result.tradingAccountId).toBe('account-3');
    expect(result.connectOk).toBe(true);
    expect(result.bindingOk).toBe(false);
    expect(result.bindingMessage).toBeTruthy();
  });
});
