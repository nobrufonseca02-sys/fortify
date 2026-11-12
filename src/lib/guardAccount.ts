// Cria a conta que o Fortify Guard (EA) vai alimentar, a partir da mesa e do
// modelo escolhidos na Biblioteca de Mesas: trading_account aguardando o EA +
// vínculo auditado das regras (saveAccountRuleBinding) + fase da conta.
// O EA liga a conta ao login MT5 na primeira conexão (ver /ea/feed no gateway).

import { supabase } from '@/integrations/supabase/client';
import type { PropFirmRuleProgram, RuleAccountSize } from '@/data/propFirmRules';
import { accountRules } from '@/lib/propFirmSummary';
import { supportsMt5Monitoring } from '@/lib/monitoringCapability';
import {
  initialBalanceValue,
  isRuleBindingDraftComplete,
  saveAccountRuleBinding,
  type RuleBindingDraft,
} from '@/lib/ruleBinding';
import type { AccountStage } from '@/lib/ruleEngine/guardRules';
import { countAccountSlots, type SlotAccount } from '@/lib/eaLinking';

/** Tamanhos de conta do modelo que rodam no MT5 (o EA só existe no MT5). */
export function guardAccountSizes(program: PropFirmRuleProgram): RuleAccountSize[] {
  return accountRules(program).filter((account) => supportsMt5Monitoring(program, account));
}

export function guardBindingDraft(program: PropFirmRuleProgram, account: RuleAccountSize): RuleBindingDraft {
  const platform =
    [...account.platforms, ...program.platforms].map((item) => item.trim()).find((item) => item.toUpperCase() === 'MT5') ??
    account.platforms[0] ??
    '';
  const ruleVersionId = account.versions.find((version) => !version.effectiveTo)?.id ?? account.versions[0]?.id ?? '';
  return {
    propFirmSlug: program.firmSlug ?? '',
    programSlug: program.programSlug ?? '',
    accountSizeId: account.id,
    platform,
    ruleVersionId,
    // Só chega aqui depois que o trader marcou o aceite na tela: nunca é pré-marcado.
    manualRuleAcknowledgement: true,
  };
}

/**
 * Quantas contas do trader já ocupam vaga no plano, contando as que aguardam o
 * EA (ver countAccountSlots). Só orienta a tela: quem barra de verdade é o
 * gateway, na hora em que o EA conecta.
 */
export async function fetchUsedAccountSlots(userId: string): Promise<number> {
  const [accountsRes, connectionsRes] = await Promise.all([
    supabase.from('trading_accounts' as any).select('id, status, ea_status').eq('user_id', userId) as any,
    supabase
      .from('mt5_connections' as any)
      .select('trading_account_id')
      .eq('user_id', userId)
      .in('connection_status', ['connected', 'connecting', 'syncing']) as any,
  ]);
  if (accountsRes.error) throw new Error(accountsRes.error.message);
  if (connectionsRes.error) throw new Error(connectionsRes.error.message);
  const connected = ((connectionsRes.data ?? []) as any[]).map((row) => String(row.trading_account_id ?? '')).filter(Boolean);
  return countAccountSlots((accountsRes.data ?? []) as SlotAccount[], connected, { includePending: true });
}

export function planFullMessage(limit: number) {
  if (limit <= 0) return 'Assine um plano para monitorar contas pelo Fortify Guard.';
  const contas = limit === 1 ? '1 conta' : `${limit} contas`;
  return `Seu plano permite ${contas}, e todas já estão em uso. Faça upgrade ou arquive uma conta para criar outra.`;
}

/** Login MT5 que o trader digita para dizer ao EA qual conta é qual. */
export function normalizeMt5Login(value: string) {
  const login = value.replace(/\s+/g, '');
  return /^\d{3,20}$/.test(login) ? login : null;
}

/** Diz ao EA qual login MT5 é esta conta (quando há mais de uma aguardando). */
export async function setPendingAccountLogin(input: { userId: string; tradingAccountId: string; login: string }) {
  const login = normalizeMt5Login(input.login);
  if (!login) throw new Error('Digite só os números do login MT5 (o "Nome de usuário" do MT5).');
  const { data: taken, error: takenError } = await (supabase
    .from('trading_accounts' as any)
    .select('id, nickname')
    .eq('user_id', input.userId)
    .eq('mt5_login', login)
    .neq('status', 'archived')
    .neq('id', input.tradingAccountId)
    .limit(1)
    .maybeSingle() as any);
  if (takenError) throw new Error(takenError.message);
  if (taken) throw new Error(`O login ${login} já está na conta "${taken.nickname}".`);
  const { error } = await (supabase
    .from('trading_accounts' as any)
    .update({ mt5_login: login })
    .eq('id', input.tradingAccountId)
    .eq('user_id', input.userId)
    .eq('ea_status', 'pending') as any);
  if (error) throw new Error(error.message);
  return login;
}

export async function createGuardAccount(input: {
  userId: string;
  program: PropFirmRuleProgram;
  account: RuleAccountSize;
  stage: AccountStage;
  nickname: string;
  acknowledged: boolean;
  accountLimit: number;
}): Promise<{ tradingAccountId: string }> {
  if (!input.acknowledged) throw new Error('Confirme que leu as regras oficiais desta mesa.');
  if ((await fetchUsedAccountSlots(input.userId)) >= input.accountLimit) {
    throw new Error(planFullMessage(input.accountLimit));
  }
  const draft = guardBindingDraft(input.program, input.account);
  if (!isRuleBindingDraftComplete(draft)) {
    throw new Error('Este modelo ainda não tem as regras completas para o Fortify Guard.');
  }

  const nickname = input.nickname.trim() || `${input.program.firm} ${input.account.label}`;
  const { data, error } = await (supabase
    .from('trading_accounts' as any)
    .insert({
      user_id: input.userId,
      nickname,
      broker: input.program.firm,
      mt5_server: '',
      mt5_login: '',
      account_type: input.program.programType,
      prop_firm: input.program.firm,
      program: input.program.programName,
      base_currency: input.account.currency || 'USD',
      start_balance: initialBalanceValue(input.account.initialBalance) || 0,
      status: 'active',
      ea_status: 'pending',
    })
    .select('id')
    .single() as any);
  if (error || !data?.id) throw new Error(error?.message || 'Não foi possível criar a conta.');

  const tradingAccountId = data.id as string;
  await saveAccountRuleBinding({ userId: input.userId, tradingAccountId, draft });
  await (supabase.from('ea_rule_preferences' as any).upsert({
    trading_account_id: tradingAccountId,
    user_id: input.userId,
    rule_keys: null,
    account_stage: input.stage,
    updated_at: new Date().toISOString(),
  }) as any);
  return { tradingAccountId };
}
