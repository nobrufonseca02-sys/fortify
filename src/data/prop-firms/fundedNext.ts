import type { OfficialRuleSource, PropFirmRuleProgram, RuleConflict } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const oneStepRulesUrl = 'https://help.fundednext.com/en/articles/8021061-what-are-the-rules-for-the-stellar-1-step-challenge-at-fundednext';
const oneStepTargetUrl = 'https://help.fundednext.com/en/articles/8030875-what-is-the-profit-target-of-the-stellar-1-step-challenge';
const twoStepRulesUrl = 'https://help.fundednext.com/en/articles/8021076-what-rules-do-i-need-to-follow-in-the-stellar-2-step-challenge';
const twoStepTargetUrl = 'https://help.fundednext.com/en/articles/8021071-what-is-the-profit-target-of-the-stellar-2-step-challenge';
const lossUrl = 'https://help.fundednext.com/en/articles/9941519-daily-loss-limit-vs-maximum-loss-limit';
const rewardUrl = 'https://help.fundednext.com/en/articles/10701585-how-often-will-i-receive-my-performance-reward';
const addOnUrl = 'https://help.fundednext.com/en/articles/8592191-how-does-the-add-on-feature-work-with-the-fundednext-new-challenge-purchase';

const sharedSources: OfficialRuleSource[] = [
  { label: 'FundedNext loss limits', url: lossUrl, kind: 'official_terms', precedence: 2, lastAccessedAt: reviewedAt },
  { label: 'FundedNext Reward schedule', url: rewardUrl, kind: 'official_website', precedence: 3, lastAccessedAt: reviewedAt },
];

const sizes = ['$6K', '$15K', '$25K', '$50K', '$100K', '$200K'];
const platforms = ['MT4', 'MT5', 'cTrader', 'Match-Trader'];
const prohibitedPractices = [
  'Manipulação de plataforma, exploração de latência ou fraude.',
  'Copy trading entre contas de pessoas diferentes.',
  'Compartilhar conta ou permitir operação por terceiros.',
  'Usar EA ou indicador com configuração incompatível com os parâmetros da conta.',
];

const monitorability = {
  automatic_mt5: ['Meta', 'Daily Loss', 'Maximum Loss', 'Dias mínimos', 'Trades por dia', 'P&L aberto e fechado'],
  manual_check: ['Copy trading entre pessoas', 'IP/VPN/VPS', 'KYC', 'News policy e Reward review'],
  not_supported_yet: ['Correlação entre titulares', 'Detecção de manipulação de plataforma'],
};

const minimumDaysConflict: RuleConflict = {
  field: 'minTradingDays',
  summary: 'A FAQ direta do Stellar 1-Step informa 2 dias; a página genérica de add-ons ainda menciona remoção de uma regra de 5 dias.',
  preferredValue: '2 dias',
  resolution: 'Foi adotada a FAQ específica e mais recente do programa; a divergência permanece registrada.',
  sourceUrls: [oneStepRulesUrl, addOnUrl],
};

export const fundedNextPrograms: PropFirmRuleProgram[] = [
  {
    id: 'fundednext-stellar-one-step-2026',
    firm: 'FundedNext',
    firmSlug: 'fundednext',
    programName: 'Stellar 1-Step',
    programType: '1-Step',
    market: 'CFD/Forex',
    platforms,
    accountSizes: sizes,
    accountSizeRows: [{ label: '$6K a $200K', profitTarget: '10%', dailyLoss: '3%', maxLoss: '6% estático' }],
    profitTarget: '10%',
    dailyLoss: '3% do saldo inicial; reset à 00:00 server time',
    maxLoss: '6%',
    drawdownType: 'Static',
    trailingDescription: 'Maximum Loss é um piso estático de 6% do saldo inicial.',
    minTradingDays: '2 dias separados; sem prazo máximo',
    consistencyRule: 'Sem consistência padrão; add-on on-demand aplica 40% na conta funded',
    newsRule: 'Verificar a política oficial vigente e o add-on contratado',
    weekendRule: 'Sem conta Swing; posições podem ser fechadas ao fim do ciclo conforme política vigente',
    payout: 'FundedNext Account: 80% inicial; ciclo de 5 dias úteis, podendo escalar para 90%',
    leverage: 'Varia por plataforma, ativo e contratação',
    riskLevel: 'Alto',
    mainRisk: 'Daily Loss de 3% inclui perdas flutuantes; há divergência oficial residual sobre dias mínimos em página de add-on.',
    bestFor: 'Trader que quer uma fase, payout frequente e aceita limites de perda mais estreitos.',
    officialSourceUrl: oneStepRulesUrl,
    sourceLabel: 'FundedNext Stellar 1-Step rules',
    lastReviewedAt: reviewedAt,
    confidence: 'medium',
    completeness: 'partial',
    dataCompleteness: 'partial',
    evidenceStatus: 'verified',
    officialSources: [
      { label: 'Stellar 1-Step rules', url: oneStepRulesUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
      { label: 'Stellar 1-Step profit target', url: oneStepTargetUrl, kind: 'official_website', precedence: 2, lastAccessedAt: reviewedAt },
      { label: 'FundedNext add-ons', url: addOnUrl, kind: 'official_website', precedence: 4, lastAccessedAt: reviewedAt },
      ...sharedSources,
    ],
    conflicts: [minimumDaysConflict],
    monitorability,
    prohibitedPractices,
    notes: ['EA e indicadores são permitidos dentro dos parâmetros.', 'Copy trading é permitido somente entre Challenge Accounts do mesmo trader.'],
    tradingObjectives: ['Atingir 10% em pelo menos dois dias.', 'Não violar 3% diário ou 6% total.'],
    riskRules: ['Daily Loss de 3%.', 'Maximum Loss de 6%.'],
    attentionRules: ['Confirmar dias mínimos no dashboard por causa da divergência documental.', 'KYC é obrigatório antes da conta FundedNext.'],
    operationalNotes: ['Reward Share inicial de 80%.', 'Ciclo funded de cinco dias úteis.'],
    criticalRules: ['Daily Loss 3%', 'Max Loss 6%', 'Dois dias', 'Copy trading'],
  },
  {
    id: 'fundednext-stellar-two-step-2026',
    firm: 'FundedNext',
    firmSlug: 'fundednext',
    programName: 'Stellar 2-Step',
    programType: '2-Step',
    market: 'CFD/Forex',
    platforms,
    accountSizes: sizes,
    accountSizeRows: [{ label: '$6K a $200K', profitTarget: '8% / 5%', dailyLoss: '5%', maxLoss: '10% estático' }],
    profitTarget: '8% na Fase 1; 5% na Fase 2',
    dailyLoss: '5% do saldo inicial; reset à 00:00 server time',
    maxLoss: '10%',
    drawdownType: 'Static',
    trailingDescription: 'Maximum Loss é um piso estático de 10% do saldo inicial e reinicia ao mudar de fase.',
    minTradingDays: '5 dias e pelo menos um trade por dia em cada fase; sem prazo máximo',
    consistencyRule: 'Sem consistência padrão; add-on on-demand aplica 40% na conta funded',
    newsRule: 'Verificar a política oficial vigente e o add-on contratado',
    weekendRule: 'Sem conta Swing; conferir fechamento de trades no ciclo vigente',
    payout: '80% inicial; primeiro Reward após 21 dias e seguintes a cada 14 dias, podendo escalar para 90%',
    leverage: 'Varia por plataforma, ativo e contratação',
    riskLevel: 'Médio',
    mainRisk: 'Daily Loss inclui P&L aberto e fechado; reset de Phase 2 reinicia toda a jornada na Phase 1.',
    bestFor: 'Trader que aceita duas fases em troca de 5% diário e 10% total.',
    officialSourceUrl: twoStepRulesUrl,
    sourceLabel: 'FundedNext Stellar 2-Step rules',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    dataCompleteness: 'complete',
    evidenceStatus: 'verified',
    officialSources: [
      { label: 'Stellar 2-Step rules', url: twoStepRulesUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
      { label: 'Stellar 2-Step targets', url: twoStepTargetUrl, kind: 'official_website', precedence: 2, lastAccessedAt: reviewedAt },
      ...sharedSources,
    ],
    conflicts: [],
    monitorability,
    prohibitedPractices,
    notes: ['EA e indicadores são permitidos dentro dos parâmetros.', 'Reset na Fase 2 retorna à Fase 1.'],
    tradingObjectives: ['Atingir 8% e depois 5%.', 'Completar cinco dias em cada fase.'],
    riskRules: ['Daily Loss de 5%.', 'Maximum Loss de 10%.'],
    attentionRules: ['Tocar o limite causa breach mesmo que o mercado recupere.', 'Copy trading entre pessoas é proibido.'],
    operationalNotes: ['Primeiro ciclo funded de 21 dias.', 'Taxa reembolsável pode ser solicitada no primeiro Reward.'],
    criticalRules: ['Metas 8%/5%', 'Daily Loss 5%', 'Max Loss 10%', 'Cinco dias por fase'],
  },
];
