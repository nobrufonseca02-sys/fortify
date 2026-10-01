import { engineRuleKeyForLabel } from '@/lib/ruleEngine/evaluateAccountRules';

// O que o Fortify consegue monitorar de fato para uma conta do dataset. O
// dataset diz o que *seria* verificável via MT5; este módulo cruza isso com o
// que o motor (services/metaapi-gateway/src/ruleEngine) realmente calcula.

export type MonitoringLevel = 'automatic' | 'partial' | 'manual' | 'unavailable';

export const MONITORING_LEVEL_LABEL: Record<MonitoringLevel, string> = {
  automatic: 'Monitorado automaticamente',
  partial: 'Monitoramento parcial',
  manual: 'Revisão manual necessária',
  unavailable: 'Ainda não monitorável',
};

export interface MonitoringItem {
  label: string;
  level: MonitoringLevel;
  reason: string;
}

interface ProgramLike {
  market?: string | null;
  platforms?: string[] | null;
}

interface AccountLike {
  platforms?: string[] | null;
  drawdownType?: string | null;
  monitorability: {
    automatic_mt5: string[];
    manual_check: string[];
    not_supported_yet: string[];
  };
}

const MT5_RE = /\bmt5\b/i;

/** Mesma regra do motor: MT5 e mercado que não seja futuros. */
export function supportsMt5Monitoring(program: ProgramLike, account?: Pick<AccountLike, 'platforms'> | null) {
  if (String(program.market ?? '').toLowerCase().includes('futures')) return false;
  const platforms = [...(account?.platforms ?? []), ...(program.platforms ?? [])];
  return platforms.some((platform) => MT5_RE.test(platform) && !/black\s*arrow/i.test(platform));
}

function isStaticDrawdown(value: string | null | undefined) {
  const normalized = String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return normalized.includes('static') || normalized.includes('estatico');
}

export function classifyAccountMonitoring(program: ProgramLike, account: AccountLike): MonitoringItem[] {
  const mt5 = supportsMt5Monitoring(program, account);
  const items: MonitoringItem[] = [];

  for (const label of account.monitorability.automatic_mt5) {
    if (!mt5) {
      items.push({ label, level: 'unavailable', reason: 'A conta não opera em MT5; o Fortify não recebe os dados.' });
      continue;
    }
    const key = engineRuleKeyForLabel(label);
    if (key === 'daily_loss') {
      items.push({
        label,
        level: 'partial',
        reason: 'Calculado a cada sync; o horário oficial de reset diário não está confirmado.',
      });
    } else if (key === 'max_drawdown') {
      items.push(
        isStaticDrawdown(account.drawdownType)
          ? { label, level: 'automatic', reason: 'Calculado a cada sync sobre o saldo inicial.' }
          : { label, level: 'partial', reason: 'Pico medido apenas nos momentos de sincronização.' },
      );
    } else if (key === 'profit_target') {
      items.push({ label, level: 'automatic', reason: 'Calculado a cada sync.' });
    } else {
      items.push({
        label,
        level: 'unavailable',
        reason: 'Verificável por MT5, mas o cálculo ainda não foi implementado no Fortify.',
      });
    }
  }
  for (const label of account.monitorability.manual_check) {
    items.push({ label, level: 'manual', reason: 'Confira diretamente com a mesa.' });
  }
  for (const label of account.monitorability.not_supported_yet) {
    items.push({ label, level: 'unavailable', reason: 'Ainda não suportado.' });
  }
  return items;
}
