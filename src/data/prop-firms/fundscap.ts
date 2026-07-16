import type { PropFirmRuleProgram } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const unavailable = 'Indisponível em fonte oficial vigente';
const officialUrl = 'https://fundscap.com/';
const migrationUrl = 'https://fundscapmarkets.com/migration';
const termsUrl = 'https://fundscapmarkets.com/legal/terms';

export const fundscapPrograms: PropFirmRuleProgram[] = [
  {
    id: 'fundscap-prop-catalog-unavailable-2026',
    firm: 'Fundscap',
    firmSlug: 'fundscap',
    programName: 'Programas prop - catálogo público indisponível',
    programType: 'Funded/PA',
    market: 'CFD/Forex',
    platforms: ['Webtrader próprio após migração; parâmetros prop indisponíveis'],
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
    mainRisk: 'A página oficial confirma migração de contas funded, mas não publica um rulebook vigente por programa.',
    bestFor: 'Consulta de status da cobertura; não usar para configurar limites de uma conta Fundscap.',
    officialSourceUrl: migrationUrl,
    sourceLabel: 'FundsCap official migration notice',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'partial',
    dataCompleteness: 'partial',
    evidenceStatus: 'official_source_unavailable',
    officialSources: [
      { label: 'FundsCap canonical domain', url: officialUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
      { label: 'FundsCap migration notice', url: migrationUrl, kind: 'official_website', precedence: 2, lastAccessedAt: reviewedAt },
      { label: 'FundsCap current Terms of Use', url: termsUrl, kind: 'official_terms', precedence: 3, lastAccessedAt: reviewedAt },
    ],
    conflicts: [],
    monitorability: {
      automatic_mt5: [],
      manual_check: ['Solicitar rulebook vigente à mesa e validar o programa contratado'],
      not_supported_yet: ['Webtrader próprio', 'Todos os parâmetros prop sem catálogo público vigente'],
    },
    prohibitedPractices: [
      'Termos gerais proíbem fraude, manipulação, latency arbitrage, toxic flow e abusive hedging.',
      'Termos gerais proíbem multi-account abuse, automação não autorizada e excessive scalping.',
      'Aplicação por programa: indisponível em fonte oficial vigente.',
    ],
    notes: ['A migração oficial afirma que regras existentes foram preservadas, mas não as enumera.', 'O site atual publica contas de corretagem, não um catálogo auditável de challenges.', 'Programa PRIME baseado em depósito e torneio Arena foram excluídos do dataset prop.'],
    tradingObjectives: [unavailable],
    riskRules: [unavailable],
    attentionRules: ['Não importar parâmetros antigos sem rulebook oficial atual.', unavailable],
    operationalNotes: ['Ficha publicada apenas para explicitar a lacuna oficial durante a migração.'],
    criticalRules: ['Catálogo prop não publicado', unavailable],
  },
];
