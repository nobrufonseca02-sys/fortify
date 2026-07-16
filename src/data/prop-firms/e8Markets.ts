import type {
  EvidenceCompleteness,
  EvidenceConfidence,
  OfficialRuleSource,
  PropFirmRuleProgram,
  RuleConflict,
  RuleMonitorability,
} from '../propFirmRules';

const reviewedAt = '2026-07-15';
const overviewUrl = 'https://help.e8markets.com/en/articles/13106558-all-product-overviews-e8-one-vs-e8-zero-vs-e8-pro-vs-e8-signature';
const oneUrl = 'https://help.e8markets.com/en/articles/11775980-e8-one';
const oneCryptoUrl = 'https://help.e8markets.com/en/articles/13429922-e8-one-crypto';
const proUrl = 'https://help.e8markets.com/en/articles/15274219-e8-pro-forex';
const proCryptoUrl = 'https://help.e8markets.com/en/articles/15323777-e8-pro-crypto';
const signatureUrl = 'https://help.e8markets.com/en/articles/11755943-e8-signature-forex';
const signatureCryptoUrl = 'https://help.e8markets.com/en/articles/11864571-e8-signature-crypto';
const signatureFuturesUrl = 'https://helpfutures.e8markets.com/en/articles/11864618-e8-signature-futures';
const zeroFuturesUrl = 'https://helpfutures.e8markets.com/en/articles/15935817-e8-zero-starter-and-max';
const platformsUrl = 'https://help.e8markets.com/en/articles/9799834-available-trading-platforms';
const futuresPlatformsUrl = 'https://helpfutures.e8markets.com/en/articles/10207237-available-trading-platforms';
const policiesUrl = 'https://help.e8markets.com/en/articles/6929927-trading-policies-and-prohibited-trading-strategies';
const futuresPoliciesUrl = 'https://helpfutures.e8markets.com/en/articles/10209270-trading-policies-and-prohibited-trading-strategies';
const countriesUrl = 'https://help.e8markets.com/en/articles/5514278-accepted-countries';
const stopLossUrl = 'https://help.e8markets.com/en/articles/9453409-is-there-any-stop-loss-rule';

const sharedSources: OfficialRuleSource[] = [
  { label: 'E8 product overview', url: overviewUrl, kind: 'official_website', precedence: 2, lastAccessedAt: reviewedAt },
  { label: 'E8 trading policies', url: policiesUrl, kind: 'official_terms', precedence: 3, lastAccessedAt: reviewedAt },
  { label: 'E8 accepted countries', url: countriesUrl, kind: 'official_terms', precedence: 4, lastAccessedAt: reviewedAt },
  { label: 'E8 stop-loss rule', url: stopLossUrl, kind: 'official_terms', precedence: 5, lastAccessedAt: reviewedAt },
];

const forexPlatforms = ['TradeLocker', 'MatchTrader', 'cTrader', 'MT5'];
const prohibitedPractices = [
  'All-or-nothing, risco irresponsável ou concentração de todo o daily drawdown em uma ideia.',
  'Hedge entre contas, cooperação, operação por terceiros ou múltiplos perfis.',
  'HFT, exploração de latência/feed, manipulação da simulação ou estratégia não replicável.',
  'EA compartilhado que gere trades idênticos entre usuários; copy só entre contas do mesmo titular.',
];
const futuresProhibited = [
  ...prohibitedPractices,
  'Bots, IA e automação total ou semiautomática; mais de 300 trades por dia.',
  'Contrato fora do Front Month, posição a até 2% do lock limit ou tick scalping abusivo.',
];

const forexMonitorability: RuleMonitorability = {
  automatic_mt5: ['Profit Target', 'Daily Drawdown/Pause', 'Static/Dynamic Drawdown', 'Daily Profit Cap', 'Best Day', 'Inatividade', 'P&L e dias'],
  manual_check: ['Titularidade de copy/EA', 'Notícia por produto', 'KYC e país', 'Payout buffer/cap'],
  not_supported_yet: ['TradeLocker/MatchTrader/cTrader sem conector', 'Detecção entre titulares'],
};
const futuresMonitorability: RuleMonitorability = {
  automatic_mt5: [],
  manual_check: ['Profit Target', 'EOD Drawdown', 'Best Day', 'Contratos', 'Inatividade', 'Payout e horário de fechamento'],
  not_supported_yet: ['Integração Tradovate', 'Validação de Front Month', 'Detecção entre titulares'],
};

type E8ProgramInput = Omit<
  PropFirmRuleProgram,
  | 'firm'
  | 'firmSlug'
  | 'platforms'
  | 'lastReviewedAt'
  | 'confidence'
  | 'completeness'
  | 'dataCompleteness'
  | 'evidenceStatus'
  | 'officialSources'
  | 'conflicts'
  | 'monitorability'
  | 'prohibitedPractices'
> & {
  platforms?: string[];
  confidence?: EvidenceConfidence;
  completeness?: EvidenceCompleteness;
  dataCompleteness?: EvidenceCompleteness;
  officialSources?: OfficialRuleSource[];
  conflicts?: RuleConflict[];
  monitorability?: RuleMonitorability;
  prohibitedPractices?: string[];
};

function source(label: string, url: string, futures = false): OfficialRuleSource[] {
  const platformSource = futures
    ? { label: 'E8 Futures platforms', url: futuresPlatformsUrl, kind: 'official_website' as const, precedence: 4, lastAccessedAt: reviewedAt }
    : { label: 'E8 Forex/Crypto platforms', url: platformsUrl, kind: 'official_website' as const, precedence: 4, lastAccessedAt: reviewedAt };
  return [{ label, url, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt }, ...sharedSources, platformSource];
}

function program(input: E8ProgramInput): PropFirmRuleProgram {
  const {
    platforms = forexPlatforms,
    confidence = 'high',
    completeness = 'complete',
    dataCompleteness = completeness,
    officialSources = sharedSources,
    conflicts = [],
    monitorability = forexMonitorability,
    prohibitedPractices: practices = prohibitedPractices,
    ...details
  } = input;

  return {
    firm: 'E8 Markets',
    firmSlug: 'e8-markets',
    platforms,
    lastReviewedAt: reviewedAt,
    confidence,
    completeness,
    dataCompleteness,
    evidenceStatus: 'verified',
    officialSources,
    conflicts,
    monitorability,
    prohibitedPractices: practices,
    ...details,
  };
}

const oneConflicts: RuleConflict[] = [{
  field: 'dailyLoss/maxLoss',
  summary: 'A página específica do preset E8 One informa 3% daily e 4% dynamic; a FAQ de customização já exibiu preset genérico diferente.',
  preferredValue: '3% daily e 4% dynamic',
  resolution: 'Adotada a página específica e atual do produto; customizações continuam dependentes do checkout.',
  sourceUrls: [oneUrl, 'https://help.e8markets.com/en/articles/8880316-what-is-the-custom-account'],
}];

function oneProgram(crypto: boolean): PropFirmRuleProgram {
  const url = crypto ? oneCryptoUrl : oneUrl;
  return program({
    id: crypto ? 'e8-one-crypto-2026' : 'e8-one-forex-2026',
    market: 'CFD/Forex',
    programName: crypto ? 'E8 One Crypto' : 'E8 One Forex',
    programType: '1-Step',
    accountSizes: ['$5K a $500K; parâmetros podem ser customizados no checkout'],
    accountSizeRows: [{ label: 'Preset', profitTarget: '6%', dailyLoss: '3%', maxLoss: '4% dynamic' }],
    profitTarget: '6%',
    dailyLoss: '3% do saldo inicial',
    maxLoss: '4% dynamic',
    drawdownType: 'Trailing',
    trailingDescription: 'Segue o maior saldo fechado e trava no saldo inicial.',
    minTradingDays: 'Sem mínimo ou máximo; ao menos um trade aberto e fechado a cada 60 dias',
    consistencyRule: 'Sem consistência no challenge; Best Day de 40% no Performance',
    newsRule: 'Challenge permite; Performance proíbe abrir/fechar/SL/TP em ±5 minutos de notícia de alto impacto',
    weekendRule: 'Holding overnight e fim de semana permitido',
    payout: 'On-demand; Best Day 40%; payout líquido maior que 50% do daily drawdown; até 100%',
    leverage: crypto ? 'BTC/ETH 1:5; demais cripto 1:2' : 'Forex 1:30; índices/metais 1:15; crypto 1:1',
    riskLevel: 'Alto',
    mainRisk: 'Dynamic drawdown acompanha lucro fechado e o Performance adiciona Best Day e restrição de notícias.',
    bestFor: crypto ? 'Trader de cripto que aceita drawdown dinâmico e Best Day no payout.' : 'Trader de forex que aceita drawdown dinâmico e Best Day no payout.',
    officialSourceUrl: url,
    sourceLabel: crypto ? 'E8 One Crypto' : 'E8 One',
    confidence: 'medium',
    completeness: 'partial',
    officialSources: source(crypto ? 'E8 One Crypto' : 'E8 One', url),
    conflicts: oneConflicts,
    notes: ['SL e TP não são obrigatórios.', 'Copy trading somente entre contas do mesmo titular.', 'Parâmetros customizados podem alterar o preset.'],
    tradingObjectives: ['Atingir 6% sem violar daily ou dynamic drawdown.'],
    riskRules: ['Daily Drawdown de 3%.', 'Dynamic Drawdown de 4%.'],
    attentionRules: ['Best Day de 40% no Performance.', 'Notícias ±5 no Performance.'],
    operationalNotes: ['Confirmar customizações no checkout.', 'Deixar buffer após payout.'],
    criticalRules: ['Meta 6%', 'Daily 3%', 'Dynamic 4%', 'Best Day 40%', 'News Performance ±5'],
  });
}

function proProgram(crypto: boolean): PropFirmRuleProgram {
  const url = crypto ? proCryptoUrl : proUrl;
  return program({
    id: crypto ? 'e8-pro-crypto-2026' : 'e8-pro-forex-2026',
    market: 'CFD/Forex',
    programName: crypto ? 'E8 Pro Crypto' : 'E8 Pro Forex',
    programType: '1-Step',
    accountSizes: ['Confirmar tamanhos no checkout oficial'],
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '8%', dailyLoss: '2,5%', maxLoss: '8% estático' }],
    profitTarget: '8%',
    dailyLoss: '2,5% do saldo inicial',
    maxLoss: '8% estático',
    drawdownType: 'Static',
    trailingDescription: 'Piso fixo; após o primeiro payout, o loss level move para o saldo inicial.',
    minTradingDays: 'Sem mínimo ou máximo; ao menos um trade aberto e fechado a cada 60 dias',
    consistencyRule: 'Sem consistência; Daily Profit Cap de 2%',
    newsRule: 'Permitido no Challenge e Performance, com risco de slippage',
    weekendRule: 'Holding overnight e fim de semana permitido',
    payout: 'Diário após 1% de lucro; 50% do lucro fica como buffer; split de até 100%',
    leverage: crypto ? 'BTC/ETH 1:5; demais cripto 1:2' : 'Forex 1:30; índices/metais 1:15',
    riskLevel: 'Médio',
    mainRisk: 'Lucro acima do cap diário de 2% é removido no rollover e não conta para meta/payout.',
    bestFor: crypto ? 'Trader de cripto que prefere drawdown estático e payout diário.' : 'Trader de forex que prefere drawdown estático e payout diário.',
    officialSourceUrl: url,
    sourceLabel: crypto ? 'E8 Pro Crypto' : 'E8 Pro Forex',
    officialSources: source(crypto ? 'E8 Pro Crypto' : 'E8 Pro Forex', url),
    notes: ['SL e TP não são obrigatórios.', 'Copy trading somente entre contas do mesmo titular.'],
    tradingObjectives: ['Atingir 8% respeitando o cap diário de lucro.'],
    riskRules: ['Daily Drawdown de 2,5%.', 'Static Drawdown de 8%.', 'Daily Profit Cap de 2%.'],
    attentionRules: ['Excesso acima de 2% não conta.', 'Primeiro payout move o loss level.'],
    operationalNotes: ['Manter 50% do lucro como buffer.', 'Confirmar plataforma disponível por região.'],
    criticalRules: ['Meta 8%', 'Daily 2,5%', 'Static 8%', 'Profit Cap 2%', 'Buffer 50%'],
  });
}

const signatureConflicts: RuleConflict[] = [{
  field: 'availability',
  summary: 'As páginas de produto foram atualizadas e o catálogo geral lista Signature, mas uma coleção oficial ainda o rotula como legado.',
  preferredValue: 'Disponibilidade a confirmar no checkout',
  resolution: 'Regras publicadas com status parcial; o usuário deve confirmar se a variante ainda está vendida na sua região.',
  sourceUrls: [overviewUrl, 'https://help.e8markets.com/en/collections/19682547-legacy-product-signature'],
}];

function signatureProgram(crypto: boolean): PropFirmRuleProgram {
  const url = crypto ? signatureCryptoUrl : signatureUrl;
  return program({
    id: crypto ? 'e8-signature-crypto-2026' : 'e8-signature-forex-2026',
    market: 'CFD/Forex',
    programName: crypto ? 'E8 Signature Crypto' : 'E8 Signature Forex',
    programType: '1-Step',
    accountSizes: ['$25K', '$50K', '$100K', '$150K'],
    accountSizeRows: [
      { label: '$25K', profitTarget: '6%', dailyLoss: '2% pause no Performance', maxLoss: '$1.000 EOD' },
      { label: '$50K', profitTarget: '6%', dailyLoss: '2% pause no Performance', maxLoss: '$2.000 EOD' },
      { label: '$100K', profitTarget: '6%', dailyLoss: '2% pause no Performance', maxLoss: '$3.000 EOD' },
      { label: '$150K', profitTarget: '6%', dailyLoss: '2% pause no Performance', maxLoss: '$4.500 EOD' },
    ],
    profitTarget: '6%',
    dailyLoss: 'Challenge sem daily; Performance tem Daily Pause suave de 2%',
    maxLoss: '$1.000 / $2.000 / $3.000 / $4.500 EOD dynamic',
    drawdownType: 'EOD',
    trailingDescription: 'Segue o maior saldo de fim do dia e trava no saldo inicial.',
    minTradingDays: 'Sem mínimo ou máximo; ao menos um trade aberto e fechado a cada 60 dias',
    consistencyRule: 'Best Day de 35% no Performance; 5 dias lucrativos entre payouts após o primeiro',
    newsRule: 'Permitido no Challenge e Performance',
    weekendRule: 'Posições fechadas diariamente às 23:00 server time; reabertura às 00:15',
    payout: '80%; mínimo $100; buffer igual ao EOD; payout caps por tamanho e ciclo',
    leverage: crypto ? 'BTC/ETH 1:5; demais cripto 1:2' : 'Forex 1:30; índices/metais 1:15',
    riskLevel: 'Médio',
    mainRisk: 'EOD dynamic, buffer não sacável e Best Day de 35% condicionam o payout.',
    bestFor: crypto ? 'Trader de cripto que aceita fechamento diário e payout estruturado.' : 'Trader de forex que aceita fechamento diário e payout estruturado.',
    officialSourceUrl: url,
    sourceLabel: crypto ? 'E8 Signature Crypto' : 'E8 Signature Forex',
    confidence: 'medium',
    completeness: 'partial',
    officialSources: source(crypto ? 'E8 Signature Crypto' : 'E8 Signature Forex', url),
    conflicts: signatureConflicts,
    notes: ['SL e TP não são obrigatórios.', 'Confirmar disponibilidade atual no checkout.'],
    tradingObjectives: ['Atingir 6% sem tocar o EOD dynamic.'],
    riskRules: ['EOD Drawdown por tamanho.', 'Daily Pause de 2% no Performance.'],
    attentionRules: ['Best Day de 35%.', 'Buffer do payout não é sacável.'],
    operationalNotes: ['Posições são fechadas diariamente.', 'Cinco dias de 0,3% após o primeiro payout.'],
    criticalRules: ['Meta 6%', 'EOD dynamic', 'Pause 2%', 'Best Day 35%', 'Buffer/caps'],
  });
}

const e8OneForex = oneProgram(false);
const e8OneCrypto = oneProgram(true);
const e8ProForex = proProgram(false);
const e8ProCrypto = proProgram(true);
const e8SignatureForex = signatureProgram(false);
const e8SignatureCrypto = signatureProgram(true);

const e8SignatureFutures = program({
  id: 'e8-signature-futures-2026',
  market: 'Futures',
  programName: 'E8 Signature Futures',
  programType: '1-Step',
  platforms: ['Tradovate; disponibilidade a confirmar'],
  accountSizes: ['$25K', '$50K', '$100K', '$150K'],
  accountSizeRows: [
    { label: '$25K', profitTarget: '$1.500', dailyLoss: '$500 pause no Performance', maxLoss: '$1.000 EOD' },
    { label: '$50K', profitTarget: '$3.000', dailyLoss: '$1.000 pause no Performance', maxLoss: '$2.000 EOD' },
    { label: '$100K', profitTarget: '$6.000', dailyLoss: '$2.000 pause no Performance', maxLoss: '$3.000 EOD' },
    { label: '$150K', profitTarget: '$9.000', dailyLoss: '$3.000 pause no Performance', maxLoss: '$4.500 EOD' },
  ],
  profitTarget: '$1.500 / $3.000 / $6.000 / $9.000',
  dailyLoss: 'Challenge sem daily; Performance tem Daily Pause suave de 2%',
  maxLoss: '$1.000 / $2.000 / $3.000 / $4.500 EOD dynamic',
  drawdownType: 'EOD',
  trailingDescription: 'Segue o maior saldo de fim do dia e trava no saldo inicial.',
  minTradingDays: 'Sem mínimo; inatividade após 7 dias sem trade aberto e fechado',
  consistencyRule: 'Best Day de 35% no Performance; 5 dias lucrativos entre payouts após o primeiro',
  newsRule: 'Permitido no Challenge e Performance',
  weekendRule: 'Sem overnight; fechamento forçado diário às 15:10 CT',
  payout: '80%; mínimo $100; buffer/caps; máximo de 5 payouts em contas compradas após 14/07/2026 20:00 UTC+2',
  leverage: 'Máximo de 2 / 4 / 8 / 12 contratos conforme tamanho',
  riskLevel: 'Alto',
  mainRisk: 'O catálogo de plataformas diz que apenas Zero está disponível, enquanto a página Signature foi atualizada como produto.',
  bestFor: 'Trader de futuros que aceita fechamento diário e regras de payout estruturadas.',
  officialSourceUrl: signatureFuturesUrl,
  sourceLabel: 'E8 Signature Futures',
  confidence: 'medium',
  completeness: 'partial',
  officialSources: source('E8 Signature Futures', signatureFuturesUrl, true),
  conflicts: [{
    field: 'availability',
    summary: 'A página Signature Futures está vigente, mas a página oficial de plataformas afirma que Zero é o único produto Futures disponível.',
    preferredValue: 'Disponibilidade a confirmar no checkout',
    resolution: 'Mantida ficha parcial por haver regras atuais, sem afirmar venda disponível.',
    sourceUrls: [signatureFuturesUrl, futuresPlatformsUrl],
  }],
  monitorability: futuresMonitorability,
  prohibitedPractices: futuresProhibited,
  notes: ['Futures não possui conector automático no Fortify.', 'Copy somente entre contas do mesmo titular.'],
  tradingObjectives: ['Atingir a meta do tamanho sem tocar o EOD dynamic.'],
  riskRules: ['EOD Drawdown por tamanho.', 'Daily Pause de 2% no Performance.', 'Máximo de contratos.'],
  attentionRules: ['Confirmar se o produto está disponível.', 'Sem overnight.'],
  operationalNotes: ['Usar Front Month.', 'Cinco payouts encerram o ciclo nas compras abrangidas.'],
  criticalRules: ['Meta por tamanho', 'EOD dynamic', 'Pause 2%', 'Best Day 35%', 'Sem overnight'],
});

function zeroFuturesProgram(variant: 'Starter' | 'Max'): PropFirmRuleProgram {
  return program({
    id: `e8-zero-futures-${variant.toLowerCase()}-2026`,
    market: 'Futures',
    programName: `E8 Zero Futures ${variant}`,
    programType: '1-Step',
    platforms: ['Tradovate'],
    accountSizes: ['$50K', '$100K', '$200K'],
    accountSizeRows: [
      { label: '$50K', profitTarget: '$3.000', dailyLoss: 'Sem daily', maxLoss: '3% EOD dynamic' },
      { label: '$100K', profitTarget: '$6.500', dailyLoss: 'Sem daily', maxLoss: '3% EOD dynamic' },
      { label: '$200K', profitTarget: '$13.500', dailyLoss: 'Sem daily', maxLoss: '3% EOD dynamic' },
    ],
    profitTarget: '$3.000 / $6.500 / $13.500',
    dailyLoss: 'Sem limite diário',
    maxLoss: '3% EOD dynamic',
    drawdownType: 'EOD',
    trailingDescription: 'Segue o maior saldo de fim do dia; no Performance trava no saldo inicial.',
    minTradingDays: 'Sem mínimo; lógica do Best Day exige ao menos 3 dias; inatividade em 7 dias',
    consistencyRule: 'Best Day de 40% apenas no Challenge; nenhuma consistência no Performance',
    newsRule: 'Permitido no Challenge e Performance',
    weekendRule: 'Sem overnight; fechamento forçado diário às 15:10 CT',
    payout: variant === 'Starter'
      ? '80% ou 100%; diário; mínimo $100; caps $1.000/$1.600/$2.100; máximo 5 payouts'
      : '80% ou 100%; diário; mínimo $100; caps $3.000/$5.000/$7.000; máximo 5 payouts',
    leverage: 'Limites de contratos devem ser conferidos na tabela oficial vigente',
    riskLevel: 'Alto',
    mainRisk: 'EOD dynamic sem daily exige controle do piso, Front Month e fechamento forçado.',
    bestFor: `Trader de futuros que prefere payout ${variant === 'Starter' ? 'com custo de entrada menor' : 'com caps maiores'}.`,
    officialSourceUrl: zeroFuturesUrl,
    sourceLabel: `E8 Zero Futures ${variant}`,
    officialSources: source('E8 Zero Futures Starter and Max', zeroFuturesUrl, true),
    monitorability: futuresMonitorability,
    prohibitedPractices: futuresProhibited,
    notes: ['Starter e Max têm regras de risco idênticas; só preço e payout caps diferem.', 'Copy somente entre contas do mesmo titular.'],
    tradingObjectives: ['Atingir a meta do tamanho.', 'Manter o melhor dia em até 40% no Challenge.'],
    riskRules: ['Sem daily loss.', 'EOD Dynamic Drawdown de 3%.', 'Front Month obrigatório.'],
    attentionRules: ['Sem overnight.', 'Cinco payouts encerram o ciclo e geram novo Challenge.'],
    operationalNotes: ['Tradovate é a plataforma oficial atual.', 'Não usar automação.'],
    criticalRules: ['Meta por tamanho', 'EOD 3%', 'Best Day 40%', 'Sem overnight', '5 payouts'],
  });
}

export const e8MarketsPrograms: PropFirmRuleProgram[] = [
  e8OneForex,
  e8OneCrypto,
  e8ProForex,
  e8ProCrypto,
  e8SignatureForex,
  e8SignatureCrypto,
  e8SignatureFutures,
  zeroFuturesProgram('Starter'),
  zeroFuturesProgram('Max'),
];
