import type {
  OfficialRuleSource,
  PropFirmRuleProgram,
  RuleConflict,
} from '../propFirmRules';

type NPPlatform = 'BlackArrow' | 'MT5';

interface NPPlan {
  name: string;
  size: string;
  profitTarget: string;
  dailyLoss: string;
  maxLoss: string;
  contracts: string;
  positiveDayMinimum: string;
  flashFirstTarget: string;
  flashNextTarget: string;
}

const reviewedAt = '2026-07-15';
const regulationUrl = 'https://npfuture.com/regulamento/';
const websiteUrl = 'https://npfuture.com/';

const officialSources: OfficialRuleSource[] = [
  {
    label: 'Regulamento NPFuture',
    url: regulationUrl,
    kind: 'official_regulation',
    precedence: 1,
    lastAccessedAt: reviewedAt,
  },
  {
    label: 'Apresentação comercial NPFuture',
    url: websiteUrl,
    kind: 'official_website',
    precedence: 2,
    lastAccessedAt: reviewedAt,
  },
];

const plans: NPPlan[] = [
  {
    name: 'Bollinger',
    size: '$25K',
    profitTarget: '$1,500',
    dailyLoss: '$600',
    maxLoss: '$1,000',
    contracts: '1 Mini / 10 Micros',
    positiveDayMinimum: '$100',
    flashFirstTarget: '$2,000',
    flashNextTarget: '$2,000',
  },
  {
    name: 'Dow',
    size: '$50K',
    profitTarget: '$3,000',
    dailyLoss: '$1,200',
    maxLoss: '$2,000',
    contracts: '4 Mini / 40 Micros',
    positiveDayMinimum: '$150',
    flashFirstTarget: '$3,000',
    flashNextTarget: '$2,500',
  },
  {
    name: 'Wyckoff',
    size: '$100K',
    profitTarget: '$6,000',
    dailyLoss: '$1,800',
    maxLoss: '$3,000',
    contracts: '6 Mini / 60 Micros',
    positiveDayMinimum: '$250',
    flashFirstTarget: '$6,000',
    flashNextTarget: '$4,000',
  },
  {
    name: 'Elliot',
    size: '$150K',
    profitTarget: '$9,000',
    dailyLoss: '$2,700',
    maxLoss: '$4,500',
    contracts: '8 Mini / 80 Micros',
    positiveDayMinimum: '$350',
    flashFirstTarget: '$9,000',
    flashNextTarget: '$5,000',
  },
  {
    name: 'Fibonacci',
    size: '$200K',
    profitTarget: '$12,000',
    dailyLoss: '$3,600',
    maxLoss: '$6,000',
    contracts: '10 Mini / 100 Micros',
    positiveDayMinimum: '$500',
    flashFirstTarget: '$12,000',
    flashNextTarget: '$7,000',
  },
];

const accountSizes = plans.map((plan) => plan.size);

const dailyLossConflict: RuleConflict = {
  field: 'dailyLoss.200K',
  summary: 'A apresentação comercial informa $3,500; o regulamento oficial informa $3,600 para o plano 200K.',
  preferredValue: '$3,600',
  resolution: 'O regulamento possui precedência e foi adotado no dataset.',
  sourceUrls: [regulationUrl, websiteUrl],
};

const standardDrawdownConflict: RuleConflict = {
  field: 'drawdownType',
  summary: 'A apresentação chama o drawdown Standard de EOD; o regulamento afirma que a avaliação não usa o EOD com trava em saldo inicial + $100.',
  preferredValue: 'Max Loss da avaliação, sem trava EOD de saldo inicial + $100',
  resolution: 'O regulamento possui precedência; o instante exato de medição do Max Loss deve ser confirmado antes da automação definitiva.',
  sourceUrls: [regulationUrl, websiteUrl],
};

const platformLabel = (platform: NPPlatform) => (platform === 'BlackArrow' ? 'BlackArrow' : 'MT5');
const platformMarket = (platform: NPPlatform) => (platform === 'BlackArrow' ? 'Futures' as const : 'CFD/Forex' as const);
const weekendRule = (platform: NPPlatform) =>
  platform === 'BlackArrow'
    ? 'Swing trade não permitido na apresentação comercial oficial'
    : 'Swing trade permitido na apresentação comercial oficial';
const leverageRule = (platform: NPPlatform) =>
  platform === 'BlackArrow' ? 'Limite de contratos por plano' : 'Margem 1:30 na apresentação comercial oficial';

function standardProgram(platform: NPPlatform): PropFirmRuleProgram {
  const label = platformLabel(platform);

  return {
    id: `npfuture-standard-${platform.toLowerCase()}`,
    firm: 'NP Future',
    programName: `Standard - ${label}`,
    programType: '1-Step',
    market: platformMarket(platform),
    platforms: [label],
    accountSizes,
    accountSizeRows: plans.map((plan) => ({
      label: `${plan.name} ${plan.size}`,
      profitTarget: plan.profitTarget,
      dailyLoss: plan.dailyLoss,
      maxLoss: plan.maxLoss,
      maxContracts: platform === 'BlackArrow' ? plan.contracts : undefined,
      notes: platform === 'MT5' ? 'Margem 1:30; swing trade permitido na apresentação comercial oficial.' : 'Swing trade não permitido.',
    })),
    profitTarget: '$1,500 / $3,000 / $6,000 / $9,000 / $12,000',
    dailyLoss: '$600 / $1,200 / $1,800 / $2,700 / $3,600',
    maxLoss: '$1,000 / $2,000 / $3,000 / $4,500 / $6,000',
    drawdownType: 'Static',
    trailingDescription: 'A avaliação usa Max Loss por plano e não usa a trava EOD de saldo inicial + $100 aplicada à Funded.',
    minTradingDays: '2 dias; operações válidas devem permanecer abertas por pelo menos 30 segundos',
    consistencyRule: 'Maior dia de lucro até 50% do lucro total acumulado',
    newsRule: 'Permitido, sem abuso de latência, HFT ou exploração de spread/liquidez',
    weekendRule: weekendRule(platform),
    payout: 'Não possui na avaliação; aprovação libera Funded sem taxa de ativação',
    leverage: leverageRule(platform),
    riskLevel: 'Alto',
    mainRisk: 'DD diário, Max Loss, consistência de 50%, prazo de 60 dias e tempo mínimo de 30 segundos.',
    bestFor: `Trader de ${platform === 'BlackArrow' ? 'futuros' : 'Forex/CFD'} que aceita avaliação com limites fixos por tamanho.`,
    officialSourceUrl: regulationUrl,
    sourceLabel: 'Regulamento NPFuture - Regras Standard',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'partial',
    officialSources,
    conflicts: [dailyLossConflict, standardDrawdownConflict],
    monitorability: {
      automatic_mt5: platform === 'MT5'
        ? ['Meta por plano', 'DD diário', 'Max Loss', 'Consistência de 50%', 'Dias mínimos', 'Tempo mínimo de 30 segundos', 'Inatividade de 30 dias']
        : [],
      manual_check: [
        'Regras de ativos e plataforma',
        'Consistência de lote',
        'Condutas abusivas em notícias',
        platform === 'BlackArrow' ? 'Todos os limites dependem de integração futura com BlackArrow' : 'Interpretação final do instante de medição do Max Loss',
      ],
      not_supported_yet: platform === 'BlackArrow' ? ['Monitoramento automático BlackArrow'] : ['Calendário e detecção de abuso em notícias'],
    },
    notes: [
      'O regulamento prevalece sobre a apresentação comercial.',
      'No plano 200K, foi adotado DD diário de $3,600; a página comercial ainda mostra $3,500.',
      'A conta reprova após 30 dias corridos sem abrir operação.',
    ],
    tradingObjectives: ['Atingir a meta do plano em até 60 dias.', 'Cumprir dois dias mínimos e consistência máxima de 50%.'],
    riskRules: ['DD diário por plano.', 'Max Loss por plano.', 'Operações com menos de 30 segundos podem ser desconsideradas.'],
    attentionRules: [
      'Conflito 200K: regulamento $3,600 versus apresentação $3,500; usar $3,600.',
      'A automação do Max Loss exige confirmar a base temporal exata da avaliação Standard.',
    ],
    operationalNotes: [weekendRule(platform), leverageRule(platform), 'Notícias são permitidas, mas estratégias exploratórias são proibidas.'],
    criticalRules: ['DD diário', 'Max Loss', 'Consistência 50%', 'Prazo 60 dias', 'Tempo mínimo 30 segundos'],
  };
}

function fundedProgram(platform: NPPlatform): PropFirmRuleProgram {
  const label = platformLabel(platform);

  return {
    id: `npfuture-funded-${platform.toLowerCase()}`,
    firm: 'NP Future',
    programName: `Funded - ${label}`,
    programType: 'Funded/PA',
    market: platformMarket(platform),
    platforms: [label],
    accountSizes,
    accountSizeRows: plans.map((plan) => ({
      label: `${plan.name} ${plan.size}`,
      profitTarget: `5 dias positivos; mínimo ${plan.positiveDayMinimum}/dia`,
      dailyLoss: 'Não possui',
      maxLoss: plan.maxLoss,
      maxContracts: platform === 'BlackArrow' ? plan.contracts : undefined,
      notes: platform === 'MT5' ? 'Margem 1:30 na apresentação comercial oficial.' : 'Limite de contratos da apresentação comercial oficial.',
    })),
    profitTarget: 'Sem meta de aprovação; critérios de payout variam por plano',
    dailyLoss: 'Não possui',
    maxLoss: '$1,000 / $2,000 / $3,000 / $4,500 / $6,000',
    drawdownType: 'EOD',
    trailingDescription: 'EOD móvel pelo maior fechamento diário; trava definitivamente em saldo inicial + $100.',
    minTradingDays: '5 dias positivos por ciclo, com lucro mínimo diário por plano',
    consistencyRule: 'Maior dia até 30% do lucro considerado na solicitação',
    newsRule: 'Permitido, sem abuso de latência, HFT ou exploração de spread/liquidez',
    weekendRule: weekendRule(platform),
    payout: 'Até 50% do lucro elegível; split 80/20 nos 2 primeiros e 90/10 a partir do 3º',
    leverage: leverageRule(platform),
    riskLevel: 'Alto',
    mainRisk: 'EOD móvel não diminui, permanece após payout e pode deixar pouca margem até a trava.',
    bestFor: `Trader aprovado no Standard que monitora o EOD de fechamento em ${label}.`,
    officialSourceUrl: regulationUrl,
    sourceLabel: 'Regulamento NPFuture - Regras Funded',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    officialSources,
    conflicts: [],
    monitorability: {
      automatic_mt5: platform === 'MT5'
        ? ['EOD móvel e trava', 'Max Loss', 'Cinco dias positivos', 'Lucro mínimo diário', 'Consistência de 30%', 'Inatividade de 30 dias']
        : [],
      manual_check: ['Elegibilidade e teto de payout', 'KYC/compliance', 'Consistência de lote', 'Condutas abusivas em notícias'],
      not_supported_yet: platform === 'BlackArrow' ? ['Monitoramento automático BlackArrow'] : ['Aprovação de payout pela NPFuture'],
    },
    notes: [
      'A conta Funded não possui DD diário.',
      'O EOD não reduz após payout; o saldo remanescente precisa continuar acima do limite.',
      'Não há taxa de ativação nem colchão obrigatório.',
    ],
    tradingObjectives: ['Completar cinco dias positivos válidos.', 'Manter consistência de 30% para payout.'],
    riskRules: ['Max Loss por plano.', 'EOD móvel pelo maior fechamento e trava em saldo inicial + $100.'],
    attentionRules: ['Payout reduz saldo, mas não reduz o EOD.', 'Lucro mínimo por dia positivo varia de $100 a $500.'],
    operationalNotes: [weekendRule(platform), leverageRule(platform), 'Ciclo de dias e consistência reinicia após payout.'],
    criticalRules: ['EOD móvel', 'Trava do EOD', 'Consistência 30%', 'Cinco dias positivos', 'Payout'],
  };
}

function flashProgram(platform: NPPlatform): PropFirmRuleProgram {
  const label = platformLabel(platform);

  return {
    id: `npfuture-flash-${platform.toLowerCase()}`,
    firm: 'NP Future',
    programName: `Flash - ${label}`,
    programType: 'Instant',
    market: platformMarket(platform),
    platforms: [label],
    accountSizes,
    accountSizeRows: plans.map((plan) => ({
      label: `${plan.name} ${plan.size}`,
      profitTarget: `${plan.flashFirstTarget} no 1º payout; ${plan.flashNextTarget} nos seguintes`,
      dailyLoss: plan.dailyLoss,
      maxLoss: plan.maxLoss,
      maxContracts: platform === 'BlackArrow' ? plan.contracts : undefined,
      notes: platform === 'MT5' ? 'Margem 1:30; swing trade permitido na apresentação comercial oficial.' : 'Swing trade não permitido.',
    })),
    profitTarget: '$2,000 / $3,000 / $6,000 / $9,000 / $12,000 no 1º payout',
    dailyLoss: '$600 / $1,200 / $1,800 / $2,700 / $3,600',
    maxLoss: '$1,000 / $2,000 / $3,000 / $4,500 / $6,000',
    drawdownType: 'EOD',
    trailingDescription: 'EOD móvel pelo maior fechamento diário; trava definitivamente em saldo inicial + $100.',
    minTradingDays: '5 dias por ciclo; sem lucro mínimo diário',
    consistencyRule: 'Maior dia até 20% do lucro total do ciclo',
    newsRule: 'Permitido, sem abuso de latência, HFT ou exploração de spread/liquidez',
    weekendRule: weekendRule(platform),
    payout: 'Meta e teto por ciclo; split 80/20 nos 2 primeiros e 90/10 a partir do 3º',
    leverage: leverageRule(platform),
    riskLevel: 'Alto',
    mainRisk: 'DD diário fixo coexistindo com EOD móvel; prevalece o limite que estiver mais próximo.',
    bestFor: `Trader experiente que busca acesso direto em ${label} e controla ciclos de payout separados.`,
    officialSourceUrl: regulationUrl,
    sourceLabel: 'Regulamento NPFuture - Regras Flash',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    officialSources,
    conflicts: [dailyLossConflict],
    monitorability: {
      automatic_mt5: platform === 'MT5'
        ? ['DD diário', 'EOD móvel e trava', 'Max Loss', 'Meta de payout', 'Cinco dias operados', 'Consistência de 20%', 'Margem pós-payout']
        : [],
      manual_check: ['Teto e aprovação de payout', 'KYC/compliance', 'Consistência de lote', 'Condutas abusivas em notícias'],
      not_supported_yet: platform === 'BlackArrow' ? ['Monitoramento automático BlackArrow'] : ['Aprovação de payout pela NPFuture'],
    },
    notes: [
      'O regulamento prevalece sobre a apresentação comercial.',
      'No plano 200K, foi adotado DD diário de $3,600; a página comercial ainda mostra $3,500.',
      'A margem real após payout deve ser pelo menos igual ao DD diário.',
    ],
    tradingObjectives: ['Atingir a meta de payout do ciclo.', 'Completar cinco dias e manter consistência de 20%.'],
    riskRules: ['DD diário fixo por plano.', 'EOD móvel e trava em saldo inicial + $100.', 'Max Loss por plano.'],
    attentionRules: [
      'Conflito 200K: regulamento $3,600 versus apresentação $3,500; usar $3,600.',
      'Quando a distância até o EOD for menor que o DD diário, o EOD prevalece.',
    ],
    operationalNotes: [weekendRule(platform), leverageRule(platform), 'O ciclo reinicia após cada payout aprovado.'],
    criticalRules: ['DD diário', 'EOD móvel', 'Trava do EOD', 'Consistência 20%', 'Margem pós-payout'],
  };
}

export const npFuturePrograms: PropFirmRuleProgram[] = [
  standardProgram('BlackArrow'),
  standardProgram('MT5'),
  fundedProgram('BlackArrow'),
  fundedProgram('MT5'),
  flashProgram('BlackArrow'),
  flashProgram('MT5'),
];
