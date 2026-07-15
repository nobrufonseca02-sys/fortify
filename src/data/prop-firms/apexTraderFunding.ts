import type { OfficialRuleSource, PropFirmRuleProgram } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const eodUrl = 'https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-evaluations/';
const intradayUrl = 'https://apextraderfunding.com/help-center/evaluation-accounts-ea/intraday-trailing-drawdown-evaluations/';
const prohibitedUrl = 'https://apextraderfunding.com/help-center/getting-started/prohibited-activities/';
const eodPaUrl = 'https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-performance-accounts-pa/';
const intradayPayoutUrl = 'https://apextraderfunding.com/help-center/uncategorized/intraday-trailing-drawdown-payouts/';
const inactivityUrl = 'https://apextraderfunding.com/help-center/billing/inactivity-policy-on-performance-accounts-pa/';

const officialSources: OfficialRuleSource[] = [
  { label: 'Apex Prohibited Activities', url: prohibitedUrl, kind: 'official_terms', precedence: 2, lastAccessedAt: reviewedAt },
  { label: 'Apex PA inactivity policy', url: inactivityUrl, kind: 'official_terms', precedence: 3, lastAccessedAt: reviewedAt },
];

const accountSizes = ['$25K', '$50K', '$100K', '$150K'];
const targets = ['$1,500', '$3,000', '$6,000', '$9,000'];
const drawdowns = ['$1,000', '$2,000', '$3,000', '$4,000'];
const contracts = ['4 / 40 micros', '6 / 60 micros', '8 / 80 micros', '12 / 120 micros'];
const prohibitedPractices = [
  'Compartilhar conta, dispositivo, pagamento ou copiar trades com terceiros.',
  'Manipular o ambiente simulado, usar HFT ou explorar latência e falhas de execução.',
  'Usar o limite de drawdown como stop loss ou adotar risco incompatível com negociação real.',
  'Hedge não direcional, brackets opostos e apostas em notícias sem estratégia direcional normal.',
  'Automação, algoritmos ou execução que retire a decisão e o controle do trader.',
];

function rows(dailyLoss: string[]) {
  return accountSizes.map((size, index) => ({
    label: size,
    profitTarget: targets[index],
    dailyLoss: dailyLoss[index],
    maxLoss: drawdowns[index],
    maxContracts: contracts[index],
  }));
}

const monitorability = {
  automatic_mt5: [] as string[],
  manual_check: ['Profit Target', 'Drawdown', 'Daily Loss Limit', 'Contratos', 'Consistência e dias para payout', 'Inatividade da PA'],
  not_supported_yet: ['Integração automática Rithmic', 'Integração automática Tradovate', 'Integração automática WealthCharts'],
};

export const apexTraderFundingPrograms: PropFirmRuleProgram[] = [
  {
    id: 'apex-eod-evaluation-2026',
    firm: 'Apex Trader Funding',
    firmSlug: 'apex-trader-funding',
    programName: 'EOD Trailing Drawdown Evaluation',
    programType: 'EOD',
    market: 'Futures',
    platforms: ['Rithmic', 'Tradovate', 'WealthCharts'],
    accountSizes,
    accountSizeRows: rows(['$500', '$1,000', '$1,500', '$2,000']),
    profitTarget: '$1,500 / $3,000 / $6,000 / $9,000',
    dailyLoss: '$500 / $1,000 / $1,500 / $2,000',
    maxLoss: '$1,000 / $2,000 / $3,000 / $4,000',
    drawdownType: 'EOD',
    trailingDescription: 'Calculado no fechamento; o novo limite é aplicado intraday na sessão seguinte e só sobe.',
    minTradingDays: 'Sem mínimo; pode aprovar em um dia dentro do acesso de 30 dias',
    consistencyRule: 'Sem consistência na avaliação; PA usa critérios próprios de payout',
    newsRule: 'Permitido como parte de estratégia normal; apostar, perseguir preço ou usar brackets opostos é proibido',
    weekendRule: 'Posições devem respeitar o fechamento do mercado e as regras de conduta Apex',
    payout: 'PA: 100% conforme página EOD; elegibilidade e limites dependem da modalidade vigente',
    leverage: 'Limite por contratos, sem alavancagem percentual publicada',
    riskLevel: 'Alto',
    mainRisk: 'O DLL pausa a sessão, mas tocar o EOD Trailing Drawdown reprova a avaliação.',
    bestFor: 'Trader de futuros que prefere drawdown recalculado no fechamento, com limite diário explícito.',
    officialSourceUrl: eodUrl,
    sourceLabel: 'Apex EOD Evaluations',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'partial',
    dataCompleteness: 'partial',
    evidenceStatus: 'verified',
    officialSources: [
      { label: 'Apex EOD Evaluations', url: eodUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
      { label: 'Apex EOD Performance Accounts', url: eodPaUrl, kind: 'official_website', precedence: 2, lastAccessedAt: reviewedAt },
      ...officialSources,
    ],
    conflicts: [],
    monitorability,
    prohibitedPractices,
    notes: ['Atingir o DLL fecha posições e pausa até a próxima sessão, sem reprovar.', 'A PA exige dois dias com pelo menos $50 de lucro em cada janela móvel de 30 dias.'],
    tradingObjectives: ['Atingir a meta do tamanho contratado.', 'Não tocar o EOD threshold em nenhum momento.'],
    riskRules: ['DLL por tamanho.', 'EOD Trailing Drawdown por tamanho.', 'Máximo de contratos por tamanho.'],
    attentionRules: ['Tradovate e Rithmic/WealthCharts podem divergir no ponto em que o trailing para.', 'Ativar a PA em até sete dias após aprovação.'],
    operationalNotes: ['Acesso de avaliação por 30 dias.', 'Não há consistência nem scaling na avaliação.'],
    criticalRules: ['EOD threshold', 'Daily Loss Limit', 'Máximo de contratos', 'Ativação PA'],
  },
  {
    id: 'apex-intraday-evaluation-2026',
    firm: 'Apex Trader Funding',
    firmSlug: 'apex-trader-funding',
    programName: 'Intraday Trailing Drawdown Evaluation',
    programType: 'Intraday',
    market: 'Futures',
    platforms: ['Rithmic', 'Tradovate', 'WealthCharts'],
    accountSizes,
    accountSizeRows: rows(['Não possui', 'Não possui', 'Não possui', 'Não possui']),
    profitTarget: '$1,500 / $3,000 / $6,000 / $9,000',
    dailyLoss: 'Não possui na avaliação',
    maxLoss: '$1,000 / $2,000 / $3,000 / $4,000',
    drawdownType: 'Intraday',
    trailingDescription: 'Acompanha em tempo real o pico do saldo, inclusive lucro não realizado; nunca recua nem reseta.',
    minTradingDays: 'Sem mínimo; pode aprovar em um dia dentro do acesso de 30 dias',
    consistencyRule: 'Sem consistência na avaliação; payout da PA exige consistência inferior a 50%',
    newsRule: 'Permitido como estratégia normal; manipulação, apostas e brackets não direcionais são proibidos',
    weekendRule: 'Posições devem respeitar o fechamento do mercado e as regras de conduta Apex',
    payout: 'PA Intraday: 5 dias qualificados, consistência <50%, mínimo $500 e até 6 payouts',
    leverage: 'Limite por contratos, sem alavancagem percentual publicada',
    riskLevel: 'Alto',
    mainRisk: 'Lucro flutuante eleva imediatamente o trailing e pode reduzir a folga antes do fechamento.',
    bestFor: 'Trader de futuros que entende trailing em tempo real e controla lucro aberto.',
    officialSourceUrl: intradayUrl,
    sourceLabel: 'Apex Intraday Trailing Drawdown Evaluations',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    dataCompleteness: 'complete',
    evidenceStatus: 'verified',
    officialSources: [
      { label: 'Apex Intraday Evaluations', url: intradayUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
      { label: 'Apex Intraday PA Payouts', url: intradayPayoutUrl, kind: 'official_website', precedence: 2, lastAccessedAt: reviewedAt },
      ...officialSources,
    ],
    conflicts: [],
    monitorability,
    prohibitedPractices,
    notes: ['O trailing usa lucro realizado e não realizado.', 'Safety Net da PA é drawdown + $100 e permanece durante toda a conta.'],
    tradingObjectives: ['Atingir a meta sem tocar o trailing intraday.', 'Respeitar o máximo de contratos.'],
    riskRules: ['Sem DLL na avaliação.', 'Trailing em tempo real pelo pico de balance/equity.'],
    attentionRules: ['O trailing não desce quando o lucro aberto é devolvido.', 'Payout da PA exige cinco dias com lucro mínimo específico por tamanho.'],
    operationalNotes: ['Acesso por 30 dias.', 'Ativação da PA em até sete dias.'],
    criticalRules: ['Intraday trailing', 'Lucro não realizado', 'Máximo de contratos', 'Safety Net PA'],
  },
];
