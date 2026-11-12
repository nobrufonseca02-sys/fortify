// Textos reais do catálogo de mesas (src/data/prop-firms), não inventados.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  consistencyForStage,
  defaultGuardRuleKeys,
  floatingLossPercent,
  forcedCloseForStage,
  guardRuleOptions,
  inactivityDays,
  inferStage,
  lotLimitFor,
  openRiskPercent,
} from './guardRules';
import { binding } from '../testFixtures';

test('consistência só no saque: nada na avaliação, 40% no funded', () => {
  const text = 'Sem consistência na avaliação; payout on-demand exige Best Day de 40% e 2% de lucro bruto';
  assert.equal(consistencyForStage(text, 'evaluation'), 'none');
  assert.equal((consistencyForStage(text, 'funded') as any).percent, 40);
});

test('consistência descrita pela etapa funded sem a palavra "melhor dia"', () => {
  const text = 'Sem consistência na avaliação; 25% no estágio funded';
  assert.equal((consistencyForStage(text, 'funded') as any).percent, 25);
  assert.equal(consistencyForStage(text, 'evaluation'), 'none');
});

test('consistência por add-on fica marcada como condicional', () => {
  const spec = consistencyForStage('Sem consistência padrão; add-on on-demand aplica 40% na conta funded', 'funded') as any;
  assert.equal(spec.percent, 40);
  assert.equal(spec.addOn, true);
});

test('consistência que vale nas duas fases e regra que "não reprova"', () => {
  assert.equal((consistencyForStage('Melhor dia no máximo 30% do lucro, no challenge e no funded', 'evaluation') as any).percent, 30);
  const soft = consistencyForStage('Best Day Rule de 50%; exceder não reprova, mas exige continuar operando', 'evaluation') as any;
  assert.equal(soft.percent, 50);
  assert.equal(soft.soft, true);
});

test('mecanismos que não são teto de melhor dia não viram número', () => {
  assert.equal(consistencyForStage('Trade Value Score: maior trade lucrativo até 33% do lucro líquido do ciclo', 'funded'), null);
  assert.equal(consistencyForStage('Sem consistência; Daily Profit Cap de 2%', 'funded'), 'none');
  assert.equal(consistencyForStage('Best Day de 35% no Performance; 5 dias lucrativos entre payouts após o primeiro', 'evaluation'), null);
});

test('inatividade: lê "inatividade em N dias" e "a cada N dias"', () => {
  assert.equal(inactivityDays('3 dias por fase; sem prazo máximo; inatividade em 30 dias'), 30);
  assert.equal(inactivityDays('Sem mínimo ou máximo; ao menos um trade aberto e fechado a cada 60 dias'), 60);
  assert.equal(inactivityDays('7 dias; cada dia deve representar ao menos 0,1% do saldo'), null);
});

test('fechamento obrigatório: horário GMT+3 vira UTC, "server time" fica no servidor', () => {
  const friday = forcedCloseForStage('Obrigatório fechar sexta-feira até 23:45 GMT+3', 'Obrigatório fechar sexta-feira até 23:45 GMT+3', 'evaluation')!;
  assert.equal(friday.mode, 'weekly');
  assert.equal(friday.utcMinutes, 20 * 60 + 45);
  const daily = forcedCloseForStage(
    'Posições fechadas diariamente às 23:00 server time; reabertura às 00:15',
    'Posições fechadas diariamente às 23:00 server time; reabertura às 00:15',
    'funded',
  )!;
  assert.equal(daily.mode, 'daily');
  assert.equal(daily.serverMinutes, 23 * 60);
  assert.equal(daily.soft, true);
});

test('fechamento de sexta que só vale no funded', () => {
  const text = 'Avaliação permite; Qualified Analyst Pro não permite e aplica soft breach';
  assert.equal(forcedCloseForStage(text, text, 'evaluation'), null);
  assert.equal(forcedCloseForStage(text, text, 'funded')!.mode, 'weekly');
  assert.equal(forcedCloseForStage('Holding overnight e fim de semana permitido', 'Holding overnight e fim de semana permitido', 'funded'), null);
});

test('lote máximo: escada da Alpha por tamanho e limite por clique', () => {
  assert.deepEqual(lotLimitFor('2,5 / 5 / 10 / 20 / 40 / 80 / 120 lotes', '$100K'), {
    mode: 'total',
    lots: 40,
    clause: '2,5 / 5 / 10 / 20 / 40 / 80 / 120 lotes',
  });
  assert.equal(lotLimitFor('1,25 / 2,5 / 5 / 10 / 20 / 40 / 60 lotes', '$5K')!.lots, 1.25);
  assert.equal(lotLimitFor('20 lotes por clique; cripto: 1 lote por clique.', '$100K')!.mode, 'per_order');
  assert.equal(lotLimitFor('Não informado publicamente', '$100K'), null);
  // Tamanho fora da escada publicada: não chuta.
  assert.equal(lotLimitFor('2,5 / 5 / 10 / 20 / 40 / 80 / 120 lotes', '$150K'), null);
});

test('perda flutuante e risco aberto respeitam a fase', () => {
  assert.equal(floatingLossPercent(['Perda flutuante máxima de 1,5%.'], 'funded'), 1.5);
  assert.equal(openRiskPercent(['Risco aberto funded de 3%.'], 'evaluation'), null);
  assert.equal(openRiskPercent(['Risco aberto funded de 3%.'], 'funded'), 3);
});

test('fase inicial deduzida pelo programa', () => {
  const base = binding().rule_snapshot;
  assert.equal(inferStage({ program: { ...base.program, name: 'Instant Funding', type: 'Instant' } }), 'funded');
  assert.equal(inferStage({ program: { ...base.program, name: '2-Step', type: '2-Step' } }), 'evaluation');
});

test('opções em grupos; padrão liga o que zera a conta e o que trava o saque', () => {
  const row = binding();
  row.rule_snapshot.criticalRules.minTradingDays = '4 dias por fase; inatividade em 30 dias';
  row.rule_snapshot.criticalRules.newsRule = 'Proibido abrir ou fechar em ±5 minutos de notícia de alto impacto';
  const options = guardRuleOptions(row.rule_snapshot, 'evaluation');
  const byKey = Object.fromEntries(options.map((option) => [option.key, option]));
  assert.equal(byKey.daily_loss.group, 'account');
  assert.equal(byKey.inactivity.group, 'account');
  assert.equal(byKey.profit_target.group, 'payout');
  // Notícias não fazem parte do Fortify Guard.
  assert.equal(byKey.news, undefined);
  const defaults = defaultGuardRuleKeys(options);
  assert.ok(defaults.includes('inactivity'));
  assert.ok(defaults.includes('daily_loss'));
  // Conta funded não tem meta de lucro.
  assert.ok(!guardRuleOptions(row.rule_snapshot, 'funded').some((option) => option.key === 'profit_target'));
});
