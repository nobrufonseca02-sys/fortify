// Gera (ou confere) o manifesto de snapshots de regras que o gateway aceita.
//
//   npx vitest run src/test/ruleSnapshotManifest.test.ts            -> confere
//   UPDATE_RULE_MANIFEST=1 npx vitest run src/test/ruleSnapshotManifest.test.ts -> regrava
//
// Roda como teste do Vitest para reaproveitar os aliases do projeto e o dataset
// em TypeScript. O manifesto é append-only: hashes antigos continuam válidos,
// para que contas vinculadas a uma versão anterior sigam sendo avaliadas.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAccountRuleBindingInsert, getOperationalRulePrograms, prepareRuleBinding } from '@/lib/ruleBinding';
import { verifyBindingSnapshot } from '../../services/metaapi-gateway/src/ruleEngine/snapshotIntegrity';

const MANIFEST_PATH = path.resolve(
  __dirname,
  '../../services/metaapi-gateway/src/ruleEngine/ruleSnapshotManifest.json',
);

type Manifest = { schemaVersion: 1; profiles: Record<string, string[]> };

async function currentProfiles() {
  const profiles: Record<string, string[]> = {};
  for (const program of getOperationalRulePrograms()) {
    for (const accountSize of program.accountLevelRules) {
      for (const platform of accountSize.platforms) {
        for (const version of accountSize.versions) {
          const draft = {
            propFirmSlug: program.firmSlug,
            programSlug: program.programSlug,
            accountSizeId: accountSize.id,
            platform,
            ruleVersionId: version.id,
            manualRuleAcknowledgement: true,
          };
          const prepared = await prepareRuleBinding(draft);
          profiles[prepared.ruleProfileId] = [prepared.snapshotHash];
        }
      }
    }
  }
  return profiles;
}

function readManifest(): Manifest {
  if (!existsSync(MANIFEST_PATH)) return { schemaVersion: 1, profiles: {} };
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

describe('rule snapshot manifest', () => {
  it('um vínculo real montado no frontend passa na verificação do gateway', async () => {
    const program = getOperationalRulePrograms('MT5').find(
      (item) => item.firmSlug === 'ftmo' && item.programType === '2-Step',
    )!;
    const accountSize = program.accountLevelRules.find((size) => size.label === '$100K')!;
    const draft = {
      propFirmSlug: program.firmSlug,
      programSlug: program.programSlug,
      accountSizeId: accountSize.id,
      platform: 'MT5',
      ruleVersionId: accountSize.versions[0].id,
      manualRuleAcknowledgement: true,
    };
    const prepared = await prepareRuleBinding(draft);
    const row = buildAccountRuleBindingInsert({ userId: 'u1', tradingAccountId: 'a1', draft }, prepared);

    expect(verifyBindingSnapshot(row as any)).toEqual({ ok: true });
    expect(
      verifyBindingSnapshot({ ...row, rule_snapshot: { ...row.rule_snapshot, platform: 'MT4' } } as any),
    ).toEqual({ ok: false, reason: 'field_mismatch' });
  });

  it('contém o hash de cada snapshot que o dataset atual gera', async () => {
    const current = await currentProfiles();
    const manifest = readManifest();

    if (process.env.UPDATE_RULE_MANIFEST === '1') {
      const merged: Record<string, string[]> = { ...manifest.profiles };
      for (const [profileId, hashes] of Object.entries(current)) {
        merged[profileId] = Array.from(new Set([...(merged[profileId] ?? []), ...hashes])).sort();
      }
      const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
      writeFileSync(MANIFEST_PATH, `${JSON.stringify({ schemaVersion: 1, profiles: sorted }, null, 2)}\n`);
      return;
    }

    const missing = Object.entries(current).filter(
      ([profileId, [hash]]) => !manifest.profiles[profileId]?.includes(hash),
    );
    expect(
      missing.map(([profileId]) => profileId),
      'Dataset mudou: rode UPDATE_RULE_MANIFEST=1 npx vitest run src/test/ruleSnapshotManifest.test.ts',
    ).toEqual([]);
  });
});
