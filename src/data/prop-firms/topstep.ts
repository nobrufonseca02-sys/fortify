import type { OfficialRuleSource, PropFirmRuleProgram } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const parametersUrl = 'https://help.topstep.com/en/articles/8284197-trading-combine-parameters';
const maxLossUrl = 'https://help.topstep.com/en/articles/8284204-what-is-the-maximum-loss-limit';
const consistencyUrl = 'https://help.topstep.com/en/articles/8284208-consistency-at-topstep';
const payoutUrl = 'https://help.topstep.com/en/articles/8284233-topstep-payout-policy';
const prohibitedUrl = 'https://help.topstep.com/en/articles/10305426-prohibited-trading-strategies-at-topstep';

const officialSources: OfficialRuleSource[] = [
  { label: 'Topstep Trading Combine Parameters', url: parametersUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
  { label: 'Topstep Maximum Loss Limit', url: maxLossUrl, kind: 'official_website', precedence: 2, lastAccessedAt: reviewedAt },
  { label: 'Topstep Consistency', url: consistencyUrl, kind: 'official_website', precedence: 3, lastAccessedAt: reviewedAt },
  { label: 'Topstep Payout Policy', url: payoutUrl, kind: 'official_terms', precedence: 4, lastAccessedAt: reviewedAt },
  { label: 'Topstep Prohibited Strategies', url: prohibitedUrl, kind: 'official_terms', precedence: 5, lastAccessedAt: reviewedAt },
];

export const topstepPrograms: PropFirmRuleProgram[] = [
  {
    id: 'topstep-trading-combine-2026',
    firm: 'Topstep',
    firmSlug: 'topstep',
    programName: 'Trading Combine',
    programType: 'EOD',
    market: 'Futures',
    platforms: ['TopstepX', 'Plataformas suportadas pela Topstep'],
    accountSizes: ['$50K', '$100K', '$150K'],
    accountSizeRows: [
      { label: '$50K', profitTarget: '$3,000', dailyLoss: 'Opcional: $1,000', maxLoss: '$2,000 EOD trailing', maxContracts: '5 / 50 micros' },
      { label: '$100K', profitTarget: '$6,000', dailyLoss: 'Opcional: $2,000', maxLoss: '$3,000 EOD trailing', maxContracts: '10 / 100 micros' },
      { label: '$150K', profitTarget: '$9,000', dailyLoss: 'Opcional: $3,000', maxLoss: '$4,500 EOD trailing', maxContracts: '15 / 150 micros' },
    ],
    profitTarget: '$3,000 / $6,000 / $9,000',
    dailyLoss: 'Opcional no Combine; atingir pausa a sessão, não reprova',
    maxLoss: '$2,000 / $3,000 / $4,500',
    drawdownType: 'EOD',
    trailingDescription: 'MLL sobe pelo saldo de fim do dia, nunca desce e trava no saldo inicial.',
    minTradingDays: 'Mínimo prático de 2 dias por causa da consistência de 50%',
    consistencyRule: 'Melhor dia até 50% do Profit Target; exceder aumenta a meta necessária',
    newsRule: 'Permitido dentro dos horários dos produtos, sujeito às regras de conduta e risco',
    weekendRule: 'Seguir os horários oficiais dos produtos; posição fora do horário permitido não é suportada',
    payout: 'XFA: 90/10; Standard exige 5 dias de $150+, Consistency exige 3 dias e 40%',
    leverage: 'Limite de contratos por tamanho',
    riskLevel: 'Alto',
    mainRisk: 'O MLL é monitorado em tempo real com P&L não realizado, apesar de atualizar pelo EOD.',
    bestFor: 'Trader de futuros que aceita trailing EOD e quer caminho Trading Combine → XFA → Live.',
    officialSourceUrl: parametersUrl,
    sourceLabel: 'Topstep Trading Combine Parameters',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    dataCompleteness: 'complete',
    evidenceStatus: 'verified',
    officialSources,
    conflicts: [],
    monitorability: {
      automatic_mt5: [],
      manual_check: ['Profit Target', 'MLL EOD', 'Consistência', 'DLL opcional', 'Contratos', 'Payout XFA'],
      not_supported_yet: ['Integração TopstepX', 'Monitoramento automático de contas futures Topstep'],
    },
    prohibitedPractices: [
      'Account stacking com risco agressivo repetido entre contas.',
      'Esgotar intencionalmente uma Live Funded Account.',
      'Manipular o ambiente com software, IA, ultra alta velocidade ou entrada em massa.',
      'Operar contra os termos de uso e regras do programa.',
    ],
    notes: ['O DLL é opcional e funciona como pausa de sessão.', 'Após payout da XFA, o MLL trava em zero.'],
    tradingObjectives: ['Atingir a meta do tamanho.', 'Manter o melhor dia dentro de 50% da meta.'],
    riskRules: ['Não tocar o MLL.', 'Respeitar o máximo de contratos.', 'DLL opcional pode liquidar e pausar a sessão.'],
    attentionRules: ['P&L não realizado conta para o MLL.', 'A regra de payout muda entre XFA Standard e Consistency.'],
    operationalNotes: ['O dia de trading vai de 17:00 a 15:10 CT.', 'Lucro do Combine não transfere para XFA.'],
    criticalRules: ['MLL EOD', 'Consistência 50%', 'Contratos', 'Payout XFA'],
  },
];
