import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getOperationalRulePrograms } from '@/lib/ruleBinding';
import {
  clearPendingLibraryProgram,
  detectAccountSizeFromBalance,
  findMt5ProgramBySlug,
  readPendingLibraryProgram,
  savePendingLibraryProgram,
} from '@/lib/accountSizeDetection';

function ftmo2Step() {
  return getOperationalRulePrograms('MT5').find(
    (item) => item.firmSlug === 'ftmo' && item.programType === '2-Step',
  )!;
}

describe('findMt5ProgramBySlug', () => {
  it('resolve um programa real pela combinação de slugs', () => {
    const program = ftmo2Step();
    expect(findMt5ProgramBySlug(program.firmSlug!, program.programSlug!)).toBe(program);
  });

  it('retorna null para slugs inexistentes ou vazios', () => {
    expect(findMt5ProgramBySlug('mesa-que-nao-existe', 'programa-x')).toBeNull();
    expect(findMt5ProgramBySlug('', '')).toBeNull();
  });
});

describe('detectAccountSizeFromBalance', () => {
  const program = ftmo2Step();
  const size100k = program.accountLevelRules.find((account) => account.label === '$100K')!;

  it('casa exatamente quando o saldo bate com um tamanho conhecido', () => {
    const result = detectAccountSizeFromBalance(program, 100_000);
    expect(result?.confidence).toBe('exact');
    expect(result?.accountSize.id).toBe(size100k.id);
    expect(result?.platform.toUpperCase()).toContain('MT5');
    expect(result?.ruleVersionId).toBe(size100k.versions.find((v) => !v.effectiveTo)?.id ?? size100k.versions[0].id);
  });

  it('aceita uma pequena diferença (lucro/perda acumulados) como aproximação', () => {
    // Saldo um pouco acima do nominal — ex.: a conta já operou e lucrou um pouco
    // antes do primeiro sync, ou a corretora arredondou o depósito inicial.
    const result = detectAccountSizeFromBalance(program, 101_200);
    expect(result?.confidence).toBe('nearest');
    expect(result?.accountSize.id).toBe(size100k.id);
  });

  it('não adivinha quando o saldo está longe demais de qualquer tamanho conhecido', () => {
    expect(detectAccountSizeFromBalance(program, 1_000)).toBeNull();
    expect(detectAccountSizeFromBalance(program, 50_000_000)).toBeNull();
  });

  it('rejeita saldo inválido sem lançar erro', () => {
    expect(detectAccountSizeFromBalance(program, 0)).toBeNull();
    expect(detectAccountSizeFromBalance(program, -100)).toBeNull();
    expect(detectAccountSizeFromBalance(program, NaN)).toBeNull();
  });
});

describe('pending library program hint (localStorage)', () => {
  const accountId = 'test-account-id';

  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('salva, lê e limpa o hint pendente', () => {
    expect(readPendingLibraryProgram(accountId)).toBeNull();
    savePendingLibraryProgram(accountId, { firmSlug: 'ftmo', programSlug: 'ftmo-2-step' });
    expect(readPendingLibraryProgram(accountId)).toEqual({ firmSlug: 'ftmo', programSlug: 'ftmo-2-step' });
    clearPendingLibraryProgram(accountId);
    expect(readPendingLibraryProgram(accountId)).toBeNull();
  });

  it('ignora lixo salvo manualmente sem lançar erro', () => {
    window.localStorage.setItem(`fortify:pendingLibraryProgram:${accountId}`, '{not json');
    expect(readPendingLibraryProgram(accountId)).toBeNull();
  });
});
