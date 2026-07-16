import type { PropFirmRuleProgram } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const unavailable = 'Indisponível em fonte oficial vigente';
const officialUrl = 'https://myfundedfx.com/';
const closureUrl = 'https://seacrestmarkets.io/closed';

export const myFundedFxPrograms: PropFirmRuleProgram[] = [
  {
    id: 'myfundedfx-official-catalog-unavailable-2026',
    firm: 'MyFundedFX',
    firmSlug: 'myfundedfx',
    programName: 'Operação encerrada - catálogo indisponível',
    programType: 'Funded/PA',
    market: 'CFD/Forex',
    platforms: [unavailable],
    accountSizes: [unavailable],
    accountSizeRows: [{ label: unavailable, profitTarget: unavailable, dailyLoss: unavailable, maxLoss: unavailable }],
    profitTarget: unavailable,
    dailyLoss: unavailable,
    maxLoss: unavailable,
    drawdownType: 'Static',
    trailingDescription: unavailable,
    minTradingDays: unavailable,
    consistencyRule: unavailable,
    newsRule: unavailable,
    weekendRule: unavailable,
    payout: unavailable,
    leverage: unavailable,
    riskLevel: 'Alto',
    mainRisk: 'O domínio oficial redireciona para aviso de encerramento; não existe regra vigente auditável para publicação.',
    bestFor: 'Consulta histórica de status; não usar para configurar ou comparar uma conta operacional.',
    officialSourceUrl: officialUrl,
    sourceLabel: 'MyFundedFX official domain closure notice',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'partial',
    dataCompleteness: 'partial',
    evidenceStatus: 'official_source_unavailable',
    officialSources: [
      { label: 'MyFundedFX official domain', url: officialUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
      { label: 'Seacrest Markets closure notice', url: closureUrl, kind: 'official_terms', precedence: 2, lastAccessedAt: reviewedAt },
    ],
    conflicts: [],
    monitorability: {
      automatic_mt5: [],
      manual_check: ['Confirmar eventual comunicação oficial futura sobre encerramento ou sucessão'],
      not_supported_yet: ['Todos os limites operacionais; não há catálogo oficial vigente'],
    },
    prohibitedPractices: [unavailable],
    notes: ['Não foram usadas reviews, arquivos afiliados nem cópias históricas não oficiais.', 'O aviso oficial informa que a Seacrest Markets não está mais operando.'],
    tradingObjectives: [unavailable],
    riskRules: [unavailable],
    attentionRules: ['Não aplicar parâmetros históricos a contas atuais.', unavailable],
    operationalNotes: ['Ficha publicada apenas para explicitar o estado da fonte oficial.'],
    criticalRules: ['Operação encerrada', unavailable],
  },
];
