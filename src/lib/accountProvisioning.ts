import type { SupabaseClient } from '@supabase/supabase-js';
import { getConnectErrorMessage } from '@/lib/betaReadiness';
import { gatewayJsonHeaders } from '@/lib/gateway';
import { saveAccountRuleBinding, type ResolvedRuleBinding, type RuleBindingDraft } from '@/lib/ruleBinding';

export interface ProvisionAndConnectParams {
  supabase: SupabaseClient;
  userId: string;
  accessToken: string;
  gatewayUrl: string;
  /**
   * Audited rule selection, when the caller already resolved one (CreateAccount's
   * wizard). Optional because the fast-connect form on /accounts deliberately
   * defers the binding to a separate step — omit it and the prop_firm/program
   * columns stay null until the trader completes the binding on
   * /accounts/:id/rules.
   */
  resolvedBinding?: ResolvedRuleBinding | null;
  /**
   * Acknowledged binding draft to persist through saveAccountRuleBinding().
   * Omit it to skip the binding write entirely (see `bindingDeferred`). It is
   * never synthesized here: an audited binding only exists when the trader
   * explicitly acknowledged it in RuleBindingSelector.
   */
  ruleBindingDraft?: RuleBindingDraft | null;
  accountName: string;
  /** Defaults to 0 — the first MetaApi sync overwrites it with the real balance. */
  startBalance?: number;
  /** Defaults to 'USD'. */
  currency?: string;
  accountType?: string;
  legacyRuleSetId?: string | null;
  mt5Login: string;
  mt5Server: string;
  mt5Broker?: string;
  mt5Password: string;
}

export interface ProvisionAndConnectResult {
  tradingAccountId: string | null;
  insertMessage: string | null;
  connectOk: boolean;
  connectMessage: string | null;
  bindingOk: boolean;
  bindingMessage: string | null;
  /**
   * true when no ruleBindingDraft was supplied, i.e. the caller intentionally
   * postponed the audited binding. Callers must not treat this like a failed
   * binding save — there is nothing to retry, only a follow-up step to prompt.
   */
  bindingDeferred: boolean;
  /** true when an existing trading_accounts row for this MT5 login+server was reused. */
  reusedExistingTradingAccount: boolean;
}

// Creates (or reuses) the trading_accounts row, provisions the MetaApi
// connection, and saves the audited rule binding — in that order, never
// throwing. Every step past the initial insert is best-effort: as long as a
// trading_accounts row exists, callers should route the trader to
// /accounts/:id/rules regardless of connectOk/bindingOk, since that page
// already handles "not connected yet" and "rule pending" gracefully. Do not
// resurrect a "send them back to the generic accounts list" branch here — that
// was the dead-end bug this function exists to fix.
//
// When no resolvedBinding is supplied (fast connect), an existing active
// account for the same user + MT5 login + server is reused instead of inserting
// a duplicate: that flow has no new audited data to write onto the row, and
// retrying after a wrong password would otherwise pile up ghost accounts. The
// gateway refreshes connection/detection fields on whichever row we hand it.
export async function provisionAndConnectTradingAccount(
  params: ProvisionAndConnectParams,
): Promise<ProvisionAndConnectResult> {
  const {
    supabase,
    userId,
    accessToken,
    gatewayUrl,
    resolvedBinding = null,
    ruleBindingDraft = null,
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

  const login = (mt5Login ?? '').trim();
  const server = (mt5Server ?? '').trim();
  const broker = (mt5Broker ?? '').trim();

  const resolvedAccountName =
    (accountName ?? '').trim() ||
    (resolvedBinding ? `${resolvedBinding.program.firm} ${resolvedBinding.accountSize.label}` : '') ||
    (login ? `Conta MT5 ${login}` : 'Conta MT5');

  let tradingAccountId: string | null = null;
  let reusedExistingTradingAccount = false;

  if (!resolvedBinding && login && server) {
    const existingRes = await supabase
      .from('trading_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('mt5_login', login)
      .eq('mt5_server', server)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // A failed lookup is not fatal: fall through to the insert below.
    if (!existingRes.error && existingRes.data?.id) {
      tradingAccountId = existingRes.data.id as string;
      reusedExistingTradingAccount = true;
    }
  }

  if (!tradingAccountId) {
    const insertRes = await supabase
      .from('trading_accounts')
      .insert({
        user_id: userId,
        nickname: resolvedAccountName,
        broker: broker || resolvedBinding?.program.firm || null,
        mt5_server: server,
        mt5_login: login,
        account_type: accountType || resolvedBinding?.program.programType || null,
        prop_firm: resolvedBinding?.program.firm ?? null,
        base_currency: currency || 'USD',
        start_balance: Number.isFinite(startBalance) ? (startBalance as number) : 0,
        rule_set_id: legacyRuleSetId ?? null,
        program: resolvedBinding?.program.programName ?? null,
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
        bindingDeferred: !ruleBindingDraft,
        reusedExistingTradingAccount: false,
      };
    }

    tradingAccountId = insertRes.data.id as string;
  }

  let connectOk = false;
  let connectMessage: string | null = null;
  let mt5ConnectionId: string | null = null;

  try {
    const gatewayRes = await fetch(`${gatewayUrl}/metaapi/connect`, {
      method: 'POST',
      headers: gatewayJsonHeaders(accessToken),
      body: JSON.stringify({
        accountName: resolvedAccountName,
        mt5Login: login,
        mt5Server: server,
        // Empty string lets the gateway apply its own "Unknown" default instead
        // of us inventing a broker name the trader never typed.
        brokerName: broker || resolvedBinding?.program.firm || '',
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

  if (ruleBindingDraft) {
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
  }

  return {
    tradingAccountId,
    insertMessage: null,
    connectOk,
    connectMessage,
    bindingOk,
    bindingMessage,
    bindingDeferred: !ruleBindingDraft,
    reusedExistingTradingAccount,
  };
}
