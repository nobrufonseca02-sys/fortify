import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accountLimitMessage,
  ambiguousAccountMessage,
  countAccountSlots,
  firmMatchesTerminal,
  pickPendingAccount,
} from './eaLinking';

const ftmo100 = { id: 'ftmo-100', prop_firm: 'FTMO', start_balance: 100_000 };
const the5ers50 = { id: '5ers-50', prop_firm: 'The5ers', start_balance: 50_000 };
const fundedNext100 = { id: 'fn-100', prop_firm: 'FundedNext', start_balance: 100_000 };
const demo = { server: 'MetaQuotes-Demo', broker: 'MetaQuotes Ltd.' };

test('sem conta aguardando, nada a ligar', () => {
  assert.deepEqual(pickPendingAccount([], { balance: 100_000, ...demo }), { kind: 'none' });
});

test('uma só aguardando: é ela, como sempre foi', () => {
  assert.deepEqual(pickPendingAccount([the5ers50], { balance: 100_000, ...demo }), { kind: 'pick', id: '5ers-50' });
});

test('várias aguardando: a mesa do servidor do MT5 decide', () => {
  const result = pickPendingAccount([ftmo100, the5ers50], { balance: 100_000, server: 'The5ers-Server', broker: 'Five Percent Online' });
  assert.deepEqual(result, { kind: 'pick', id: '5ers-50' });
});

test('mesa não aparece no MT5: o tamanho mais próximo do saldo decide', () => {
  // Conta The5ers criada antes, mas o terminal tem US$ 100 mil: é a FTMO 100K.
  const result = pickPendingAccount([the5ers50, ftmo100], { balance: 100_000, ...demo });
  assert.deepEqual(result, { kind: 'pick', id: 'ftmo-100' });
});

test('saldo já mexido (lucro ou perda) ainda acha o tamanho, até 10%', () => {
  assert.deepEqual(pickPendingAccount([the5ers50, ftmo100], { balance: 103_250, ...demo }), { kind: 'pick', id: 'ftmo-100' });
  assert.deepEqual(pickPendingAccount([the5ers50, ftmo100], { balance: 75_000, ...demo }), { kind: 'ambiguous', count: 2 });
});

test('dois modelos do mesmo tamanho e mesa não identificada: não chuta', () => {
  assert.deepEqual(pickPendingAccount([ftmo100, fundedNext100], { balance: 100_000, ...demo }), { kind: 'ambiguous', count: 2 });
});

test('dois do mesmo tamanho, mas o servidor diz a mesa: liga certo', () => {
  const result = pickPendingAccount([ftmo100, fundedNext100], { balance: 100_000, server: 'FTMO-Demo2', broker: 'FTMO Global Markets' });
  assert.deepEqual(result, { kind: 'pick', id: 'ftmo-100' });
});

test('nome da mesa no MT5 ignora acento, espaço e maiúscula', () => {
  assert.equal(firmMatchesTerminal('Funded Next', { balance: 1, server: 'FundedNext-Server 2' }), true);
  assert.equal(firmMatchesTerminal('FTMO', { balance: 1, ...demo }), false);
  assert.equal(firmMatchesTerminal('E8', { balance: 1, server: 'E8Markets-Live' }), false); // curto demais para confiar
});

test('vagas do plano: ligadas e conexões ativas contam, arquivadas não', () => {
  const accounts = [
    { id: 'a', status: 'active', ea_status: 'linked' },
    { id: 'b', status: 'active', ea_status: 'pending' },
    { id: 'c', status: 'active', ea_status: null }, // MetaApi antiga com conexão ativa
    { id: 'd', status: 'archived', ea_status: 'linked' },
    { id: 'e', status: 'active', ea_status: null }, // sem conexão: não ocupa
  ];
  assert.equal(countAccountSlots(accounts, ['c', 'd'], { includePending: false }), 2);
  assert.equal(countAccountSlots(accounts, ['c', 'd'], { includePending: true }), 3);
  assert.equal(countAccountSlots(accounts, ['c'], { includePending: false, excludeId: 'a' }), 1);
});

test('mensagens cabem no painel do EA (4 linhas de ~52 caracteres)', () => {
  assert.ok(accountLimitMessage(1).length <= 200);
  assert.ok(accountLimitMessage(10).includes('10 contas'));
  assert.ok(ambiguousAccountMessage('115532365').length <= 200);
});
