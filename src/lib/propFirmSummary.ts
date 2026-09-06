import {
  propFirmRulePrograms,
  type PropFirmName,
  type PropFirmRuleProgram,
  type RuleAccountSize,
} from '@/data/propFirmRules';

/**
 * Leitura do catálogo estático de mesas (src/data/propFirmRules.ts).
 *
 * Extraído de PropFirmLibrary.tsx porque a página pública /vendas/mesas passou
 * a mostrar a mesma coisa que a Biblioteca do painel — e duas cópias das mesmas
 * regras de leitura divergiriam na primeira mudança do catálogo.
 *
 * Só leitura e formatação: nada aqui decide o que é monitorado numa conta.
 * Isso continua sendo `account_rule_bindings` (ver src/lib/ruleBinding.ts).
 */

export type FirmStatus = 'operational' | 'unavailable' | 'legacy';

export const firmStatusLabel: Record<FirmStatus, string> = {
  operational: 'Operacional',
  unavailable: 'Indisponível',
  legacy: 'Legado',
};

/** Troca os marcadores de "sem fonte" do catálogo por texto legível. */
export function cleanValue(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized || ['-', '--', 'n/a', 'na', 'tbd', 'undefined', 'null'].includes(normalized.toLowerCase())) {
    return 'Verificar';
  }

  return normalized
    .replace(/Indisponível em fonte oficial vigente/gi, 'Não público')
    .replace(/Não informado publicamente/gi, 'Não público')
    .replace(/Confirmar no termo oficial/gi, 'Verificar')
    .replace(/(?:US)?\$\s*/gi, 'US$ ');
}

export function formatAccountLabel(value: string) {
  const normalized = cleanValue(value).replace(/^US\$\s*/i, '$');
  const shortDollar = normalized.match(/^\$(\d+(?:[.,]\d+)?)(K|M)$/i);
  if (shortDollar) {
    const amount = shortDollar[1].replace('.', ',');
    return `US$ ${amount} ${shortDollar[2].toUpperCase() === 'K' ? 'mil' : 'milhões'}`;
  }

  const fullDollar = normalized.match(/^\$([\d,]+)$/);
  if (fullDollar) return `US$ ${fullDollar[1].replace(/,/g, '.')}`;
  return normalized;
}

export function firmPrograms(firm: PropFirmName | null) {
  if (!firm) return [];
  return propFirmRulePrograms.filter((program) => program.firm === firm);
}

/**
 * Regras de conta de um programa. Programa sem fonte oficial vigente devolve
 * lista vazia de propósito: é o que faz `getFirmStatus` classificá-lo como
 * indisponível em vez de exibi-lo como se estivesse auditado.
 */
export function accountRules(program?: PropFirmRuleProgram) {
  if (!program || program.evidenceStatus === 'official_source_unavailable') return [];
  return program.accountLevelRules ?? [];
}

export function getFirmStatus(programs: PropFirmRuleProgram[]): FirmStatus {
  if (programs.some((program) => accountRules(program).length > 0)) return 'operational';
  if (programs.some((program) => program.evidenceStatus === 'official_source_unavailable')) return 'unavailable';
  return 'legacy';
}

export function getFirmPlatforms(programs: PropFirmRuleProgram[]) {
  return Array.from(
    new Set(
      programs.flatMap((program) => [
        ...program.platforms,
        ...accountRules(program).flatMap((account) => account.platforms),
      ]),
    ),
  ).filter(Boolean);
}

/**
 * Plataformas em formato de rótulo, para exibição.
 *
 * Alguns registros do catálogo trazem uma frase no campo de plataforma
 * ("Plataformas suportadas pela Topstep") em vez de um nome. Numa lista
 * separada por · isso lê como se a frase fosse uma plataforma. O filtro
 * mantém só o que tem cara de nome: até duas palavras e 22 caracteres.
 * `getFirmPlatforms` continua devolvendo o dado cru, que é o que a
 * Biblioteca do painel usa.
 */
export function platformLabels(programs: PropFirmRuleProgram[]) {
  return getFirmPlatforms(programs)
    .map((platform) => cleanValue(platform))
    .filter((label) => label.split(/\s+/).length <= 2 && label.length <= 22);
}

export function phaseSummary(account: RuleAccountSize) {
  return account.phases.map((phase) => `${phase.label}: ${cleanValue(phase.profitTarget)}`).join(' · ');
}

export function executionLimit(account: RuleAccountSize) {
  if (account.maxContracts !== 'Não aplicável') return cleanValue(account.maxContracts);
  if (account.maxLots !== 'Não aplicável') return cleanValue(account.maxLots);
  return 'Não aplicável';
}

export function payoutSummary(account: RuleAccountSize) {
  const split = cleanValue(account.payoutSplit);
  const timing = cleanValue(account.firstPayoutTiming);
  return split === timing ? split : `${split} · ${timing}`;
}

export function countLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}
