import type {
  EvidenceCompleteness,
  EvidenceConfidence,
  OfficialRuleSource,
  PropFirmRuleProgram,
  RuleConflict,
} from '../propFirmRules';

const reviewedAt = '2026-07-15';
const assessmentUrl = 'https://fxify.com/faqs/all-faqs/what-are-the-rules-for-the-assessment-account/';
const payoutUrl = 'https://fxify.com/faqs/all-faqs/how-do-i-withdraw-my-profits/';
const prohibitedUrl = 'https://fxify.com/faqs/all-faqs/what-strategies-can-i-use/';
const countriesUrl = 'https://fxify.com/faqs/all-faqs/what-countries-are-accepted/';
const onePhaseUrl = 'https://fxify.com/programs/one-phase/';
const twoPhaseUrl = 'https://fxify.com/programs/two-phase/';
const threePhaseUrl = 'https://fxify.com/programs/three-phase-challenge/';
const instantUrl = 'https://fxify.com/faqs/instant-funded-faq/';
const instantLiteUrl = 'https://fxify.com/blog/introducing-fxify-instant-funding-lite/';
const lightningUrl = 'https://fxify.com/faqs/lightning-plan/';
const twoPhaseProUrl = 'https://fxify.com/blog/introducing-fxify-2-phase-pro/';
const staticDrawdownUrl = 'https://fxify.com/faqs/all-faqs/what-is-static-drawdown/';

const sharedSources: OfficialRuleSource[] = [
  { label: 'FXIFY assessment rules', url: assessmentUrl, kind: 'official_terms', precedence: 2, lastAccessedAt: reviewedAt },
  { label: 'FXIFY payout rules', url: payoutUrl, kind: 'official_website', precedence: 3, lastAccessedAt: reviewedAt },
  { label: 'FXIFY prohibited strategies', url: prohibitedUrl, kind: 'official_terms', precedence: 4, lastAccessedAt: reviewedAt },
  { label: 'FXIFY restricted jurisdictions', url: countriesUrl, kind: 'official_terms', precedence: 5, lastAccessedAt: reviewedAt },
];

const platforms = ['MT4', 'MT5', 'DXtrade', 'TradingView'];
const prohibitedPractices = [
  'Explorar latência, erros de preço, arbitragem ou falhas da plataforma.',
  'HFT, spam de ordens, herd trading, hedge reverso coordenado ou collusion.',
  'Gestão de conta por terceiros, serviço de aprovação ou compartilhamento de credenciais.',
  'Uso de risco extremo, gambling ou alavancagem de notícia não replicável.',
];

const monitorability = {
  automatic_mt5: ['Meta por fase', 'Daily Drawdown', 'Max Drawdown', 'High-water mark por saldo fechado', 'Dias operados', 'Consistência diária', 'Stop loss e exposição'],
  manual_check: ['Notícias por programa', 'Titularidade do copy trading', 'EA permitido por programa', 'Payout e KYC', 'País elegível'],
  not_supported_yet: ['Detecção entre usuários', 'DXtrade/TradingView sem conector', 'Classificação oficial de notícia de alto impacto'],
};

type FxifyProgramInput = Omit<
  PropFirmRuleProgram,
  | 'firm'
  | 'firmSlug'
  | 'market'
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
};

function source(label: string, url: string): OfficialRuleSource[] {
  return [{ label, url, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt }, ...sharedSources];
}

function program(input: FxifyProgramInput): PropFirmRuleProgram {
  const {
    platforms: selectedPlatforms = platforms,
    confidence = 'high',
    completeness = 'complete',
    dataCompleteness = completeness,
    officialSources = sharedSources,
    conflicts = [],
    ...details
  } = input;

  return {
    firm: 'FXIFY',
    firmSlug: 'fxify',
    market: 'CFD/Forex',
    platforms: selectedPlatforms,
    lastReviewedAt: reviewedAt,
    confidence,
    completeness,
    dataCompleteness,
    evidenceStatus: 'verified',
    officialSources,
    conflicts,
    monitorability,
    prohibitedPractices,
    ...details,
  };
}

export const fxifyPrograms: PropFirmRuleProgram[] = [
  program({
    id: 'fxify-one-phase-2026',
    programName: 'One Phase',
    programType: '1-Step',
    accountSizes: ['$5K a $400K; confirmar disponibilidade no checkout'],
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '10%', dailyLoss: '3%', maxLoss: '6% trailing' }],
    profitTarget: '10%',
    dailyLoss: '3% sobre o saldo do dia anterior às 17:00 EST',
    maxLoss: '6% trailing',
    drawdownType: 'Trailing',
    trailingDescription: 'Segue o maior saldo fechado; trava no saldo inicial após 6% de lucro ou payout.',
    minTradingDays: '5 dias; sem prazo máximo; inatividade em 60 dias',
    consistencyRule: 'Sem regra de consistência publicada para aprovação',
    newsRule: 'Permitido no programa padrão; estratégias de notícia com alavancagem abusiva são proibidas',
    weekendRule: 'Permitido no programa padrão; confirmar add-ons e ativo',
    payout: 'Primeiro on-demand após 5 dias e trade lucrativo; depois 30 dias ou 14 com add-on; até 90%',
    leverage: 'Forex 1:30, até 1:50 com add-on; índices 1:10, ações/crypto 1:2',
    riskLevel: 'Alto',
    mainRisk: 'O trailing por saldo fechado e o payout podem travar o piso no saldo inicial.',
    bestFor: 'Trader que quer uma fase e controla drawdown trailing com margem de payout.',
    officialSourceUrl: onePhaseUrl,
    sourceLabel: 'FXIFY One Phase',
    officialSources: source('FXIFY One Phase', onePhaseUrl),
    notes: ['SL e TP não são obrigatórios no programa padrão.', 'A taxa pode ser reembolsada no primeiro payout.'],
    tradingObjectives: ['Atingir 10% em ao menos cinco dias.', 'Não violar 3% diário ou 6% trailing.'],
    riskRules: ['Daily Drawdown de 3%.', 'Max Drawdown de 6% pelo high-water mark de saldo fechado.'],
    attentionRules: ['Payout trava o max drawdown no saldo inicial.', 'Manter margem para spread após sacar.'],
    operationalNotes: ['Revisar add-ons no checkout.', 'Confirmar disponibilidade regional da plataforma.'],
    criticalRules: ['Meta 10%', 'Daily 3%', 'Trailing 6%', 'Cinco dias', 'Payout trava drawdown'],
  }),
  program({
    id: 'fxify-two-phase-standard-2026',
    programName: 'Two Phase Standard',
    programType: '2-Step',
    accountSizes: ['$5K a $400K; confirmar disponibilidade no checkout'],
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '10% / 5%', dailyLoss: '4%', maxLoss: '10% trailing' }],
    profitTarget: '10% na Fase 1; 5% na Fase 2',
    dailyLoss: '4% sobre o saldo do dia anterior às 17:00 EST',
    maxLoss: '10% trailing',
    drawdownType: 'Trailing',
    trailingDescription: 'Segue o maior saldo fechado e trava no saldo inicial ao atingir o nível ou após payout.',
    minTradingDays: '5 dias por fase; sem prazo máximo; inatividade em 60 dias',
    consistencyRule: 'Sem regra de consistência publicada',
    newsRule: 'Permitido, exceto práticas abusivas e exploração de volatilidade',
    weekendRule: 'Permitido no padrão; confirmar ativo e contratação',
    payout: 'Primeiro on-demand; depois 30 dias ou 14 com add-on; até 90%',
    leverage: 'Forex/Gold 1:30, até 1:50 com add-on; índices 1:10, ações/crypto 1:2',
    riskLevel: 'Médio',
    mainRisk: 'O max drawdown trailing de 10% é alterado por lucro fechado e trava após payout.',
    bestFor: 'Trader que busca maior alocação e duas fases com drawdown mais amplo.',
    officialSourceUrl: twoPhaseUrl,
    sourceLabel: 'FXIFY Two Phase Standard',
    officialSources: source('FXIFY Two Phase', twoPhaseUrl),
    notes: ['As mesmas regras de risco continuam no estágio funded.', 'A taxa pode ser reembolsada no primeiro payout.'],
    tradingObjectives: ['Atingir 10% e depois 5%.', 'Completar cinco dias por fase.'],
    riskRules: ['Daily Drawdown de 4%.', 'Max Drawdown trailing de 10%.'],
    attentionRules: ['Não confundir Standard com Classic estático.', 'Payout altera definitivamente o piso de perda.'],
    operationalNotes: ['Conferir o nome da variante no checkout.', 'Preservar buffer após saque.'],
    criticalRules: ['Metas 10%/5%', 'Daily 4%', 'Trailing 10%', 'Cinco dias por fase'],
  }),
  program({
    id: 'fxify-two-phase-classic-2026',
    programName: 'Two Phase Classic',
    programType: '2-Step',
    accountSizes: ['$5K a $100K'],
    accountSizeRows: [{ label: '$5K a $100K', profitTarget: '5% / 10%', dailyLoss: '4%', maxLoss: '10% estático' }],
    profitTarget: '5% na Fase 1; 10% na Fase 2',
    dailyLoss: '4% sobre o saldo do dia anterior às 17:00 EST',
    maxLoss: '10% estático',
    drawdownType: 'Static',
    trailingDescription: 'Piso fixo em 90% do saldo inicial durante a vida da conta.',
    minTradingDays: '4 dias por fase; sem prazo máximo; inatividade em 60 dias',
    consistencyRule: 'Sem consistência na avaliação; 25% no estágio funded',
    newsRule: 'Permitido, sujeito às práticas proibidas gerais',
    weekendRule: 'Permitido no padrão; confirmar ativo e contratação',
    payout: 'Ciclos de 14 ou 30 dias; split de até 100%',
    leverage: 'Varia por ativo e contratação; confirmar no checkout',
    riskLevel: 'Médio',
    mainRisk: 'A ordem oficial das metas é incomum e a consistência de 25% só aparece no funded.',
    bestFor: 'Trader que prefere drawdown estático e maior split potencial.',
    officialSourceUrl: twoPhaseProUrl,
    sourceLabel: 'FXIFY comparison of Two Phase variants',
    confidence: 'medium',
    completeness: 'partial',
    officialSources: source('FXIFY Two Phase comparison', twoPhaseProUrl),
    conflicts: [{
      field: 'profitTarget',
      summary: 'A FAQ genérica do Two Phase descreve o Standard em 10%/5%; a comparação oficial de 2026 descreve o Classic em 5%/10%.',
      preferredValue: '5% / 10% no Classic',
      resolution: 'Adotada a fonte oficial específica que compara as variantes; o Standard permanece separado.',
      sourceUrls: [assessmentUrl, twoPhaseProUrl],
    }],
    notes: ['Dados da variante vêm da comparação oficial de abril de 2026.', 'Confirmar disponibilidade e add-ons no checkout.'],
    tradingObjectives: ['Atingir 5% e depois 10%.', 'Completar quatro dias por fase.'],
    riskRules: ['Daily Drawdown de 4%.', 'Max Drawdown estático de 10%.'],
    attentionRules: ['Funded aplica consistência de 25%.', 'Não aplicar os parâmetros do Standard a esta variante.'],
    operationalNotes: ['Conferir a variante no pedido.', 'Revisar o ciclo de payout contratado.'],
    criticalRules: ['Metas 5%/10%', 'Daily 4%', 'Static 10%', 'Consistência funded 25%'],
  }),
  program({
    id: 'fxify-two-phase-pro-2026',
    programName: 'Two Phase Pro',
    programType: '2-Step',
    accountSizes: ['$10K', '$25K', '$50K', '$100K', '$150K', '$200K', '$250K'],
    accountSizeRows: [{ label: '$10K a $250K', profitTarget: '4% / 8%', dailyLoss: '4%', maxLoss: '8% estático' }],
    profitTarget: '4% na Fase 1; 8% na Fase 2',
    dailyLoss: '4%',
    maxLoss: '8% estático',
    drawdownType: 'Static',
    trailingDescription: 'Piso fixo em 92% do saldo inicial da fase.',
    minTradingDays: '3 dias lucrativos por fase, cada um com pelo menos 0,5%; sem prazo máximo',
    consistencyRule: 'Sem consistência; lucro diário contado é limitado a $4.000',
    newsRule: 'Permitido, sujeito às práticas proibidas gerais',
    weekendRule: 'Confirmar no checkout oficial',
    payout: 'A cada 10 dias; 80%; dois primeiros limitados a 5% do saldo inicial ou $8.000',
    leverage: 'Confirmar no checkout oficial',
    riskLevel: 'Médio',
    mainRisk: 'Dias só contam com 0,5% e há cap diário de $4.000, apesar de não haver consistência.',
    bestFor: 'Trader que prefere risco estático, metas menores e ciclo de payout curto.',
    officialSourceUrl: twoPhaseProUrl,
    sourceLabel: 'FXIFY Two Phase Pro',
    officialSources: source('FXIFY Two Phase Pro', twoPhaseProUrl),
    notes: ['Lucro acima de $4.000 move a conta para read-only até a sessão seguinte.', 'Copy trading não é permitido nesta variante.'],
    tradingObjectives: ['Atingir 4% e depois 8%.', 'Completar três dias de pelo menos 0,5% em cada fase.'],
    riskRules: ['Daily Drawdown de 4%.', 'Max Drawdown estático de 8%.'],
    attentionRules: ['Cap diário de lucro de $4.000.', 'Primeiros payouts possuem teto.'],
    operationalNotes: ['Payout requer três dias lucrativos no ciclo.', 'Não usar copy trading.'],
    criticalRules: ['Metas 4%/8%', 'Daily 4%', 'Static 8%', '3 dias de 0,5%', 'Cap $4.000'],
  }),
  program({
    id: 'fxify-three-phase-2026',
    programName: 'Three Phase',
    programType: '3-Step',
    accountSizes: ['Confirmar no checkout oficial'],
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '5% / 5% / 5%', dailyLoss: '5%', maxLoss: '5% estático' }],
    profitTarget: '5% em cada uma das três fases',
    dailyLoss: '5% sobre o saldo do dia anterior às 17:00 EST',
    maxLoss: '5% estático',
    drawdownType: 'Static',
    trailingDescription: 'Piso fixo em 95% do saldo inicial.',
    minTradingDays: '5 dias por fase; sem prazo máximo; inatividade em 60 dias',
    consistencyRule: 'Sem regra de consistência publicada',
    newsRule: 'Permitido, sujeito às práticas proibidas gerais',
    weekendRule: 'Permitido no padrão; confirmar ativo e contratação',
    payout: 'Primeiro on-demand; depois 30 dias ou 14 com add-on; até 90%',
    leverage: 'Forex/Gold 1:30, até 1:50 com add-on; índices 1:10, ações/crypto 1:2',
    riskLevel: 'Médio',
    mainRisk: 'O max loss de 5% é estático, igual ao daily loss, em todas as três fases.',
    bestFor: 'Trader que prefere metas menores distribuídas em três fases.',
    officialSourceUrl: threePhaseUrl,
    sourceLabel: 'FXIFY Three Phase',
    officialSources: source('FXIFY Three Phase', threePhaseUrl),
    notes: ['As regras permanecem no estágio funded.', 'A taxa pode ser reembolsada no primeiro payout.'],
    tradingObjectives: ['Atingir 5% em três fases.', 'Completar cinco dias em cada fase.'],
    riskRules: ['Daily Drawdown de 5%.', 'Max Drawdown estático de 5%.'],
    attentionRules: ['Qualquer toque em 5% total causa breach.', 'São quinze dias mínimos no percurso completo.'],
    operationalNotes: ['Conferir tamanhos vigentes no checkout.', 'Revisar add-ons antes da compra.'],
    criticalRules: ['Metas 5%/5%/5%', 'Daily 5%', 'Static 5%', 'Cinco dias por fase'],
  }),
  program({
    id: 'fxify-instant-funding-2026',
    programName: 'Instant Funding',
    programType: 'Instant',
    accountSizes: ['$1K a $100K'],
    accountSizeRows: [{ label: '$1K a $100K', profitTarget: 'Sem meta', dailyLoss: '8%', maxLoss: '8% trailing' }],
    profitTarget: 'Sem meta de lucro',
    dailyLoss: '8% sobre o saldo do dia anterior',
    maxLoss: '8% trailing',
    drawdownType: 'Trailing',
    trailingDescription: 'Segue o maior saldo fechado e trava no saldo inicial em +8% ou após payout.',
    minTradingDays: 'Sem mínimo ou máximo; inatividade em 60 dias',
    consistencyRule: 'Sem regra de consistência publicada',
    newsRule: 'Proibido abrir, fechar ou executar ordens em ±5 minutos de notícia de alto impacto',
    weekendRule: 'Não permitido; posições são encerradas na sexta',
    payout: 'Primeiro após 14 dias; depois a cada 14 dias; até 90%',
    leverage: 'Até 1:50; varia por ativo',
    riskLevel: 'Alto',
    mainRisk: 'O payout trava o drawdown e pode deixar a conta sem buffer; EA e copy trading são proibidos.',
    bestFor: 'Trader manual que quer conta funded imediata e aceita trailing e restrições operacionais.',
    officialSourceUrl: instantUrl,
    sourceLabel: 'FXIFY Instant Funded FAQ',
    officialSources: source('FXIFY Instant Funded FAQ', instantUrl),
    notes: ['Somente uma conta Instant Funding ativa por vez.', 'EA, bots e copy trading são proibidos.'],
    tradingObjectives: ['Produzir lucro sem meta obrigatória.', 'Preservar buffer acima dos limites de 8%.'],
    riskRules: ['Daily Drawdown de 8%.', 'Max Drawdown trailing de 8%.'],
    attentionRules: ['Notícias ±5 minutos.', 'Payout integral pode inviabilizar a próxima ordem.'],
    operationalNotes: ['Trading manual.', 'Não manter posição no fim de semana.'],
    criticalRules: ['Daily 8%', 'Trailing 8%', 'Sem EA/copy', 'News ±5', 'Uma conta'],
  }),
  program({
    id: 'fxify-instant-funding-lite-2026',
    programName: 'Instant Funding Lite',
    programType: 'Instant',
    platforms: ['MT5', 'DXtrade', 'TradingView'],
    accountSizes: ['$2.5K', '$5K', '$10K', '$25K', '$50K', '$100K'],
    accountSizeRows: [{ label: '$2.5K a $100K', profitTarget: 'Sem meta', dailyLoss: '3%', maxLoss: '4% trailing' }],
    profitTarget: 'Sem meta de lucro',
    dailyLoss: '3%',
    maxLoss: '4% trailing',
    drawdownType: 'Trailing',
    trailingDescription: 'Segue o maior saldo fechado e trava no saldo inicial em +4% ou após payout.',
    minTradingDays: '5 dias operados e 10 dias totais para payout; inatividade em 60 dias',
    consistencyRule: 'Melhor dia no máximo 20% do lucro realizado total',
    newsRule: 'Proibido abrir ou fechar em ±5 minutos de notícia de alto impacto',
    weekendRule: 'Não permitido; posições são encerradas na sexta',
    payout: 'Após 10 dias e consistência; mínimo $50; 80%, até 90% com add-on',
    leverage: 'Forex 1:50; commodities 1:20; índices 1:15; ações 1:2',
    riskLevel: 'Alto',
    mainRisk: 'Trailing de 4%, consistência de 20% e ausência de holding no fim de semana estreitam a operação.',
    bestFor: 'Trader manual disciplinado que aceita limites apertados em troca de entrada instantânea.',
    officialSourceUrl: instantLiteUrl,
    sourceLabel: 'FXIFY Instant Funding Lite',
    officialSources: source('FXIFY Instant Funding Lite', instantLiteUrl),
    notes: ['EA, automação e copy trading são proibidos.', 'Uma conta Lite pode coexistir com uma Instant Standard.'],
    tradingObjectives: ['Distribuir lucros para cumprir 20%.', 'Completar dez dias desde o primeiro trade.'],
    riskRules: ['Daily Drawdown de 3%.', 'Max Drawdown trailing de 4%.'],
    attentionRules: ['Payout trava o piso no saldo inicial.', 'Sem posição no fim de semana.'],
    operationalNotes: ['Trading manual.', 'Deixar buffer após payout.'],
    criticalRules: ['Daily 3%', 'Trailing 4%', 'Consistência 20%', 'News ±5', 'Sem EA/copy'],
  }),
  program({
    id: 'fxify-lightning-2026',
    programName: 'Lightning Challenge',
    programType: '1-Step',
    platforms: ['MT5', 'DXtrade', 'TradingView'],
    accountSizes: ['Confirmar no checkout oficial'],
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '5%', dailyLoss: '3%', maxLoss: '4% trailing' }],
    profitTarget: '5%',
    dailyLoss: '3% sobre o saldo do dia anterior',
    maxLoss: '4% trailing',
    drawdownType: 'Trailing',
    trailingDescription: 'Segue o maior saldo fechado e trava no saldo inicial em +4% ou após payout.',
    minTradingDays: 'Prazo de 5 dias de negociação para concluir; confirmar contagem no dashboard',
    consistencyRule: 'Melhor dia no máximo 30% do lucro, no challenge e no funded',
    newsRule: 'Restrição de ±5 minutos em notícias de alto impacto',
    weekendRule: 'Não informado com clareza na coleção oficial; confirmar no checkout',
    payout: 'Primeiro após 7 dias no funded; depois a cada 14 dias; até 90%',
    leverage: 'Confirmar no checkout oficial',
    riskLevel: 'Alto',
    mainRisk: 'Prazo curto, trailing de 4%, consistência de 30% e stop loss obrigatório se combinam.',
    bestFor: 'Trader experiente com execução planejada e stop loss em todas as ordens.',
    officialSourceUrl: lightningUrl,
    sourceLabel: 'FXIFY Lightning FAQ',
    confidence: 'medium',
    completeness: 'partial',
    officialSources: source('FXIFY Lightning FAQ', lightningUrl),
    conflicts: [{
      field: 'minTradingDays',
      summary: 'Material oficial de lançamento mencionou até 7 dias; a coleção oficial vigente informa limite de 5 dias.',
      preferredValue: '5 dias',
      resolution: 'Adotada a coleção FAQ vigente e mais recente; o histórico permanece registrado.',
      sourceUrls: [lightningUrl, 'https://fxify.com/news/fxify-lightning-launch/'],
    }],
    notes: ['Primeiro e segundo trades sem SL sofrem soft breach; o terceiro causa hard breach.', 'Há add-on para remover a exigência de SL.'],
    tradingObjectives: ['Atingir 5% dentro do ciclo aplicável.', 'Manter o melhor dia em até 30%.'],
    riskRules: ['Daily Drawdown de 3%.', 'Max Drawdown trailing de 4%.', 'Stop loss obrigatório por padrão.'],
    attentionRules: ['Terceira ordem sem SL causa breach.', 'Confirmar weekend e cronômetro no dashboard.'],
    operationalNotes: ['Primeiro payout após sete dias.', 'Não usar copy trading.'],
    criticalRules: ['Meta 5%', 'Daily 3%', 'Trailing 4%', 'Consistência 30%', 'Stop loss obrigatório'],
  }),
];
