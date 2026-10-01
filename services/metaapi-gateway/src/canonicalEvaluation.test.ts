import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CanonicalStoreUnavailableError,
  RULE_ENGINE_VERSION,
  createSupabaseCanonicalEvaluationStore,
  runCanonicalEvaluation,
  type CanonicalEvaluationInsert,
  type CanonicalEvaluationStore,
} from './canonicalEvaluation';
import type { AccountRuleBindingRow } from './ruleEngine/bindingTypes';
import { binding } from './testFixtures';
import type { RuleEngineSnapshotInput } from './ruleEngine/ruleEngineTypes';

function memoryStore(options: {
  bindings: AccountRuleBindingRow[];
  snapshots?: RuleEngineSnapshotInput[];
}) {
  const inserted: CanonicalEvaluationInsert[] = [];
  const store: CanonicalEvaluationStore = {
    // Mesma semântica da consulta real: dono + conta + ativo.
    async loadActiveBinding(tradingAccountId, userId) {
      return (
        options.bindings.find(
          (row) =>
            row.trading_account_id === tradingAccountId &&
            row.user_id === userId &&
            row.binding_status === 'active',
        ) ?? null
      );
    },
    async loadSnapshots() {
      return options.snapshots ?? [];
    },
    async loadClosedTrades() {
      return [];
    },
    async insertEvaluation(row) {
      inserted.push(row);
    },
  };
  return { store, inserted };
}

const NOW = new Date('2026-09-30T12:00:00Z');
// Fixtures de teste não estão no manifesto auditado; a integridade tem teste próprio.
const trusted = { verifySnapshot: () => ({ ok: true as const }) };
const todaySnapshot = (equity: number, dailyPnl: number): RuleEngineSnapshotInput => ({
  date: '2026-09-30',
  balance: 100_000 + dailyPnl,
  equity,
  dailyPnl,
  floatingPnl: equity - (100_000 + dailyPnl),
  maxBalance: 100_000,
});

test('conta vinculada recebe avaliação canônica após a sincronização', async () => {
  const { store, inserted } = memoryStore({
    bindings: [binding()],
    snapshots: [todaySnapshot(98_000, -1_000)],
  });

  const outcome = await runCanonicalEvaluation(store, {
    userId: 'user-a',
    tradingAccountId: 'account-a',
    connectionId: 'connection-a',
    account: { startBalance: 100_000 },
    positions: [{ floatingPnl: -1_000 }],
    now: NOW,
  }, trusted);

  assert.equal(outcome.kind, 'evaluated');
  assert.equal(inserted.length, 1);
  const row = inserted[0];
  assert.equal(row.binding_id, 'binding-v1');
  assert.equal(row.rule_snapshot_hash, 'sha256:v1');
  assert.equal(row.rule_version_id, 'version-1');
  assert.equal(row.engine_version, RULE_ENGINE_VERSION);
  assert.equal(row.user_id, 'user-a');
  assert.equal(row.evaluated_at, NOW.toISOString());
  const daily = row.automatic_rules.find((rule) => rule.key === 'daily_loss');
  // 1.000 fechado + 1.000 flutuante contam contra o limite diário de 5.000.
  assert.equal(daily?.currentValue, 2_000);
  // Reset não confirmado: nunca "safe".
  assert.notEqual(row.overall_status, 'safe');
});

test('conta sem vínculo não grava nada e sinaliza fallback', async () => {
  const { store, inserted } = memoryStore({ bindings: [] });
  const outcome = await runCanonicalEvaluation(store, {
    userId: 'user-a',
    tradingAccountId: 'account-a',
    connectionId: 'connection-a',
    account: {},
    positions: [],
    now: NOW,
  }, trusted);
  assert.deepEqual(outcome, { kind: 'no_binding' });
  assert.equal(inserted.length, 0);
});

test('troca de versão: nova avaliação aponta para o novo snapshot, a antiga fica intacta', async () => {
  const bindings = [binding()];
  const { store, inserted } = memoryStore({ bindings, snapshots: [todaySnapshot(100_000, 0)] });
  const input = {
    userId: 'user-a',
    tradingAccountId: 'account-a',
    connectionId: 'connection-a',
    account: { startBalance: 100_000 },
    positions: [],
    now: NOW,
  };

  await runCanonicalEvaluation(store, input, trusted);
  // O trigger de supersede do banco marca o antigo e ativa o novo.
  bindings[0] = { ...bindings[0], binding_status: 'superseded' };
  bindings.push(
    binding({ id: 'binding-v2', rule_snapshot_hash: 'sha256:v2', rule_version_id: 'version-2' }),
  );
  await runCanonicalEvaluation(store, input, trusted);

  assert.equal(inserted.length, 2);
  assert.equal(inserted[0].binding_id, 'binding-v1');
  assert.equal(inserted[0].rule_snapshot_hash, 'sha256:v1');
  assert.equal(inserted[1].binding_id, 'binding-v2');
  assert.equal(inserted[1].rule_snapshot_hash, 'sha256:v2');
});

test('nunca avalia binding de outro usuário', async () => {
  const { store, inserted } = memoryStore({ bindings: [binding({ user_id: 'user-b' })] });
  const outcome = await runCanonicalEvaluation(store, {
    userId: 'user-a',
    tradingAccountId: 'account-a',
    connectionId: 'connection-a',
    account: {},
    positions: [],
    now: NOW,
  }, trusted);
  assert.equal(outcome.kind, 'no_binding');
  assert.equal(inserted.length, 0);

  // Mesmo que a consulta devolvesse a linha errada, a checagem interna recusa.
  const leaky: CanonicalEvaluationStore = {
    ...store,
    loadActiveBinding: async () => binding({ user_id: 'user-b' }),
  };
  assert.equal(
    (await runCanonicalEvaluation(leaky, {
      userId: 'user-a',
      tradingAccountId: 'account-a',
      connectionId: 'connection-a',
      account: {},
      positions: [],
      now: NOW,
    })).kind,
    'no_binding',
  );
  assert.equal(inserted.length, 0);
});

test('adaptador Supabase filtra binding por dono, conta e status ativo', async () => {
  const calls: Array<[string, unknown[]]> = [];
  const builder: any = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'not']) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.maybeSingle = async () => ({ data: null, error: null });
  const store = createSupabaseCanonicalEvaluationStore({ from: () => builder });

  await store.loadActiveBinding('account-a', 'user-a');

  const eqs = calls.filter(([method]) => method === 'eq').map(([, args]) => args);
  assert.deepEqual(eqs, [
    ['trading_account_id', 'account-a'],
    ['user_id', 'user-a'],
    ['binding_status', 'active'],
  ]);
});

test('erro de gravação propaga sem expor dados além da mensagem', async () => {
  const store = createSupabaseCanonicalEvaluationStore({
    from: () => ({ insert: async () => ({ error: { message: 'violates row-level security' } }) }),
  });
  await assert.rejects(
    store.insertEvaluation({} as CanonicalEvaluationInsert),
    /Falha ao gravar a avaliação de regras/,
  );
});

test('tabela ainda não migrada vira erro específico, para o sync cair no fluxo anterior', async () => {
  const store = createSupabaseCanonicalEvaluationStore({
    from: () => ({
      insert: async () => ({ error: { code: 'PGRST205', message: "Could not find the table 'public.account_rule_evaluations'" } }),
    }),
  });
  await assert.rejects(store.insertEvaluation({} as CanonicalEvaluationInsert), CanonicalStoreUnavailableError);
});
