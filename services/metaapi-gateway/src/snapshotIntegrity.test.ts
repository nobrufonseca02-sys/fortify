import assert from 'node:assert/strict';
import test from 'node:test';
import { runCanonicalEvaluation, type CanonicalEvaluationInsert } from './canonicalEvaluation';
import { recomputeSnapshotHash, verifyBindingSnapshot } from './ruleEngine/snapshotIntegrity';
import manifest from './ruleEngine/ruleSnapshotManifest.json';
import { binding } from './testFixtures';

function signed(overrides: Parameters<typeof binding>[0] = {}) {
  const row = binding(overrides);
  return { ...row, rule_snapshot_hash: recomputeSnapshotHash(row.rule_snapshot, 'sha256:') };
}

test('snapshot íntegro e presente no manifesto é aceito', () => {
  const row = signed();
  const allowed = { profiles: { [row.rule_profile_id]: [row.rule_snapshot_hash] } };
  assert.deepEqual(verifyBindingSnapshot(row, allowed), { ok: true });
});

test('conteúdo alterado depois do hash é recusado', () => {
  const row = signed();
  const allowed = { profiles: { [row.rule_profile_id]: [row.rule_snapshot_hash] } };
  const tampered = {
    ...row,
    rule_snapshot: { ...row.rule_snapshot, criticalRules: { ...row.rule_snapshot.criticalRules, maxLoss: '100%' } },
  };
  assert.deepEqual(verifyBindingSnapshot(tampered, allowed), { ok: false, reason: 'hash_mismatch' });
});

test('snapshot forjado com hash coerente, mas fora do catálogo, é recusado', () => {
  const original = signed();
  const allowed = { profiles: { [original.rule_profile_id]: [original.rule_snapshot_hash] } };
  const forgedSnapshot = {
    ...original.rule_snapshot,
    criticalRules: { ...original.rule_snapshot.criticalRules, dailyLoss: '50%' },
  };
  const forged = {
    ...original,
    rule_snapshot: forgedSnapshot,
    rule_snapshot_hash: recomputeSnapshotHash(forgedSnapshot, 'sha256:'),
  };
  assert.deepEqual(verifyBindingSnapshot(forged, allowed), { ok: false, reason: 'unknown_profile' });
});

test('colunas do binding precisam bater com o snapshot', () => {
  const row = signed({ rule_version_id: 'outra-versao' });
  assert.deepEqual(verifyBindingSnapshot(row, { profiles: {} }), { ok: false, reason: 'field_mismatch' });
});

test('manifesto real carregado e não vazio', () => {
  assert.ok(Object.keys((manifest as { profiles: Record<string, string[]> }).profiles).length > 100);
});

test('avaliação com snapshot fora do catálogo grava não monitorável, sem regras', async () => {
  const inserted: CanonicalEvaluationInsert[] = [];
  const row = signed();
  await runCanonicalEvaluation(
    {
      loadActiveBinding: async () => row,
      loadSnapshots: async () => [{ date: '2026-09-30', balance: 100_000, equity: 100_000, dailyPnl: 0 }],
      loadClosedTrades: async () => [],
      insertEvaluation: async (evaluation) => {
        inserted.push(evaluation);
      },
    },
    {
      userId: 'user-a',
      tradingAccountId: 'account-a',
      connectionId: 'connection-a',
      account: { startBalance: 100_000 },
      positions: [],
      now: new Date('2026-09-30T12:00:00Z'),
    },
  );
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].overall_status, 'not_monitorable');
  assert.deepEqual(inserted[0].automatic_rules, []);
  assert.equal(inserted[0].input_summary.snapshotIntegrity, 'unknown_profile');
});
