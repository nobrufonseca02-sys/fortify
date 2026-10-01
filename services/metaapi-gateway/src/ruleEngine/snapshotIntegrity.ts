// O snapshot em account_rule_bindings é montado e hasheado no navegador. Antes
// de avaliar, o gateway confere que ele não foi forjado: o hash precisa bater
// com o conteúdo (recalculado aqui) e o par perfil→hash precisa constar no
// manifesto gerado a partir do dataset auditado (src/test/ruleSnapshotManifest.test.ts).

import { createHash } from 'node:crypto';
import type { AccountRuleBindingRow } from './bindingTypes';
import { canonicalizeSnapshot, fnv1a64Signature } from './snapshotCanonical';
import manifest from './ruleSnapshotManifest.json';

export type SnapshotIntegrityResult =
  | { ok: true }
  | { ok: false; reason: 'hash_mismatch' | 'unknown_profile' | 'field_mismatch' };

type Manifest = { profiles: Record<string, string[]> };

export function recomputeSnapshotHash(snapshot: unknown, algorithmHint: string) {
  const canonical = canonicalizeSnapshot(snapshot);
  if (algorithmHint.startsWith('fnv1a64:')) return fnv1a64Signature(canonical);
  return `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`;
}

export function verifyBindingSnapshot(
  binding: Pick<
    AccountRuleBindingRow,
    'rule_snapshot' | 'rule_snapshot_hash' | 'rule_profile_id' | 'rule_version_id' | 'account_size_id' | 'platform'
  >,
  allowed: Manifest = manifest as Manifest,
): SnapshotIntegrityResult {
  const snapshot = binding.rule_snapshot;
  if (
    !snapshot ||
    snapshot.version?.id !== binding.rule_version_id ||
    snapshot.accountSize?.id !== binding.account_size_id ||
    snapshot.platform !== binding.platform
  ) {
    return { ok: false, reason: 'field_mismatch' };
  }

  const hash = String(binding.rule_snapshot_hash ?? '');
  if (recomputeSnapshotHash(snapshot, hash) !== hash) {
    return { ok: false, reason: 'hash_mismatch' };
  }

  // O fallback fnv1a64 existe só para navegadores sem WebCrypto; o manifesto
  // guarda sha256, então nesse caso vale a conferência do conteúdo.
  const reference = hash.startsWith('fnv1a64:') ? recomputeSnapshotHash(snapshot, 'sha256:') : hash;
  if (!allowed.profiles[binding.rule_profile_id]?.includes(reference)) {
    return { ok: false, reason: 'unknown_profile' };
  }
  return { ok: true };
}
