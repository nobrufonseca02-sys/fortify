// Ported from src/lib/ruleEngine/ruleEngineTypes.ts -- keep in sync manually; no
// shared-package tooling exists in this repo yet. Only parseRuleLimit and its private
// helpers are ported (the rest of that file's exports aren't needed here). The unused
// `import type { AccountRuleBindingRow } from '@/lib/ruleBinding'` in the source file is
// dropped -- it was type-only and unused by this subset anyway.

// Built from numeric char codes (0x0300-0x036f, the Unicode "Combining Diacritical
// Marks" block) rather than an inline \uXXXX-\uXXXX regex literal, to sidestep source
// file encoding issues with that character range.
const DIACRITIC_MARKS_RANGE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

const unknownRuleMarkers = [
  'unavailable',
  'unknown',
  'partial',
  'nao informado',
  'não informado',
  'nao aplicavel',
  'não aplicável',
  'indisponivel',
  'indisponível',
  'verificar no site oficial',
  'confirmar no',
  'a confirmar',
  'dados pendentes',
  'sem catalogo',
  'sem catálogo',
];

function normalizeRuleText(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(DIACRITIC_MARKS_RANGE, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function isExplicitRuleValue(value: string | null | undefined) {
  const normalized = normalizeRuleText(value);
  if (!normalized) return false;
  return !unknownRuleMarkers.some((marker) =>
    normalized.includes(normalizeRuleText(marker)),
  );
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLocalizedNumber(value: string) {
  const compact = value.replace(/\s/g, '');
  const hasComma = compact.includes(',');
  const hasDot = compact.includes('.');
  let normalized = compact;

  if (hasComma && hasDot) {
    const decimalSeparator =
      compact.lastIndexOf(',') > compact.lastIndexOf('.') ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = compact
      .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (hasComma) {
    const parts = compact.split(',');
    normalized =
      parts.length > 2 || parts.at(-1)?.length === 3
        ? parts.join('')
        : compact.replace(',', '.');
  } else if (hasDot) {
    const parts = compact.split('.');
    normalized =
      parts.length > 2 || parts.at(-1)?.length === 3 ? parts.join('') : compact;
  }

  return finiteNumber(normalized);
}

export interface ParsedRuleLimit {
  amount: number;
  kind: 'percent' | 'fixed';
  sourceValue: number;
}

export function parseRuleLimit(
  value: string | null | undefined,
  baseAmount: number | null,
): ParsedRuleLimit | null {
  if (!isExplicitRuleValue(value)) return null;
  const text = String(value);
  const percentMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (percentMatch) {
    const percentage = parseLocalizedNumber(percentMatch[1]);
    if (percentage === null || percentage <= 0 || !baseAmount || baseAmount <= 0) {
      return null;
    }
    return {
      amount: (baseAmount * percentage) / 100,
      kind: 'percent',
      sourceValue: percentage,
    };
  }

  const fixedMatch = text.match(
    /(?:US\$|USD|R\$|BRL|EUR|€|\$)\s*([\d.,]+)/i,
  );
  if (!fixedMatch) return null;
  const amount = parseLocalizedNumber(fixedMatch[1]);
  if (amount === null || amount <= 0) return null;
  return { amount, kind: 'fixed', sourceValue: amount };
}
