import type { OfficialRuleSource, PropFirmRuleProgram } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const rulesUrl = 'https://help.brightfunded.com/en/articles/9241611-what-are-the-current-rules-for-the-evaluation-process';
const oneStepUrl = 'https://help.brightfunded.com/en/articles/14284743-brightfunded-1-step';
const dailyLossUrl = 'https://help.brightfunded.com/en/articles/12291765-how-does-my-daily-permitted-loss-work';
const newsUrl = 'https://help.brightfunded.com/en/articles/9241694-can-i-trade-news';
const payoutUrl = 'https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account';
const prohibitedUrl = 'https://help.brightfunded.com/en/articles/9241704-which-strategies-are-prohibited-at-brightfunded';
const platformsUrl = 'https://help.brightfunded.com/en/articles/10855521-what-trading-platform-does-brightfunded-offer';
const countriesUrl = 'https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded';
const mergeUrl = 'https://help.brightfunded.com/en/articles/9436456-how-the-account-merge-works';
const originalAccountsUrl = 'https://help.brightfunded.com/en/articles/14285762-brightfunded-original-accounts';

const sharedSources: OfficialRuleSource[] = [
  { label: 'BrightFunded evaluation rules', url: rulesUrl, kind: 'official_terms', precedence: 1, lastAccessedAt: reviewedAt },
  { label: 'BrightFunded daily loss calculation', url: dailyLossUrl, kind: 'official_terms', precedence: 2, lastAccessedAt: reviewedAt },
  { label: 'BrightFunded news rules', url: newsUrl, kind: 'official_terms', precedence: 3, lastAccessedAt: reviewedAt },
  { label: 'BrightFunded payout rules', url: payoutUrl, kind: 'official_website', precedence: 4, lastAccessedAt: reviewedAt },
  { label: 'BrightFunded prohibited strategies', url: prohibitedUrl, kind: 'official_terms', precedence: 5, lastAccessedAt: reviewedAt },
  { label: 'BrightFunded platforms', url: platformsUrl, kind: 'official_website', precedence: 6, lastAccessedAt: reviewedAt },
  { label: 'BrightFunded restricted countries', url: countriesUrl, kind: 'official_terms', precedence: 7, lastAccessedAt: reviewedAt },
  { label: 'BrightFunded account merge and offered sizes', url: mergeUrl, kind: 'official_website', precedence: 8, lastAccessedAt: '2026-07-17' },
  { label: 'BrightFunded Original Accounts', url: originalAccountsUrl, kind: 'official_terms', precedence: 9, lastAccessedAt: '2026-07-17' },
];

const prohibitedPractices = [
  'Hedge entre contas, coordenação, manipulação multi-account ou account rolling.',
  'Explorar atraso de feed, erro de serviço, arbitragem, tick scalping ou grid trading.',
  'HFT, IA/automação de alta velocidade e execução incompatível com mercado real.',
  'Gestão por terceiros, sinais de grupos ou copy trading entre titulares diferentes.',
  'Overleveraging, overexposure e apostas unidirecionais abusivas.',
];

const monitorability = {
  automatic_mt5: ['Meta por fase', 'Daily Drawdown por equity/balance', 'Max Drawdown estático/trailing', 'Dias mínimos', 'Duração mínima do trade para contar', 'Inatividade'],
  manual_check: ['Notícias no funded', 'Titularidade de copy/EA', 'KYC e país', 'Payout e add-ons'],
  not_supported_yet: ['DXtrade/cTrader sem conector', 'Detecção entre titulares', 'Classificação automática de estratégia proibida'],
};

const platforms = ['MT5', 'DXtrade', 'cTrader'];
const common = {
  firm: 'BrightFunded' as const,
  firmSlug: 'brightfunded',
  market: 'CFD/Forex' as const,
  platforms,
  accountSizes: ['$5K', '$10K', '$25K', '$50K', '$100K', '$200K'],
  consistencyRule: 'Sem regra de consistência vigente',
  weekendRule: 'Holding overnight e fim de semana permitido; crypto pode operar quando o mercado estiver aberto',
  payout: '80% padrão; primeiro após 30 dias, depois 14 dias; add-ons de 14/7 dias e 90%; escala até 100%',
  leverage: 'Varia por ativo, plataforma e add-on; confirmar no checkout',
  lastReviewedAt: reviewedAt,
  confidence: 'high' as const,
  completeness: 'complete' as const,
  dataCompleteness: 'complete' as const,
  evidenceStatus: 'verified' as const,
  officialSources: sharedSources,
  conflicts: [],
  monitorability,
  prohibitedPractices,
};

export const brightFundedPrograms: PropFirmRuleProgram[] = [
  {
    ...common,
    id: 'brightfunded-two-step-bright-2026',
    programName: '2-Step Bright',
    programType: '2-Step',
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '8% / 5%', dailyLoss: '4%', maxLoss: '8% estático' }],
    profitTarget: '8% na Fase 1; 5% na Fase 2',
    dailyLoss: '4% do saldo inicial; piso diário usa o maior entre balance/equity no rollover',
    maxLoss: '8% estático',
    drawdownType: 'Static',
    trailingDescription: 'Piso total fixo em 92% do saldo inicial.',
    minTradingDays: '5 dias por fase; trade deve permanecer aberto por 60 segundos; prazo ilimitado',
    newsRule: 'Challenge livre; funded proíbe execução, SL e TP em ±5 minutos de notícia de alto impacto',
    riskLevel: 'Médio',
    mainRisk: 'Floating P&L entra no daily loss e trades curtos não contam para os dias mínimos.',
    bestFor: 'Trader que aceita duas fases com limites intermediários e sem consistência.',
    officialSourceUrl: rulesUrl,
    sourceLabel: 'BrightFunded evaluation rules',
    notes: ['SL não é obrigatório.', 'EA é permitido, exceto API/automação não suportada no DXtrade.', 'Copy somente entre contas do mesmo titular.'],
    tradingObjectives: ['Atingir 8% e depois 5%.', 'Completar cinco dias válidos por fase.'],
    riskRules: ['Daily Drawdown de 4%.', 'Max Drawdown estático de 8%.'],
    attentionRules: ['Rollover entre 23:30 e 23:59 CET.', 'News no funded causa dedução de lucro.'],
    operationalNotes: ['Inatividade após 30 dias sem trade válido.', 'País e KYC devem ser elegíveis.'],
    criticalRules: ['Metas 8%/5%', 'Daily 4%', 'Static 8%', 'Cinco dias', 'News funded ±5'],
  },
  {
    ...common,
    id: 'brightfunded-two-step-classic-2026',
    programName: '2-Step Classic',
    programType: '2-Step',
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '10% / 5%', dailyLoss: '5%', maxLoss: '10% estático' }],
    profitTarget: '10% na Fase 1; 5% na Fase 2',
    dailyLoss: '5% do saldo inicial; piso diário usa o maior entre balance/equity no rollover',
    maxLoss: '10% estático',
    drawdownType: 'Static',
    trailingDescription: 'Piso total fixo em 90% do saldo inicial.',
    minTradingDays: '5 dias por fase; trade deve permanecer aberto por 60 segundos; prazo ilimitado',
    newsRule: 'Challenge livre; funded proíbe execução, SL e TP em ±5 minutos de notícia de alto impacto',
    riskLevel: 'Médio',
    mainRisk: 'A avaliação é mais ampla, mas o daily considera equity e balance no rollover.',
    bestFor: 'Trader que prefere limites clássicos de 5% diário e 10% total.',
    officialSourceUrl: rulesUrl,
    sourceLabel: 'BrightFunded evaluation rules',
    notes: ['SL não é obrigatório.', 'EA é permitido dentro das regras.', 'Copy somente entre contas do mesmo titular.'],
    tradingObjectives: ['Atingir 10% e depois 5%.', 'Completar cinco dias válidos por fase.'],
    riskRules: ['Daily Drawdown de 5%.', 'Max Drawdown estático de 10%.'],
    attentionRules: ['Rollover entre 23:30 e 23:59 CET.', 'News no funded causa dedução de lucro.'],
    operationalNotes: ['Inatividade após 30 dias sem trade válido.', 'Payout sem valor mínimo.'],
    criticalRules: ['Metas 10%/5%', 'Daily 5%', 'Static 10%', 'Cinco dias', 'News funded ±5'],
  },
  {
    ...common,
    id: 'brightfunded-one-step-2026',
    programName: '1-Step',
    programType: '1-Step',
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '10%', dailyLoss: '3%', maxLoss: '6% trailing' }],
    profitTarget: '10%',
    dailyLoss: '3% do saldo inicial; piso diário usa o maior entre balance/equity no rollover',
    maxLoss: '6% trailing em tempo real',
    drawdownType: 'Trailing',
    trailingDescription: 'Segue o maior equity em tempo real e trava no saldo inicial ao atingir +6%.',
    minTradingDays: '5 dias; trade deve permanecer aberto por 60 segundos; prazo ilimitado',
    newsRule: 'Challenge livre; funded proíbe execução, SL e TP em ±5 minutos de notícia de alto impacto',
    riskLevel: 'Alto',
    mainRisk: 'Lucro flutuante eleva o trailing em tempo real e pode transformar uma reversão em breach.',
    bestFor: 'Trader que quer uma fase e acompanha equity máxima em tempo real.',
    officialSourceUrl: oneStepUrl,
    sourceLabel: 'BrightFunded 1-Step',
    officialSources: [
      { label: 'BrightFunded 1-Step', url: oneStepUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
      ...sharedSources,
    ],
    notes: ['SL não é obrigatório.', '15% do lucro de avaliação pode ser creditado após as condições oficiais.'],
    tradingObjectives: ['Atingir 10% em cinco dias válidos.', 'Não tocar daily ou trailing.'],
    riskRules: ['Daily Drawdown de 3%.', 'Max Drawdown trailing de 6% pelo equity HWM.'],
    attentionRules: ['Floating profit move o trailing.', 'News no funded causa dedução de lucro.'],
    operationalNotes: ['Inatividade após 30 dias sem trade válido.', 'Deixar margem para reversões.'],
    criticalRules: ['Meta 10%', 'Daily 3%', 'Trailing 6%', 'Cinco dias', 'News funded ±5'],
  },
];
