import type { OfficialRuleSource, PropFirmRuleProgram } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const programUrl = 'https://the5ers.com/high-stakes/';
const rulesUrl = 'https://help.the5ers.com/what-are-the-general-rules-for-the-high-stakes-program/';
const drawdownUrl = 'https://help.the5ers.com/what-is-the-drawdown-rule-for-high-stakes/';
const newsUrl = 'https://help.the5ers.com/is-news-trading-allowed-in-the-high-stakes-program/';
const payoutUrl = 'https://help.the5ers.com/payout-policy-and-hub-credit-in-the-high-stakes-program/';

const officialSources: OfficialRuleSource[] = [
  { label: 'The5ers High Stakes program', url: programUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
  { label: 'The5ers High Stakes rules', url: rulesUrl, kind: 'official_terms', precedence: 2, lastAccessedAt: reviewedAt },
  { label: 'The5ers High Stakes drawdown', url: drawdownUrl, kind: 'official_terms', precedence: 3, lastAccessedAt: reviewedAt },
  { label: 'The5ers High Stakes news policy', url: newsUrl, kind: 'official_terms', precedence: 4, lastAccessedAt: reviewedAt },
  { label: 'The5ers High Stakes payout policy', url: payoutUrl, kind: 'official_terms', precedence: 5, lastAccessedAt: reviewedAt },
];

const sizes = ['$2.5K', '$5K', '$10K', '$25K', '$50K', '$100K'];
const prohibitedPractices = [
  'Executar ordens entre 2 minutos antes e 2 minutos depois de notícia de alto impacto relacionada.',
  'Permanecer mais de 30 dias sem atividade.',
  'Exceder Daily Loss ou Maximum Loss.',
  'Compartilhar ou operar contas fora dos limites de titularidade publicados.',
];

function program(id: string, name: string, firstTarget: string): PropFirmRuleProgram {
  return {
    id,
    firm: 'The5ers',
    firmSlug: 'the5ers',
    programName: name,
    programType: '2-Step',
    market: 'CFD/Forex',
    platforms: ['MT5 Hedge'],
    accountSizes: sizes,
    accountSizeRows: [{ label: '$2.5K a $100K', profitTarget: `${firstTarget} / 5%`, dailyLoss: '5%', maxLoss: '10% estático' }],
    profitTarget: `${firstTarget} na Fase 1; 5% na Fase 2`,
    dailyLoss: '5% do maior entre balance/equity no rollover diário',
    maxLoss: '10%',
    drawdownType: 'Static',
    trailingDescription: 'Maximum Loss absoluto de 10% do saldo inicial.',
    minTradingDays: '3 dias lucrativos de pelo menos 0,5% em cada fase; prazo ilimitado',
    consistencyRule: 'Sem regra percentual de consistência; exige dias lucrativos',
    newsRule: 'Holding permitido; não executar ordens na janela de ±2 minutos de notícia de alto impacto',
    weekendRule: 'Holding overnight e fim de semana permitido; índices podem gerar swap elevado',
    payout: 'Funded: a cada 14 dias, mínimo $150; split de 80% escalando até 100%',
    leverage: '1:100',
    riskLevel: 'Médio',
    mainRisk: 'Daily Loss usa o maior entre balance e equity no rollover e a janela de notícias gera soft breach.',
    bestFor: 'Trader MT5 que prefere perda total estática, prazo ilimitado e holding de fim de semana.',
    officialSourceUrl: programUrl,
    sourceLabel: 'The5ers High Stakes',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    dataCompleteness: 'complete',
    evidenceStatus: 'verified',
    officialSources,
    conflicts: [],
    monitorability: {
      automatic_mt5: ['Metas', 'Daily Loss', 'Maximum Loss', 'Dias lucrativos', 'Inatividade', 'P&L no rollover'],
      manual_check: ['Janela de notícias', 'Payout e KYC', 'Limites de contas simultâneas'],
      not_supported_yet: ['Calendário Forex Factory integrado', 'Validação de titularidade entre contas'],
    },
    prohibitedPractices,
    notes: ['Dia lucrativo exige 0,5% do saldo inicial.', 'Notícia na janela restrita remove o lucro; perdas permanecem.'],
    tradingObjectives: [`Atingir ${firstTarget} e depois 5%.`, 'Completar três dias lucrativos por fase.'],
    riskRules: ['Daily Loss de 5%.', 'Maximum Loss absoluto de 10%.'],
    attentionRules: ['Daily Loss considera o maior snapshot entre balance/equity.', 'Não abrir ordens na janela de notícia.'],
    operationalNotes: ['Inatividade acima de 30 dias expira a conta.', 'Holding de fim de semana é permitido.'],
    criticalRules: ['Metas por fase', 'Daily Loss 5%', 'Max Loss 10%', 'Dias lucrativos', 'Notícias'],
  };
}

export const the5ersPrograms: PropFirmRuleProgram[] = [
  program('the5ers-high-stakes-new-2026', 'High Stakes New', '10%'),
  program('the5ers-high-stakes-classic-2026', 'High Stakes Classic', '8%'),
];
