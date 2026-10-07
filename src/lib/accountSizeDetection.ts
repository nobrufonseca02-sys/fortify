// Detecta automaticamente o tamanho de conta (e a versão de regra correspondente)
// a partir do saldo real sincronizado da MT5, para o fluxo "Conectar e detectar
// automaticamente" da Biblioteca de Mesas — o trader escolhe mesa e programa,
// conecta a conta, e o Fortify sugere o tamanho em vez de obrigar uma tela extra
// de seleção manual. O aceite manual continua sendo exigido depois: isto só
// pré-preenche o rascunho do vínculo, nunca salva nada sozinho.

import type { AccountLevelPropFirmRuleProgram } from '@/data/prop-firms/accountLevelRules';
import type { RuleAccountSize } from '@/data/propFirmRules';
import { getOperationalRulePrograms, initialBalanceValue } from '@/lib/ruleBinding';

export interface DetectedAccountSize {
  program: AccountLevelPropFirmRuleProgram;
  accountSize: RuleAccountSize;
  platform: string;
  ruleVersionId: string;
  confidence: 'exact' | 'nearest';
}

// Além dessa margem, o saldo sincronizado não bate com nenhum tamanho conhecido
// da mesa com confiança suficiente — melhor deixar em branco para o trader
// escolher manualmente do que arriscar um palpite ruim.
const MAX_RELATIVE_DIFFERENCE = 0.15;

export function findMt5ProgramBySlug(firmSlug: string, programSlug: string) {
  if (!firmSlug || !programSlug) return null;
  return (
    getOperationalRulePrograms('MT5').find(
      (program) => program.firmSlug === firmSlug && program.programSlug === programSlug,
    ) ?? null
  );
}

export function detectAccountSizeFromBalance(
  program: AccountLevelPropFirmRuleProgram,
  balance: number,
): DetectedAccountSize | null {
  if (!Number.isFinite(balance) || balance <= 0) return null;

  const candidates = program.accountLevelRules
    .filter((size) => size.platforms.some((platform) => /mt5/i.test(platform)))
    .map((size) => ({ size, amount: Number(initialBalanceValue(size.initialBalance)) }))
    .filter((entry): entry is { size: RuleAccountSize; amount: number } => Number.isFinite(entry.amount) && entry.amount > 0);
  if (candidates.length === 0) return null;

  const exactMatch = candidates.find((entry) => entry.amount === balance) ?? null;
  const nearest = exactMatch
    ? null
    : candidates.reduce<{ entry: (typeof candidates)[number]; diff: number } | null>((best, entry) => {
        const diff = Math.abs(entry.amount - balance);
        return !best || diff < best.diff ? { entry, diff } : best;
      }, null);

  const chosen = exactMatch ?? nearest?.entry ?? null;
  if (!chosen) return null;
  if (!exactMatch) {
    const relativeDiff = Math.abs(chosen.amount - balance) / chosen.amount;
    if (relativeDiff > MAX_RELATIVE_DIFFERENCE) return null;
  }

  const platform = chosen.size.platforms.find((item) => /mt5/i.test(item)) ?? 'MT5';
  // Mesma regra que o resto do app usa para "versão vigente": sem data de
  // encerramento, ou a primeira cadastrada.
  const version = chosen.size.versions.find((item) => !item.effectiveTo) ?? chosen.size.versions[0];
  if (!version) return null;

  return {
    program,
    accountSize: chosen.size,
    platform,
    ruleVersionId: version.id,
    confidence: exactMatch ? 'exact' : 'nearest',
  };
}

// Chave do hint salvo no localStorage entre "conectei no fluxo de auto-detecção"
// e "abri /accounts/:id/rules desta conta". É só uma conveniência de UX — nunca
// é a fonte de verdade de um vínculo (isso continua sendo account_rule_bindings,
// só gravado após o aceite manual explícito).
const PENDING_KEY_PREFIX = 'fortify:pendingLibraryProgram:';

export interface PendingLibraryProgram {
  firmSlug: string;
  programSlug: string;
}

export function savePendingLibraryProgram(tradingAccountId: string, hint: PendingLibraryProgram) {
  try {
    window.localStorage.setItem(`${PENDING_KEY_PREFIX}${tradingAccountId}`, JSON.stringify(hint));
  } catch {
    // localStorage indisponível (modo privado, quota, etc.) — a tela de
    // vínculo cai no fluxo manual normal, sem detecção automática.
  }
}

export function readPendingLibraryProgram(tradingAccountId: string): PendingLibraryProgram | null {
  try {
    const raw = window.localStorage.getItem(`${PENDING_KEY_PREFIX}${tradingAccountId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.firmSlug === 'string' && typeof parsed?.programSlug === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function clearPendingLibraryProgram(tradingAccountId: string) {
  try {
    window.localStorage.removeItem(`${PENDING_KEY_PREFIX}${tradingAccountId}`);
  } catch {
    // Ignorado de propósito — não impede o fluxo de seguir.
  }
}
