// Avaliação canônica: o mesmo motor usado no frontend, rodando no servidor sobre
// o snapshot ativo de account_rule_bindings e os dados MT5 recém-sincronizados.
// O resultado é gravado em account_rule_evaluations (append-only) e é o que o
// Dashboard, Contas e Performance exibem.

import { evaluateBoundAccountRules } from './ruleEngine/evaluateAccountRules';
import type { AccountRuleBindingRow } from './ruleEngine/bindingTypes';
import { verifyBindingSnapshot, type SnapshotIntegrityResult } from './ruleEngine/snapshotIntegrity';
import type {
  BoundAccountRuleEvaluation,
  RuleEngineAccountInput,
  RuleEnginePositionInput,
  RuleEngineSnapshotInput,
  RuleEngineTradeInput,
} from './ruleEngine/ruleEngineTypes';

export const RULE_ENGINE_VERSION = 'fortify.rule-engine.v1';

export interface CanonicalEvaluationInsert {
  user_id: string;
  trading_account_id: string;
  mt5_connection_id: string | null;
  binding_id: string;
  rule_snapshot_hash: string;
  rule_version_id: string;
  engine_version: string;
  overall_status: BoundAccountRuleEvaluation['overallStatus'];
  overall_message: string;
  automatic_rules: BoundAccountRuleEvaluation['automaticRules'];
  manual_rules: BoundAccountRuleEvaluation['manualRules'];
  unsupported_rules: BoundAccountRuleEvaluation['unsupportedRules'];
  not_calculated_rules: BoundAccountRuleEvaluation['notCalculatedRules'];
  alerts: string[];
  input_summary: Record<string, unknown>;
  evaluated_at: string;
}

export interface CanonicalEvaluationStore {
  loadActiveBinding(tradingAccountId: string, userId: string): Promise<AccountRuleBindingRow | null>;
  /** Mais recente primeiro — o motor lê snapshots[0] como o estado atual. */
  loadSnapshots(connectionId: string): Promise<RuleEngineSnapshotInput[]>;
  loadClosedTrades(connectionId: string): Promise<RuleEngineTradeInput[]>;
  insertEvaluation(row: CanonicalEvaluationInsert): Promise<void>;
}

export interface RunCanonicalEvaluationInput {
  userId: string;
  tradingAccountId: string;
  connectionId: string;
  account: RuleEngineAccountInput;
  /** Posições abertas lidas nesta sincronização; [] = nenhuma posição aberta. */
  positions: RuleEnginePositionInput[];
  now?: Date;
}

export type CanonicalEvaluationOutcome =
  | { kind: 'no_binding' }
  | {
      kind: 'evaluated';
      bindingId: string;
      overallStatus: BoundAccountRuleEvaluation['overallStatus'];
      automaticRules: number;
    };

export function buildCanonicalEvaluationInsert(input: {
  binding: AccountRuleBindingRow;
  userId: string;
  tradingAccountId: string;
  connectionId: string | null;
  evaluation: BoundAccountRuleEvaluation;
  inputSummary: Record<string, unknown>;
  evaluatedAt: Date;
}): CanonicalEvaluationInsert {
  const { binding, evaluation } = input;
  return {
    user_id: input.userId,
    trading_account_id: input.tradingAccountId,
    mt5_connection_id: input.connectionId,
    binding_id: binding.id,
    // Sempre os do binding, nunca recalculados aqui: a trigger do banco confere.
    rule_snapshot_hash: binding.rule_snapshot_hash,
    rule_version_id: binding.rule_version_id,
    engine_version: RULE_ENGINE_VERSION,
    overall_status: evaluation.overallStatus,
    overall_message: evaluation.overallMessage,
    automatic_rules: evaluation.automaticRules,
    manual_rules: evaluation.manualRules,
    unsupported_rules: evaluation.unsupportedRules,
    not_calculated_rules: evaluation.notCalculatedRules,
    alerts: evaluation.alerts,
    input_summary: input.inputSummary,
    evaluated_at: input.evaluatedAt.toISOString(),
  };
}

/**
 * Roda o motor para a conta. Sem binding ativo devolve `no_binding` e não grava
 * nada — quem chama decide se usa o fallback legado.
 */
export async function runCanonicalEvaluation(
  store: CanonicalEvaluationStore,
  input: RunCanonicalEvaluationInput,
  options: { verifySnapshot?: (binding: AccountRuleBindingRow) => SnapshotIntegrityResult } = {},
): Promise<CanonicalEvaluationOutcome> {
  const binding = await store.loadActiveBinding(input.tradingAccountId, input.userId);
  if (!binding || binding.binding_status !== 'active') return { kind: 'no_binding' };
  // Defesa extra além do filtro da consulta: nunca avaliar binding de outro usuário.
  if (binding.user_id !== input.userId || binding.trading_account_id !== input.tradingAccountId) {
    return { kind: 'no_binding' };
  }

  const now = input.now ?? new Date();
  const [snapshots, trades] = await Promise.all([
    store.loadSnapshots(input.connectionId),
    store.loadClosedTrades(input.connectionId),
  ]);

  // Snapshot que não bate com o catálogo auditado não é avaliado: a conta fica
  // "não monitorável" em vez de ser julgada por regras que ninguém revisou.
  const integrity = (options.verifySnapshot ?? verifyBindingSnapshot)(binding);
  const evaluation: BoundAccountRuleEvaluation = integrity.ok
    ? evaluateBoundAccountRules({
        binding,
        account: input.account,
        snapshots,
        trades,
        positions: input.positions,
        now,
      })
    : {
        overallStatus: 'not_monitorable',
        overallMessage:
          'O snapshot de regras desta conta não corresponde ao catálogo auditado. Refaça o vínculo pela Biblioteca de Mesas.',
        missingBinding: false,
        automaticRules: [],
        manualRules: [],
        unsupportedRules: [],
        notCalculatedRules: [],
        alerts: [`Integridade do snapshot recusada (${integrity.reason}); nenhuma regra foi calculada.`],
        source: {
          bindingId: binding.id,
          snapshotHash: binding.rule_snapshot_hash,
          ruleVersionId: binding.rule_version_id,
          officialSourceUrls: [],
        },
      };

  await store.insertEvaluation(
    buildCanonicalEvaluationInsert({
      binding,
      userId: input.userId,
      tradingAccountId: input.tradingAccountId,
      connectionId: input.connectionId,
      evaluation,
      evaluatedAt: now,
      inputSummary: {
        snapshotIntegrity: integrity.ok ? 'verified' : integrity.reason,
        latestSnapshotDate: snapshots[0]?.date ?? null,
        snapshotCount: snapshots.length,
        closedTradeCount: trades.length,
        openPositionCount: input.positions.length,
      },
    }),
  );

  return {
    kind: 'evaluated',
    bindingId: binding.id,
    overallStatus: evaluation.overallStatus,
    automaticRules: evaluation.automaticRules.length,
  };
}

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

type QueryResult = { data: any; error: { message: string; code?: string } | null };

/** Tabela account_rule_evaluations ainda não criada (migração não aplicada). */
export class CanonicalStoreUnavailableError extends Error {
  constructor() {
    super('account_rule_evaluations indisponível');
    this.name = 'CanonicalStoreUnavailableError';
  }
}

function isMissingRelation(error: { code?: string; message: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message);
}

/** Adaptador mínimo sobre o cliente Supabase (service role) do gateway. */
export function createSupabaseCanonicalEvaluationStore(supabase: {
  from(table: string): any;
}): CanonicalEvaluationStore {
  const fail = (what: string, error: { message: string }) => {
    throw new Error(`${what}: ${error.message}`);
  };

  return {
    async loadActiveBinding(tradingAccountId, userId) {
      const { data, error }: QueryResult = await supabase
        .from('account_rule_bindings')
        .select('*')
        .eq('trading_account_id', tradingAccountId)
        .eq('user_id', userId)
        .eq('binding_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) fail('Falha ao ler o vínculo de regras ativo', error);
      return (data as AccountRuleBindingRow | null) ?? null;
    },

    async loadSnapshots(connectionId) {
      const { data, error }: QueryResult = await supabase
        .from('mt5_account_snapshots')
        .select('date, balance, equity, daily_pnl, floating_pnl, max_balance, created_at')
        .eq('connection_id', connectionId)
        .order('date', { ascending: false })
        .limit(400);
      if (error) fail('Falha ao ler snapshots MT5', error);
      return (data ?? []).map((row: any) => ({
        date: row.date ?? null,
        createdAt: row.created_at ?? null,
        balance: toNumberOrNull(row.balance),
        equity: toNumberOrNull(row.equity),
        dailyPnl: toNumberOrNull(row.daily_pnl),
        floatingPnl: toNumberOrNull(row.floating_pnl),
        maxBalance: toNumberOrNull(row.max_balance),
      }));
    },

    async loadClosedTrades(connectionId) {
      const { data, error }: QueryResult = await supabase
        .from('mt5_trades')
        .select('profit, commission, swap, close_time')
        .eq('connection_id', connectionId)
        .not('close_time', 'is', null)
        .order('close_time', { ascending: false })
        .limit(2000);
      if (error) fail('Falha ao ler trades MT5', error);
      return (data ?? []).map((row: any) => ({
        profit: toNumberOrNull(row.profit),
        commission: toNumberOrNull(row.commission),
        swap: toNumberOrNull(row.swap),
        closeTime: row.close_time ?? null,
      }));
    },

    async insertEvaluation(row) {
      const { error }: QueryResult = await supabase.from('account_rule_evaluations').insert(row);
      if (error && isMissingRelation(error)) throw new CanonicalStoreUnavailableError();
      if (error) fail('Falha ao gravar a avaliação de regras', error);
    },
  };
}
