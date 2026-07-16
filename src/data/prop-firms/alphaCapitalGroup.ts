import type { OfficialRuleSource, PropFirmRuleProgram, RuleMonitorability } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const proUrl = 'https://help.alphacapitalgroup.uk/en/articles/8420429-alpha-pro-8-10';
const pro6Url = 'https://help.alphacapitalgroup.uk/en/articles/11378706-alpha-pro-6';
const swingUrl = 'https://help.alphacapitalgroup.uk/en/articles/9789907-alpha-swing';
const oneUrl = 'https://help.alphacapitalgroup.uk/en/articles/10097421-alpha-one';
const threeUrl = 'https://help.alphacapitalgroup.uk/en/articles/10192958-alpha-three';
const durationUrl = 'https://help.alphacapitalgroup.uk/en/articles/8447268-what-is-the-2-minute-average-trade-duration-rule';
const newsUrl = 'https://help.alphacapitalgroup.uk/en/articles/9293522-can-i-trade-news';
const eaUrl = 'https://help.alphacapitalgroup.uk/en/articles/6934236-can-i-use-an-expert-advisor-ea';
const copyUrl = 'https://help.alphacapitalgroup.uk/en/articles/8786973-is-copy-trading-allowed';
const stopLossUrl = 'https://help.alphacapitalgroup.uk/en/articles/6933904-are-stop-loss-and-take-profit-orders-required';
const prohibitedUrl = 'https://help.alphacapitalgroup.uk/en/articles/6934275-what-are-prohibited-trading-strategies';
const payoutUrl = 'https://help.alphacapitalgroup.uk/en/articles/10102634-on-demand-performance-fee';
const countriesUrl = 'https://help.alphacapitalgroup.uk/en/articles/8775575-countries-with-limitations';

const sharedSources: OfficialRuleSource[] = [
  { label: 'Alpha trade-duration rule', url: durationUrl, kind: 'official_terms', precedence: 3, lastAccessedAt: reviewedAt },
  { label: 'Alpha news rules', url: newsUrl, kind: 'official_terms', precedence: 4, lastAccessedAt: reviewedAt },
  { label: 'Alpha EA policy', url: eaUrl, kind: 'official_terms', precedence: 5, lastAccessedAt: reviewedAt },
  { label: 'Alpha copy-trading policy', url: copyUrl, kind: 'official_terms', precedence: 6, lastAccessedAt: reviewedAt },
  { label: 'Alpha SL/TP policy', url: stopLossUrl, kind: 'official_terms', precedence: 7, lastAccessedAt: reviewedAt },
  { label: 'Alpha prohibited strategies', url: prohibitedUrl, kind: 'official_terms', precedence: 8, lastAccessedAt: reviewedAt },
  { label: 'Alpha on-demand payout', url: payoutUrl, kind: 'official_website', precedence: 9, lastAccessedAt: reviewedAt },
  { label: 'Alpha restricted countries', url: countriesUrl, kind: 'official_terms', precedence: 10, lastAccessedAt: reviewedAt },
];

const platforms = ['MT5', 'cTrader', 'DXtrade', 'TradeLocker'];
const accountSizes = ['$5K', '$10K', '$25K', '$50K', '$100K', '$200K', '$300K'];
const standardLots = '2,5 / 5 / 10 / 20 / 40 / 80 / 120 lotes';
const swingLots = '1,25 / 2,5 / 5 / 10 / 20 / 40 / 60 lotes';
const prohibitedPractices = [
  'Preços irreais, front-running, arbitragem de latência, HFT ou spam de ordens.',
  'Hedge reverso ou coordenado entre contas, group trading e sinais compartilhados.',
  'Gestão de conta por terceiros, pass service ou copy sem comprovação e autorização.',
  'Automação total, bot de terceiros ou EA não pré-aprovado.',
  'Gambling, risco não replicável e tentativa de contornar duração média ou limites de estratégia.',
];
const monitorability: RuleMonitorability = {
  automatic_mt5: ['Meta por fase', 'Daily Drawdown', 'Max Drawdown', 'High-water mark', 'Dias mínimos', 'Duração média', 'Lucro por duração', 'Exposição em lotes'],
  manual_check: ['Notícias por plano', 'Weekend por estágio', 'EA/copy aprovado', 'KYC/país', 'Payout e alocação por estratégia'],
  not_supported_yet: ['cTrader/DXtrade/TradeLocker sem conector', 'Detecção entre titulares e residências'],
};

function sources(label: string, url: string): OfficialRuleSource[] {
  return [{ label, url, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt }, ...sharedSources];
}

type AlphaInput = Omit<
  PropFirmRuleProgram,
  | 'firm'
  | 'firmSlug'
  | 'market'
  | 'platforms'
  | 'accountSizes'
  | 'lastReviewedAt'
  | 'confidence'
  | 'completeness'
  | 'dataCompleteness'
  | 'evidenceStatus'
  | 'conflicts'
  | 'monitorability'
  | 'prohibitedPractices'
>;

function program(input: AlphaInput): PropFirmRuleProgram {
  return {
    firm: 'Alpha Capital Group',
    firmSlug: 'alpha-capital-group',
    market: 'CFD/Forex',
    platforms,
    accountSizes,
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    dataCompleteness: 'complete',
    evidenceStatus: 'verified',
    conflicts: [],
    monitorability,
    prohibitedPractices,
    ...input,
  };
}

const sharedNotes = [
  'SL e TP não são obrigatórios.',
  'EA em MT5 só para assistência/risk management, com pré-aprovação; automação total é proibida.',
  'Copy trading exige comprovação de titularidade e autorização prévia.',
  'Média de duração deve superar 2 minutos e ao menos 50% do lucro deve vir de trades acima de 2 minutos.',
];

function proProgram(variant: '10' | '8' | '6'): PropFirmRuleProgram {
  const isSix = variant === '6';
  const target = variant === '10' ? '10% / 5%' : variant === '8' ? '8% / 5%' : '6% / 6%';
  const daily = variant === '10' ? '5%' : variant === '8' ? '4%' : '3%';
  const max = `${variant}% estático`;
  const url = isSix ? pro6Url : proUrl;
  return program({
    id: `alpha-capital-pro-${variant}-2026`,
    programName: `Alpha Pro ${variant}%`,
    programType: '2-Step',
    accountSizeRows: [{ label: '$5K a $300K', profitTarget: target, dailyLoss: daily, maxLoss: max, maxContracts: standardLots }],
    profitTarget: variant === '10' ? '10% na Fase 1; 5% na Fase 2' : variant === '8' ? '8% na Fase 1; 5% na Fase 2' : '6% em cada fase',
    dailyLoss: isSix ? '3% sobre o maior entre balance/equity no fim do dia' : `${daily} balance-based`,
    maxLoss: max,
    drawdownType: 'Static',
    trailingDescription: `Piso fixo de ${variant}% abaixo do saldo inicial.`,
    minTradingDays: '3 dias por fase; sem prazo máximo; inatividade em 30 dias',
    consistencyRule: 'Sem consistência na avaliação; payout on-demand exige Best Day de 40% e 2% de lucro bruto',
    newsRule: isSix ? 'Avaliação livre; Qualified proíbe execução em ±5 minutos de eventos direcionados' : 'Avaliação livre; Qualified proíbe execução em ±2 minutos de eventos direcionados',
    weekendRule: 'Avaliação permite; Qualified Analyst Pro não permite e aplica soft breach',
    payout: 'Até 80%; on-demand com Best Day 40%/mínimo 2%, ou biweekly de 14 dias para Pro',
    leverage: 'FX 1:100; metais 1:30; índices 1:20; óleo 1:10',
    riskLevel: variant === '6' ? 'Alto' : 'Médio',
    mainRisk: `Daily de ${daily}, lot exposure e regras de duração/notícias são revisados no payout.`,
    bestFor: `Trader que prefere avaliação em duas fases com drawdown estático de ${variant}%.`,
    officialSourceUrl: url,
    sourceLabel: `Alpha Pro ${variant}%`,
    officialSources: sources(`Alpha Pro ${variant}%`, url),
    notes: sharedNotes,
    tradingObjectives: [`Atingir ${target}.`, 'Completar três dias por fase.'],
    riskRules: [`Daily Drawdown de ${daily}.`, `Max Drawdown estático de ${variant}%.`, `Lot exposure: ${standardLots}.`],
    attentionRules: ['Weekend é proibido no Qualified Pro.', `News no Qualified: ${isSix ? '±5' : '±2'} minutos.`],
    operationalNotes: ['Alocação Qualified máxima de $400K por residência.', 'Máximo de $300K por estratégia/ativo.'],
    criticalRules: [`Metas ${target}`, `Daily ${daily}`, `Static ${variant}%`, 'Duração média >2 min', 'Lot exposure'],
  });
}

export const alphaCapitalGroupPrograms: PropFirmRuleProgram[] = [
  proProgram('10'),
  proProgram('8'),
  proProgram('6'),
  program({
    id: 'alpha-capital-swing-2026',
    programName: 'Alpha Swing',
    programType: '2-Step',
    accountSizeRows: [{ label: '$5K a $300K', profitTarget: '10% / 5%', dailyLoss: '5%', maxLoss: '10% estático', maxContracts: swingLots }],
    profitTarget: '10% na Fase 1; 5% na Fase 2',
    dailyLoss: '5% balance-based',
    maxLoss: '10% estático',
    drawdownType: 'Static',
    trailingDescription: 'Piso fixo em 90% do saldo inicial.',
    minTradingDays: '3 dias por fase; sem prazo máximo; inatividade em 30 dias',
    consistencyRule: 'Sem consistência na avaliação; payout on-demand exige Best Day de 40% e 2% de lucro bruto',
    newsRule: 'Permitido; trade iniciado em ±2 minutos de notícia deve durar mais de 2 minutos',
    weekendRule: 'Permitido na avaliação e no Qualified Analyst',
    payout: 'Somente on-demand; até 80%; Best Day 40% e mínimo 2% de lucro bruto',
    leverage: 'FX 1:30; metais 1:9; índices/óleo 1:10',
    riskLevel: 'Médio',
    mainRisk: 'Lot exposure é metade do Pro e a regra de duração continua aplicável a todos os trades.',
    bestFor: 'Swing trader que precisa manter posições no fim de semana.',
    officialSourceUrl: swingUrl,
    sourceLabel: 'Alpha Swing',
    officialSources: sources('Alpha Swing', swingUrl),
    notes: sharedNotes,
    tradingObjectives: ['Atingir 10% e depois 5%.', 'Completar três dias por fase.'],
    riskRules: ['Daily Drawdown de 5%.', 'Max Drawdown estático de 10%.', `Lot exposure: ${swingLots}.`],
    attentionRules: ['Trades de notícia iniciados na janela devem durar mais de 2 minutos.', 'Sujeito às regras de gambling.'],
    operationalNotes: ['Weekend permitido.', 'Somente payout on-demand.'],
    criticalRules: ['Metas 10%/5%', 'Daily 5%', 'Static 10%', 'Duração >2 min', 'Lot exposure reduzido'],
  }),
  program({
    id: 'alpha-capital-one-2026',
    programName: 'Alpha One',
    programType: '1-Step',
    accountSizeRows: [{ label: '$5K a $300K', profitTarget: '10%', dailyLoss: '4%', maxLoss: '6% trailing', maxContracts: standardLots }],
    profitTarget: '10%',
    dailyLoss: '4% sobre o maior entre balance/equity no fim do dia',
    maxLoss: '6% trailing',
    drawdownType: 'Trailing',
    trailingDescription: 'Segue o maior saldo fechado e trava no saldo inicial ao atingir +6%.',
    minTradingDays: '1 dia; sem prazo máximo; inatividade em 30 dias',
    consistencyRule: 'Sem consistência na avaliação; payout on-demand exige Best Day de 40% e 2% de lucro bruto',
    newsRule: 'Avaliação livre; Qualified proíbe execução em ±5 minutos de eventos direcionados',
    weekendRule: 'Permitido na avaliação e no Qualified Analyst',
    payout: 'Somente on-demand; até 80%; Best Day 40% e mínimo 2% de lucro bruto',
    leverage: 'FX 1:30; metais 1:9; índices/óleo 1:10',
    riskLevel: 'Alto',
    mainRisk: 'Trailing por high-water mark e payout integral podem eliminar o buffer da conta.',
    bestFor: 'Trader que quer uma fase e consegue acompanhar o trailing de saldo.',
    officialSourceUrl: oneUrl,
    sourceLabel: 'Alpha One',
    officialSources: sources('Alpha One', oneUrl),
    notes: sharedNotes,
    tradingObjectives: ['Atingir 10% em ao menos um dia válido.'],
    riskRules: ['Daily Drawdown de 4%.', 'Max Drawdown trailing de 6%.', `Lot exposure: ${standardLots}.`],
    attentionRules: ['Payout sem buffer pode fechar a conta.', 'News Qualified ±5 minutos.'],
    operationalNotes: ['Weekend permitido.', 'Somente payout on-demand.'],
    criticalRules: ['Meta 10%', 'Daily 4%', 'Trailing 6%', 'Duração >2 min', 'Payout buffer'],
  }),
  program({
    id: 'alpha-capital-three-2026',
    programName: 'Alpha Three',
    programType: '3-Step',
    accountSizeRows: [{ label: '$5K a $300K', profitTarget: '8% / 4% / 4%', dailyLoss: '4%', maxLoss: '6% estático', maxContracts: standardLots }],
    profitTarget: '8% na Fase 1; 4% nas Fases 2 e 3',
    dailyLoss: '4% sobre o maior entre balance/equity no fim do dia',
    maxLoss: '6% estático',
    drawdownType: 'Static',
    trailingDescription: 'Piso fixo em 94% do saldo inicial.',
    minTradingDays: '3 dias por fase; sem prazo máximo; inatividade em 30 dias',
    consistencyRule: 'Sem consistência na avaliação; payout on-demand exige Best Day de 40% e 2% de lucro bruto',
    newsRule: 'Avaliação livre; Qualified proíbe execução em ±5 minutos de eventos direcionados',
    weekendRule: 'Permitido na avaliação e no Qualified Analyst',
    payout: 'Até 80%; on-demand ou biweekly de 14 dias',
    leverage: 'FX 1:50; metais 1:9; índices/óleo 1:10',
    riskLevel: 'Médio',
    mainRisk: 'Três fases, daily calculado pelo maior EOD e regra global de duração prolongam o percurso.',
    bestFor: 'Trader que prefere metas menores depois da primeira fase e weekend permitido.',
    officialSourceUrl: threeUrl,
    sourceLabel: 'Alpha Three',
    officialSources: sources('Alpha Three', threeUrl),
    notes: sharedNotes,
    tradingObjectives: ['Atingir 8%, 4% e 4%.', 'Completar três dias por fase.'],
    riskRules: ['Daily Drawdown de 4%.', 'Max Drawdown estático de 6%.', `Lot exposure: ${standardLots}.`],
    attentionRules: ['News Qualified ±5 minutos.', 'Duração média se aplica a todas as fases.'],
    operationalNotes: ['Weekend permitido.', 'On-demand ou biweekly.'],
    criticalRules: ['Metas 8%/4%/4%', 'Daily 4%', 'Static 6%', 'Duração >2 min', 'Lot exposure'],
  }),
];
