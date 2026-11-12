// Linhas curtas das regras oficiais de UMA conta (tamanho e fase escolhidos),
// para o pop-up do "Usar este modelo". Valores em dinheiro calculados sobre o
// tamanho da conta; consistência a partir da regra estruturada quando existe.

import type { PropFirmRuleProgram, RuleAccountSize } from '@/data/propFirmRules';
import type { ConsistencyClause } from '../../services/metaapi-gateway/src/ruleEngine/bindingTypes';
import { isExplicitRuleValue, parseInitialBalance, parseRuleLimit } from '../../services/metaapi-gateway/src/ruleEngine/ruleEngineTypes';
import type { AccountStage } from '@/lib/ruleEngine/guardRules';

export interface OfficialRuleRow {
  label: string;
  value: string;
  /** Trecho literal da fonte oficial, quando o catálogo guarda. */
  quote?: string;
  estimated?: boolean;
}

function money(amount: number, currency: string) {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: currency === 'USD' || !currency ? 'USD' : currency, maximumFractionDigits: 0 });
}

function withAmount(text: string, base: number | null, currency: string) {
  const limit = parseRuleLimit(text, base);
  return limit && limit.kind === 'percent' ? `${text} (${money(limit.amount, currency)})` : text;
}

const pct = (value: number | null) => `${(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

const EFFECT: Record<ConsistencyClause['effect'], string> = {
  blocks_pass: 'trava a aprovação',
  blocks_payout: 'trava o saque',
  raises_target: 'se passar, a meta sobe',
  soft: 'não reprova, obriga a seguir operando',
  caps_counted_profit: 'o excesso não conta',
  locks_trading: 'passou, a conta trava até amanhã',
};

export function describeConsistencyClause(clause: ConsistencyClause, base: number | null, currency: string) {
  const amount = clause.amount ?? (clause.percent && base ? (clause.percent / 100) * base : null);
  const main = {
    best_day_vs_total_profit: `Maior dia até ${pct(clause.percent)} do lucro total`,
    best_day_vs_profit_target: `Maior dia até ${pct(clause.percent)} da meta`,
    largest_trade_vs_net_profit: `Maior trade até ${pct(clause.percent)} do lucro líquido`,
    daily_profit_cap: `${clause.effect === 'locks_trading' ? 'Lucro do dia até' : 'Lucro do dia conta até'} ${clause.amount ? money(clause.amount, currency) : `${pct(clause.percent)}${amount ? ` (${money(amount, currency)})` : ''}`}`,
    profitable_days: `${clause.days ?? 0} dias lucrativos${clause.minDayProfitPercent ? ` de ${pct(clause.minDayProfitPercent)} ou mais` : ''}`,
  }[clause.kind];
  return [main, EFFECT[clause.effect], clause.condition].filter(Boolean).join(' · ');
}

const DRAWDOWN_LABEL: Record<string, string> = {
  Static: 'fixo',
  Daily: 'diário',
  EOD: 'trailing no fim do dia',
  Intraday: 'trailing intradiário',
  Trailing: 'trailing',
};

export function officialRuleRows(program: PropFirmRuleProgram, account: RuleAccountSize, stage: AccountStage): OfficialRuleRow[] {
  const base = parseInitialBalance(account.initialBalance);
  const currency = account.currency && account.currency.length === 3 ? account.currency : 'USD';
  const rows: OfficialRuleRow[] = [];
  const add = (label: string, value: string | null | undefined, extra: Partial<OfficialRuleRow> = {}) => {
    if (value && isExplicitRuleValue(value)) rows.push({ label, value, ...extra });
  };

  if (stage === 'evaluation') {
    const targets = account.phases
      .filter((phase) => isExplicitRuleValue(phase.profitTarget))
      .map((phase) => `${phase.label}: ${withAmount(phase.profitTarget, base, currency)}`)
      .join(' · ');
    add('Meta de lucro', targets);
  }
  add('Perda diária', withAmount(account.dailyLoss, base, currency));
  const drawdownType = DRAWDOWN_LABEL[String(account.drawdownType)] ?? '';
  add('Perda máxima', `${withAmount(account.maxLoss, base, currency)}${drawdownType ? ` · ${drawdownType}` : ''}`);
  add('Dias mínimos', account.minTradingDays);

  const clauses = (account.consistency ?? program.consistency)?.filter(
    (clause) => clause.appliesTo === 'both' || clause.appliesTo === stage,
  );
  if (clauses) {
    if (clauses.length === 0) rows.push({ label: 'Consistência', value: 'Não tem nesta fase' });
    for (const clause of clauses) {
      rows.push({
        label: 'Consistência',
        value: describeConsistencyClause(clause, base, currency),
        quote: clause.officialText,
        estimated: clause.estimated,
      });
    }
  } else {
    add('Consistência', account.consistencyRule);
  }
  add('Fim de semana', account.weekendRule);
  add('Lote máximo', account.maxLots);
  return rows;
}

/** Documento oficial para abrir embutido: o PDF da mesa quando existe, senão a página oficial. */
export function officialDocumentUrl(program: PropFirmRuleProgram): string | null {
  return program.officialDocumentUrl ?? program.officialSourceUrl ?? null;
}
