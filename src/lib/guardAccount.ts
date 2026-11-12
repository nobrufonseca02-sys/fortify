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

export async function createGuardAccount(input: {
  userId: string;
  program: PropFirmRuleProgram;
  account: RuleAccountSize;
  stage: AccountStage;
  nickname: string;
  acknowledged: boolean;
}): Promise<{ tradingAccountId: string }> {
  if (!input.acknowledged) throw new Error('Confirme que leu as regras oficiais desta mesa.');
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
