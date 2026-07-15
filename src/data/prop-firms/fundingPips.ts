import type { OfficialRuleSource, PropFirmRuleProgram } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const oneStepUrl = 'https://help.fundingpips.com/hc/en-us/articles/34501697434385-1-Step-Model';
const twoStepUrl = 'https://help.fundingpips.com/hc/en-us/articles/34501809112081-2-Step-Standard';
const newsUrl = 'https://help.fundingpips.com/hc/en-us/articles/34504137479441-News-Trading-Weekend-Holding';
const responsibleUrl = 'https://help.fundingpips.com/hc/en-us/articles/47328410434065-Responsible-Trading-Policy';

const sharedSources: OfficialRuleSource[] = [
  { label: 'FundingPips News & Weekend Holding', url: newsUrl, kind: 'official_terms', precedence: 2, lastAccessedAt: reviewedAt },
  { label: 'FundingPips Responsible Trading Policy', url: responsibleUrl, kind: 'official_terms', precedence: 3, lastAccessedAt: reviewedAt },
];

const platforms = ['MT5', 'cTrader', 'Match-Trader'];
const sizes = ['$5K', '$10K', '$25K', '$50K', '$100K'];
const prohibitedPractices = [
  'Operar propositalmente a volatilidade de notícia de alto impacto.',
  'Explorar latência, arbitragem ou falhas do ambiente simulado.',
  'Dividir artificialmente a mesma trade idea para contornar o limite de risco.',
  'Permanecer 30 dias sem completar uma operação.',
];

const monitorability = {
  automatic_mt5: ['Meta', 'Daily Loss', 'Max Loss', 'Dias mínimos', 'Inatividade', 'Concentração de lucro', 'Risco por trade idea'],
  manual_check: ['Notícias', 'Weekend holding temporário', 'Payout e reward cycle', 'Conduta responsável'],
  not_supported_yet: ['Calendário Forex Factory integrado', 'Agrupamento de trade ideas entre plataformas não MT5'],
};

export const fundingPipsPrograms: PropFirmRuleProgram[] = [
  {
    id: 'fundingpips-one-step-2026',
    firm: 'FundingPips',
    firmSlug: 'fundingpips',
    programName: '1 Step Model',
    programType: '1-Step',
    market: 'CFD/Forex',
    platforms,
    accountSizes: sizes,
    accountSizeRows: [{ label: '$5K a $100K', profitTarget: '10%', dailyLoss: '3%', maxLoss: '6% estático' }],
    profitTarget: '10%',
    dailyLoss: '3% do maior entre opening balance e opening equity',
    maxLoss: '6%',
    drawdownType: 'Static',
    trailingDescription: 'Piso estático de 6% do tamanho inicial; balance ou equity não podem tocar o limite.',
    minTradingDays: '3 dias; sem prazo máximo, com atividade a cada 30 dias',
    consistencyRule: 'Sem consistência na avaliação; Profit Concentration pode impor 4 dias lucrativos no Master',
    newsRule: 'Avaliação permite holding, mas purposefully trading news é proibido; Master aplica janela de ±5 minutos',
    weekendRule: 'Avaliação permite; Master temporariamente fecha posições na sexta sem hard breach',
    payout: 'Master: semanal 60%, quinzenal 80%, mensal 100% ou on-demand 90% com consistência de 35%',
    leverage: 'Varia por ativo; Master possui leverage dinâmico temporário em metais, índices e energia',
    riskLevel: 'Alto',
    mainRisk: 'Daily Loss de 3% combina com limite por trade idea no Master e políticas temporárias de notícia/weekend.',
    bestFor: 'Trader que quer uma fase e escolhe o ciclo de Reward conforme consistência e prazo.',
    officialSourceUrl: oneStepUrl,
    sourceLabel: 'FundingPips 1 Step Model',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    dataCompleteness: 'complete',
    evidenceStatus: 'verified',
    officialSources: [{ label: 'FundingPips 1 Step Model', url: oneStepUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt }, ...sharedSources],
    conflicts: [],
    monitorability,
    prohibitedPractices,
    notes: ['Risk Per Trade Idea só se aplica ao Master: 3% abaixo de $50K e 2% a partir de $50K.', 'Política de concentração vale para avaliações novas de $25K+ desde 27/06/2026.'],
    tradingObjectives: ['Atingir 10% em pelo menos três dias.', 'Não tocar 3% diário ou 6% total.'],
    riskRules: ['Daily Loss considera P&L aberto e fechado.', 'Max Loss estático de 6%.'],
    attentionRules: ['Profit Concentration acima de 60% altera a elegibilidade futura de Reward.', 'Weekend e leverage possuem medidas temporárias vigentes.'],
    operationalNotes: ['Limite de 20 lotes por clique; 1 lote para crypto.', 'Reward mínimo de 1% do Master, conforme ciclo.'],
    criticalRules: ['Daily Loss 3%', 'Max Loss 6%', 'Trade idea', 'Profit Concentration', 'Notícias'],
  },
  {
    id: 'fundingpips-two-step-standard-2026',
    firm: 'FundingPips',
    firmSlug: 'fundingpips',
    programName: '2 Step Standard',
    programType: '2-Step',
    market: 'CFD/Forex',
    platforms,
    accountSizes: ['$2.5K', ...sizes],
    accountSizeRows: [{ label: '$2.5K a $100K', profitTarget: '8% ou 10% / 5%', dailyLoss: '5%', maxLoss: '10% estático' }],
    profitTarget: 'Fase 1: opção de 8% ou 10%; Fase 2: 5%',
    dailyLoss: '5% do maior entre opening balance e opening equity',
    maxLoss: '10%',
    drawdownType: 'Static',
    trailingDescription: 'Piso estático de 10% do tamanho inicial em todas as fases.',
    minTradingDays: '3 dias por fase; sem prazo máximo, com atividade a cada 30 dias',
    consistencyRule: 'Sem consistência na avaliação; políticas de concentração/Reward podem ser aplicáveis',
    newsRule: 'Avaliação permite holding, mas purposefully trading news é proibido; Master aplica janela de ±5 minutos',
    weekendRule: 'Avaliação permite; Master temporariamente não permite holding e fecha posições na sexta',
    payout: 'Master: semanal 60%, quinzenal 80%, mensal 100% ou on-demand 90% com consistência de 35%',
    leverage: 'Forex até 1:100; varia por classe de ativo e fase',
    riskLevel: 'Médio',
    mainRisk: 'Daily Loss usa o maior opening balance/equity e o Master acrescenta risco por trade idea.',
    bestFor: 'Trader que prefere duas fases, drawdown estático de 10% e leverage Forex maior.',
    officialSourceUrl: twoStepUrl,
    sourceLabel: 'FundingPips 2 Step Standard',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    dataCompleteness: 'complete',
    evidenceStatus: 'verified',
    officialSources: [{ label: 'FundingPips 2 Step Standard', url: twoStepUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt }, ...sharedSources],
    conflicts: [],
    monitorability,
    prohibitedPractices,
    notes: ['A opção de target 8% possui Striking System no Master acima de $25K.', 'Reset de Phase 2 reinicia na Phase 1.'],
    tradingObjectives: ['Atingir a meta escolhida e depois 5%.', 'Completar três dias em cada fase.'],
    riskRules: ['Daily Loss de 5%.', 'Max Loss estático de 10%.'],
    attentionRules: ['O limite toca e reprova mesmo se a conta recuperar depois.', 'Profit Concentration pode exigir quatro dias lucrativos por Reward.'],
    operationalNotes: ['Sem prazo máximo.', 'Master passa por KYC e revisão de Responsible Trading.'],
    criticalRules: ['Targets por opção', 'Daily Loss 5%', 'Max Loss 10%', 'Trade idea', 'Striking System'],
  },
];
