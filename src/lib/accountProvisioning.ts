import type { SupabaseClient } from '@supabase/supabase-js';
import { getConnectErrorMessage } from '@/lib/betaReadiness';
import { gatewayJsonHeaders } from '@/lib/gateway';
import { saveAccountRuleBinding, type ResolvedRuleBinding, type RuleBindingDraft } from '@/lib/ruleBinding';

export interface ProvisionAndConnectParams {
  supabase: SupabaseClient;
  userId: string;
  accessToken: string;
  gatewayUrl: string;
  resolvedBinding: ResolvedRuleBinding;
  ruleBindingDraft: RuleBindingDraft;
  accountName: string;
  startBalance: number;
  currency: string;
  accountType?: string;
  legacyRuleSetId?: string | null;
  mt5Login: string;
  mt5Server: string;
  mt5Broker: string;
  mt5Password: string;
}

export interface ProvisionAndConnectResult {
  tradingAccountId: string | null;
  insertMessage: string | null;
  connectOk: boolean;
  connectMessage: string | null;
  bindingOk: boolean;
  bindingMessage: string | null;
}

// Creates the trading_accounts row, provisions the MetaApi connection, and
// saves the audited rule binding — in that order, never throwing. Every step
// past the initial insert is best-effort: as long as a trading_accounts row
// exists, callers should route the trader to /accounts/:id/rules regardless
// of connectOk/bindingOk, since that page already handles "not connected yet"
// and "rule pending" gracefully. Do not resurrect a "send them back to the
// generic accounts list" branch here — that was the dead-end bug this
// function exists to fix.
export async function provisionAndConnectTradingAccount(
  params: ProvisionAndConnectParams,
): Promise<ProvisionAndConnectResult> {
  const {
    supabase,
    userId,
    accessToken,
    gatewayUrl,
    resolvedBinding,
    ruleBindingDraft,
    accountName,
    startBalance,
    currency,
    accountType,
    legacyRuleSetId,
    mt5Login,
    mt5Server,
    mt5Broker,
    mt5Password,
  } = params;

  const resolvedAccountName = accountName || `${resolvedBinding.program.firm} ${resolvedBinding.accountSize.label}`;

  const insertRes = await supabase
    .from('trading_accounts')
    .insert({
      user_id: userId,
      nickname: resolvedAccountName,
      broker: mt5Broker.trim() || resolvedBinding.program.firm,
      mt5_server: mt5Server.trim(),
      mt5_login: mt5Login.trim(),
      account_type: accountType || resolvedBinding.program.programType,
      prop_firm: resolvedBinding.program.firm,
      base_currency: currency,
      start_balance: startBalance,
      rule_set_id: legacyRuleSetId ?? null,
      program: resolvedBinding.program.programName,
      status: 'active',
    })
    .select('id')
    .single();

  if (insertRes.error || !insertRes.data) {
    return {
      tradingAccountId: null,
      insertMessage: insertRes.error?.message ?? 'Não foi possível salvar a conta no Supabase.',
      connectOk: false,
      connectMessage: null,
      bindingOk: false,
      bindingMessage: null,
    };
  }

  const tradingAccountId: string = insertRes.data.id;
  let connectOk = false;
  let connectMessage: string | null = null;
  let mt5ConnectionId: string | null = null;

  try {
    const gatewayRes = await fetch(`${gatewayUrl}/metaapi/connect`, {
      method: 'POST',
      headers: gatewayJsonHeaders(accessToken),
      body: JSON.stringify({
        accountName: resolvedAccountName,
        mt5Login: mt5Login.trim(),
        mt5Server: mt5Server.trim(),
        brokerName: mt5Broker.trim() || resolvedBinding.program.firm || 'Custom',
        mt5Password,
        tradingAccountId,
        userId,
      }),
    });
    const connData = await gatewayRes.json();

    if (!gatewayRes.ok) {
      connectMessage = getConnectErrorMessage(connData);
    } else {
      connectOk = true;
      mt5ConnectionId = connData?.connection?.id ?? null;
    }
  } catch (error: any) {
    connectMessage = error?.message || 'Erro de conexão com o backend';
  }

  let bindingOk = false;
  let bindingMessage: string | null = null;
  try {
    await saveAccountRuleBinding({
      userId,
      tradingAccountId,
      mt5ConnectionId,
      draft: ruleBindingDraft,
    });
    bindingOk = true;
  } catch (error: any) {
    bindingMessage = error?.message || 'Abra a conta para concluir o vínculo de regras.';
  }

  return { tradingAccountId, insertMessage: null, connectOk, connectMessage, bindingOk, bindingMessage };
}
