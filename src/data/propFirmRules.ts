import { asapFundingPropPrograms } from './prop-firms/asapFundingProp';
import { alphaCapitalGroupPrograms } from './prop-firms/alphaCapitalGroup';
import { apexTraderFundingPrograms } from './prop-firms/apexTraderFunding';
import { brightFundedPrograms } from './prop-firms/brightFunded';
import { e8MarketsPrograms } from './prop-firms/e8Markets';
import { ftmoPrograms } from './prop-firms/ftmo';
import { fundscapPrograms } from './prop-firms/fundscap';
import { fundedNextPrograms } from './prop-firms/fundedNext';
import { fundingPipsPrograms } from './prop-firms/fundingPips';
import { hantecTraderPrograms } from './prop-firms/hantecTrader';
import { myFundedFxPrograms } from './prop-firms/myFundedFx';
import { npFuturePrograms } from './prop-firms/npFuture';
import { the5ersPrograms } from './prop-firms/the5ers';
import { topstepPrograms } from './prop-firms/topstep';
import { tradingPitPrograms } from './prop-firms/tradingPit';
import { fxifyPrograms } from './prop-firms/fxify';
import { normalizeAccountLevelPrograms } from './prop-firms/accountLevelRules';

export type PropFirmName =
  | 'FTMO'
  | 'Apex Trader Funding'
  | 'Hantec Trader'
  | 'ASAP Funding Prop'
  | 'NP Future'
  | 'Topstep'
  | 'The Trading Pit'
  | 'FundingPips'
  | 'FundedNext'
  | 'The5ers'
  | 'FXIFY'
  | 'E8 Markets'
  | 'BrightFunded'
  | 'Alpha Capital Group'
  | 'MyFundedFX'
  | 'Fundscap';
export type ProgramType = '1-Step' | '2-Step' | '3-Step' | 'Instant' | 'EOD' | 'Intraday' | 'Funded/PA';
export type MarketType = 'MT4/MT5' | 'Futures' | 'CFD/Forex';
export type DrawdownType = 'Static' | 'Daily' | 'Trailing' | 'EOD' | 'Intraday';
export type RiskLevel = 'Baixo' | 'Médio' | 'Alto';
export type EvidenceConfidence = 'high' | 'medium' | 'low';
export type EvidenceCompleteness = 'complete' | 'partial' | 'legacy';
export type EvidenceStatus = 'verified' | 'official_source_unavailable' | 'legacy';
export type OfficialSourceKind = 'official_regulation' | 'official_terms' | 'official_website';

export interface OfficialRuleSource {
  label: string;
  url: string;
  kind: OfficialSourceKind;
  precedence: number;
  lastAccessedAt: string;
}

export interface RuleConflict {
  field: string;
  summary: string;
  preferredValue: string;
  resolution: string;
  sourceUrls: string[];
}

export interface RuleMonitorability {
  automatic_mt5: string[];
  manual_check: string[];
  not_supported_yet: string[];
}

export interface AccountSizeRule {
  label: string;
  profitTarget: string;
  dailyLoss: string;
  maxLoss: string;
  maxContracts?: string;
  notes?: string;
}

export interface RulePhase {
  id: string;
  label: string;
  profitTarget: string;
}

export interface RuleVersion {
  label: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  condition?: string;
  notes: string[];
}

export interface RuleAccountSize {
  id: string;
  label: string;
  initialBalance: string;
  price: string;
  currency: string;
  platforms: string[];
  market: MarketType;
  programType: ProgramType;
  phases: RulePhase[];
  dailyLoss: string;
  maxLoss: string;
  drawdownType: DrawdownType;
  drawdownCalculation: string;
  minTradingDays: string;
  maxTradingDays: string;
  maxContracts: string;
  maxLots: string;
  leverage: string;
  newsRule: string;
  weekendRule: string;
  overnightRule: string;
  eaRule: string;
  copyTradingRule: string;
  consistencyRule: string;
  bestDayRule: string;
  inactivityRule: string;
  payoutSplit: string;
  firstPayoutTiming: string;
  subsequentPayoutTiming: string;
  minimumWithdrawal: string;
  scalingPlan: string;
  resetRefundRule: string;
  kycRule: string;
  prohibitedPractices: string[];
  breachConditions: string[];
  sourceRefs: string[];
  lastReviewedAt: string;
  confidence: EvidenceConfidence;
  dataCompleteness: EvidenceCompleteness;
  monitorability: RuleMonitorability;
  notes: string[];
  conflicts: string[];
  versions: RuleVersion[];
}

export interface PropFirmRuleProgram {
  id: string;
  firm: PropFirmName;
  firmSlug?: string;
  programName: string;
  programType: ProgramType;
  market: MarketType;
  platforms: string[];
  accountSizes: string[];
  accountSizeRows: AccountSizeRule[];
  accountLevelRules?: RuleAccountSize[];
  profitTarget: string;
  dailyLoss: string;
  maxLoss: string;
  drawdownType: DrawdownType;
  trailingDescription: string;
  minTradingDays: string;
  consistencyRule: string;
  newsRule: string;
  weekendRule: string;
  payout: string;
  leverage: string;
  riskLevel: RiskLevel;
  mainRisk: string;
  bestFor: string;
  officialSourceUrl: string;
  sourceLabel: string;
  lastReviewedAt: string;
  confidence?: EvidenceConfidence;
  completeness?: EvidenceCompleteness;
  dataCompleteness?: EvidenceCompleteness;
  evidenceStatus?: EvidenceStatus;
  officialSources?: OfficialRuleSource[];
  conflicts?: RuleConflict[];
  monitorability?: RuleMonitorability;
  prohibitedPractices?: string[];
  notes: string[];
  tradingObjectives: string[];
  riskRules: string[];
  attentionRules: string[];
  operationalNotes: string[];
  criticalRules: string[];
}

const reviewedAt = '2026-06-23';
const confirm = 'Confirmar no termo oficial';

const legacyPropFirmRulePrograms: PropFirmRuleProgram[] = [
  {
    id: 'ftmo-challenge-2-step',
    firm: 'FTMO',
    programName: 'FTMO Challenge 2-Step',
    programType: '2-Step',
    market: 'CFD/Forex',
    platforms: ['MT4', 'MT5', 'cTrader', 'DXtrade'],
    accountSizes: ['$10k', '$25k', '$50k', '$100k', '$200k'],
    accountSizeRows: [
      { label: 'Todos os tamanhos', profitTarget: '10% na Challenge; 5% na Verification', dailyLoss: '5%', maxLoss: '10%' },
    ],
    profitTarget: '10% na Challenge; 5% na Verification',
    dailyLoss: '5%',
    maxLoss: '10%',
    drawdownType: 'Daily',
    trailingDescription: 'Perda diaria recalculada a 00:00 CE(S)T; perda maxima total estatica.',
    minTradingDays: 'Minimo operacional conforme termos vigentes',
    consistencyRule: 'Sem regra publica de consistencia para aprovacao padrao',
    newsRule: 'Varia por tipo de conta; Standard e Swing podem ter restricoes diferentes',
    weekendRule: 'Varia por tipo de conta; confirmar Standard/Swing',
    payout: 'Conforme contrato FTMO vigente',
    leverage: 'Varia por ativo e tipo de conta',
    riskLevel: 'Médio',
    mainRisk: 'Estourar perda diaria por operacoes abertas ou swaps/comissoes.',
    bestFor: 'Traders de CFD/Forex que aceitam avaliacao em duas fases.',
    officialSourceUrl: 'https://ftmo.com/en/trading-objectives/',
    sourceLabel: 'FTMO Trading Objectives',
    lastReviewedAt: reviewedAt,
    notes: [
      'A perda diaria considera resultado fechado e flutuante.',
      'Noticias e fim de semana variam conforme o tipo de conta contratado.',
    ],
    tradingObjectives: [
      'Atingir meta de lucro da fase sem violar perda diaria ou perda maxima.',
      'Respeitar objetivos de cada fase antes de solicitar a conta seguinte.',
    ],
    riskRules: [
      'Max daily loss: 5%.',
      'Max loss: 10%.',
      'O calculo diario reinicia conforme horario oficial da FTMO.',
    ],
    attentionRules: [
      'Operar noticia pode ter regra diferente em Standard e Swing.',
      'Posicoes abertas entram no calculo de perda.',
    ],
    operationalNotes: [
      'Configure alertas de perda diaria antes da sessao.',
      'Evite segurar operacoes quando a margem ate o limite estiver curta.',
    ],
    criticalRules: ['Perda diaria', 'Perda maxima', 'Regras de noticia por tipo de conta'],
  },
  {
    id: 'ftmo-challenge-1-step',
    firm: 'FTMO',
    programName: 'FTMO Challenge 1-Step',
    programType: '1-Step',
    market: 'CFD/Forex',
    platforms: ['MT4', 'MT5', 'cTrader', 'DXtrade'],
    accountSizes: ['$10k', '$25k', '$50k', '$100k', '$200k'],
    accountSizeRows: [
      { label: 'Todos os tamanhos', profitTarget: '10%', dailyLoss: '3%', maxLoss: '10%' },
    ],
    profitTarget: '10%',
    dailyLoss: '3%',
    maxLoss: '10%',
    drawdownType: 'Daily',
    trailingDescription: 'Perda diaria mais apertada; confirmar regras especificas da oferta 1-Step.',
    minTradingDays: confirm,
    consistencyRule: 'Sem regra publica de consistencia para aprovacao padrao',
    newsRule: 'Varia por tipo de conta',
    weekendRule: 'Varia por tipo de conta',
    payout: 'Conforme contrato FTMO vigente',
    leverage: 'Varia por ativo e tipo de conta',
    riskLevel: 'Alto',
    mainRisk: 'Limite diario de 3% reduz margem para erro em dias volateis.',
    bestFor: 'Traders experientes que preferem avaliacao curta e aceitam limite diario menor.',
    officialSourceUrl: 'https://ftmo.com/en/trading-objectives/',
    sourceLabel: 'FTMO Trading Objectives',
    lastReviewedAt: reviewedAt,
    notes: [
      'Alguns detalhes podem variar por disponibilidade regional e tipo de conta.',
      'Standard/Swing podem diferir em noticias e fim de semana.',
    ],
    tradingObjectives: ['Atingir 10% sem violar limites de perda.', 'Confirmar demais objetivos no termo oficial.'],
    riskRules: ['Max daily loss: 3%.', 'Max loss: 10% se suportado pela oferta vigente.'],
    attentionRules: ['Limite diario mais restritivo que o modelo 2-Step.', 'Confirmar regras antes de operar noticia.'],
    operationalNotes: ['Use risco reduzido por trade.', 'Pare cedo apos sequencia negativa.'],
    criticalRules: ['Perda diaria de 3%', 'Confirmacao de termos 1-Step', 'Noticias/fim de semana'],
  },
  {
    id: 'apex-intraday-evaluation',
    firm: 'Apex Trader Funding',
    programName: 'Intraday Trailing Drawdown Evaluation',
    programType: 'Intraday',
    market: 'Futures',
    platforms: ['NinjaTrader', 'Tradovate', 'Rithmic'],
    accountSizes: ['Varia por tamanho de conta'],
    accountSizeRows: [
      { label: 'Variavel', profitTarget: 'Varia por tamanho', dailyLoss: 'Sem limite diario', maxLoss: 'Trailing intraday em tempo real' },
    ],
    profitTarget: 'Varia por tamanho de conta',
    dailyLoss: 'Sem limite diario',
    maxLoss: 'Trailing drawdown intraday',
    drawdownType: 'Intraday',
    trailingDescription: 'Trailing drawdown intraday acompanha o saldo/equity em tempo real conforme regras Apex.',
    minTradingDays: 'Sem dias minimos',
    consistencyRule: 'Confirmar no termo oficial',
    newsRule: 'Confirmar no termo oficial',
    weekendRule: 'Futures conforme horarios de mercado e regras Apex',
    payout: 'PA deve ser ativada em ate 7 dias corridos apos aprovacao',
    leverage: 'Contratos futuros por plano',
    riskLevel: 'Alto',
    mainRisk: 'Trailing intraday pode reprovar mesmo com movimentos temporarios contra a posicao.',
    bestFor: 'Scalpers e day traders de futuros que monitoram equity em tempo real.',
    officialSourceUrl: 'https://apextraderfunding.com/help-center/evaluation-accounts-ea/intraday-trailing-drawdown-evaluations/',
    sourceLabel: 'Apex Intraday Trailing Drawdown Evaluations',
    lastReviewedAt: reviewedAt,
    notes: ['Acesso de avaliacao por 30 dias.', 'PA deve ser ativada em ate 7 dias corridos apos passar.'],
    tradingObjectives: ['Atingir a meta de lucro do tamanho contratado.', 'Nao violar trailing intraday.'],
    riskRules: ['Sem limite diario declarado para este modelo.', 'Trailing intraday e sensivel ao pico de equity.'],
    attentionRules: ['Operacoes abertas podem mover o piso de risco.', 'Validar contratos maximos do plano contratado.'],
    operationalNotes: ['Monitorar drawdown em tempo real.', 'Evitar aumentar mao depois de novo high da conta.'],
    criticalRules: ['Trailing intraday', 'Prazo de acesso', 'Ativacao da PA'],
  },
  {
    id: 'apex-eod-evaluation',
    firm: 'Apex Trader Funding',
    programName: 'EOD Evaluation',
    programType: 'EOD',
    market: 'Futures',
    platforms: ['NinjaTrader', 'Tradovate', 'Rithmic'],
    accountSizes: ['$25k', '$50k', '$100k', '$150k'],
    accountSizeRows: [
      { label: '$25k', profitTarget: '$1,500', dailyLoss: '$500', maxLoss: '$1,000', maxContracts: '4' },
      { label: '$50k', profitTarget: '$3,000', dailyLoss: '$1,000', maxLoss: '$2,000', maxContracts: '6' },
      { label: '$100k', profitTarget: '$6,000', dailyLoss: '$1,500', maxLoss: '$3,000', maxContracts: '8' },
      { label: '$150k', profitTarget: '$9,000', dailyLoss: '$2,000', maxLoss: '$4,000', maxContracts: '12' },
    ],
    profitTarget: '$1,500 / $3,000 / $6,000 / $9,000',
    dailyLoss: '$500 / $1,000 / $1,500 / $2,000',
    maxLoss: '$1,000 / $2,000 / $3,000 / $4,000',
    drawdownType: 'EOD',
    trailingDescription: 'Trailing EOD calculado no fim do dia, conforme pagina oficial do programa.',
    minTradingDays: 'Sem dias minimos informados para esta oferta',
    consistencyRule: 'Nao aplicada',
    newsRule: 'Confirmar no termo oficial',
    weekendRule: 'Futures conforme horarios de mercado e regras Apex',
    payout: 'Conforme regras Apex/PA vigentes',
    leverage: 'Max contratos: 4 / 6 / 8 / 12',
    riskLevel: 'Médio',
    mainRisk: 'Limite diario em dolar e trailing EOD exigem controle por tamanho de conta.',
    bestFor: 'Traders de futuros que preferem drawdown calculado no fim do dia.',
    officialSourceUrl: 'https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-evaluations/',
    sourceLabel: 'Apex EOD Evaluations',
    lastReviewedAt: reviewedAt,
    notes: ['Acesso de avaliacao por 30 dias.', 'Regra de consistencia nao aplicada segundo material informado.'],
    tradingObjectives: ['Atingir meta de lucro correspondente ao tamanho da conta.', 'Respeitar limite diario e max drawdown.'],
    riskRules: ['Daily loss definido por tamanho.', 'Max drawdown definido por tamanho.', 'Max contratos definido por tamanho.'],
    attentionRules: ['O tamanho da conta muda todos os limites.', 'Nao tratar EOD como intraday.'],
    operationalNotes: ['Selecionar o tamanho correto antes de comparar.', 'Monitorar perda diaria em dolar.'],
    criticalRules: ['Limite diario em dolar', 'Trailing EOD', 'Max contratos'],
  },
  {
    id: 'hantec-instant-funding',
    firm: 'Hantec Trader',
    programName: 'Instant Funding',
    programType: 'Instant',
    market: 'CFD/Forex',
    platforms: ['MT4', 'MT5'],
    accountSizes: ['$1k', '$2k', '$5k', '$10k', '$25k', '$50k'],
    accountSizeRows: [
      { label: '$1k a $50k', profitTarget: 'Sem meta de lucro', dailyLoss: '6%', maxLoss: '6%' },
    ],
    profitTarget: 'Sem meta de lucro',
    dailyLoss: '6%',
    maxLoss: '6%',
    drawdownType: 'Static',
    trailingDescription: 'Limites estaticos de perda diaria e total conforme regras do programa.',
    minTradingDays: 'Sem dias minimos',
    consistencyRule: '20% ou menor para elegibilidade de saque',
    newsRule: 'Nao abrir/fechar 3 min antes/depois de noticias de alto impacto, se aplicavel',
    weekendRule: confirm,
    payout: '80% ate 95% com add-on',
    leverage: '1:50',
    riskLevel: 'Médio',
    mainRisk: 'Perda total igual a perda diaria deixa pouca folga apos um dia ruim.',
    bestFor: 'Traders que querem conta sem fase de avaliacao e aceitam controle de consistencia.',
    officialSourceUrl: 'https://htrader.hmarkets.com/programs/instant-funding/',
    sourceLabel: 'Hantec Instant Funding',
    lastReviewedAt: reviewedAt,
    notes: [
      'Consistencia Hantec: melhor dia / lucro total * 100.',
      'Floating/open loss pode variar por programa.',
    ],
    tradingObjectives: ['Operar sem meta obrigatoria de lucro.', 'Manter perdas dentro de 6%.'],
    riskRules: ['Max daily loss: 6%.', 'Max total loss: 6%.', 'Consistencia para saque: 20% ou menor.'],
    attentionRules: ['Noticias de alto impacto podem ter janela de 3 minutos.', 'Floating/open loss varia por programa.'],
    operationalNotes: ['Nao concentrar todo lucro em um unico dia.', 'Checar elegibilidade de saque antes de solicitar payout.'],
    criticalRules: ['Consistencia de 20%', 'Perda diaria/total de 6%', 'Noticias de alto impacto'],
  },
  {
    id: 'hantec-general-rules',
    firm: 'Hantec Trader',
    programName: 'Regras gerais Hantec Trader',
    programType: 'Funded/PA',
    market: 'CFD/Forex',
    platforms: ['MT4', 'MT5'],
    accountSizes: ['Varia por programa'],
    accountSizeRows: [
      { label: 'Todos os programas', profitTarget: confirm, dailyLoss: confirm, maxLoss: confirm, notes: 'Use junto do programa contratado.' },
    ],
    profitTarget: confirm,
    dailyLoss: confirm,
    maxLoss: confirm,
    drawdownType: 'Static',
    trailingDescription: 'Floating/open loss e limites variam conforme programa.',
    minTradingDays: confirm,
    consistencyRule: '20% ou menor: melhor dia / lucro total * 100',
    newsRule: 'Janelas podem variar por programa',
    weekendRule: confirm,
    payout: 'Elegibilidade depende de consistencia e regras do programa',
    leverage: 'Varia por programa',
    riskLevel: 'Médio',
    mainRisk: 'Falhar consistencia de saque ou interpretar regra geral como regra do programa.',
    bestFor: 'Consulta educacional antes de revisar o contrato Hantec especifico.',
    officialSourceUrl: 'https://htrader.hmarkets.com/programs/rules/',
    sourceLabel: 'Hantec Trader Rules',
    lastReviewedAt: reviewedAt,
    notes: ['Esta entrada resume regras gerais e nao substitui o programa contratado.'],
    tradingObjectives: ['Confirmar objetivos no programa especifico.', 'Manter consistencia para saque.'],
    riskRules: ['Consistencia de 20% ou menor.', 'Floating/open loss varia por programa.'],
    attentionRules: ['Nao usar esta entrada como configuracao unica de risco.', 'Validar regras de noticia e fim de semana.'],
    operationalNotes: ['Leia a regra geral e a pagina do programa.', 'Documente o calculo de consistencia antes do saque.'],
    criticalRules: ['Consistencia', 'Floating/open loss', 'Termo especifico do programa'],
  },
  {
    id: 'hantec-express',
    firm: 'Hantec Trader',
    programName: 'Express',
    programType: '1-Step',
    market: 'CFD/Forex',
    platforms: ['MT4', 'MT5'],
    accountSizes: ['Confirmar no termo oficial'],
    accountSizeRows: [
      { label: confirm, profitTarget: confirm, dailyLoss: confirm, maxLoss: confirm },
    ],
    profitTarget: confirm,
    dailyLoss: confirm,
    maxLoss: confirm,
    drawdownType: 'Static',
    trailingDescription: confirm,
    minTradingDays: confirm,
    consistencyRule: '20% ou menor para saque, se aplicavel',
    newsRule: confirm,
    weekendRule: confirm,
    payout: confirm,
    leverage: confirm,
    riskLevel: 'Médio',
    mainRisk: 'Dados parciais exigem validacao do termo oficial antes de operar.',
    bestFor: 'Comparacao preliminar com programas Hantec.',
    officialSourceUrl: 'https://htrader.hmarkets.com/programs/rules/',
    sourceLabel: 'Hantec Trader Rules',
    lastReviewedAt: reviewedAt,
    notes: ['Entrada placeholder com dados parciais. Nao inventar limites.'],
    tradingObjectives: [confirm],
    riskRules: [confirm],
    attentionRules: ['Confirmar limites e regras operacionais antes de configurar conta.'],
    operationalNotes: ['Use somente como lembrete de revisao oficial.'],
    criticalRules: ['Dados pendentes', 'Consistencia', 'Limites oficiais'],
  },
  {
    id: 'hantec-enhanced',
    firm: 'Hantec Trader',
    programName: 'Enhanced',
    programType: '2-Step',
    market: 'CFD/Forex',
    platforms: ['MT4', 'MT5'],
    accountSizes: ['Confirmar no termo oficial'],
    accountSizeRows: [
      { label: confirm, profitTarget: confirm, dailyLoss: confirm, maxLoss: confirm },
    ],
    profitTarget: confirm,
    dailyLoss: confirm,
    maxLoss: confirm,
    drawdownType: 'Static',
    trailingDescription: confirm,
    minTradingDays: confirm,
    consistencyRule: '20% ou menor para saque, se aplicavel',
    newsRule: confirm,
    weekendRule: confirm,
    payout: confirm,
    leverage: confirm,
    riskLevel: 'Médio',
    mainRisk: 'Dados parciais exigem validacao do termo oficial antes de operar.',
    bestFor: 'Comparacao preliminar com avaliacao Hantec em etapas.',
    officialSourceUrl: 'https://htrader.hmarkets.com/programs/rules/',
    sourceLabel: 'Hantec Trader Rules',
    lastReviewedAt: reviewedAt,
    notes: ['Entrada placeholder com dados parciais. Nao inventar limites.'],
    tradingObjectives: [confirm],
    riskRules: [confirm],
    attentionRules: ['Confirmar fase, meta e drawdown no termo oficial.'],
    operationalNotes: ['Use somente como lembrete de revisao oficial.'],
    criticalRules: ['Dados pendentes', 'Consistencia', 'Limites oficiais'],
  },
  {
    id: 'hantec-enhancedx',
    firm: 'Hantec Trader',
    programName: 'EnhancedX',
    programType: '2-Step',
    market: 'CFD/Forex',
    platforms: ['MT4', 'MT5'],
    accountSizes: ['Confirmar no termo oficial'],
    accountSizeRows: [
      { label: confirm, profitTarget: confirm, dailyLoss: confirm, maxLoss: confirm },
    ],
    profitTarget: confirm,
    dailyLoss: confirm,
    maxLoss: confirm,
    drawdownType: 'Static',
    trailingDescription: confirm,
    minTradingDays: confirm,
    consistencyRule: '20% ou menor para saque, se aplicavel',
    newsRule: confirm,
    weekendRule: confirm,
    payout: confirm,
    leverage: confirm,
    riskLevel: 'Médio',
    mainRisk: 'Dados parciais exigem validacao do termo oficial antes de operar.',
    bestFor: 'Comparacao preliminar com programas Hantec de maior flexibilidade.',
    officialSourceUrl: 'https://htrader.hmarkets.com/programs/rules/',
    sourceLabel: 'Hantec Trader Rules',
    lastReviewedAt: reviewedAt,
    notes: ['Entrada placeholder com dados parciais. Nao inventar limites.'],
    tradingObjectives: [confirm],
    riskRules: [confirm],
    attentionRules: ['Confirmar limites exatos antes de operar.'],
    operationalNotes: ['Use somente como lembrete de revisao oficial.'],
    criticalRules: ['Dados pendentes', 'Consistencia', 'Limites oficiais'],
  },
];

const sourcePropFirmRulePrograms: PropFirmRuleProgram[] = [
  ...legacyPropFirmRulePrograms.filter(
    (program) => !['FTMO', 'Apex Trader Funding', 'Hantec Trader'].includes(program.firm),
  ),
  ...asapFundingPropPrograms,
  ...npFuturePrograms,
  ...ftmoPrograms,
  ...apexTraderFundingPrograms,
  ...hantecTraderPrograms,
  ...topstepPrograms,
  ...tradingPitPrograms,
  ...fundingPipsPrograms,
  ...fundedNextPrograms,
  ...the5ersPrograms,
  ...fxifyPrograms,
  ...e8MarketsPrograms,
  ...brightFundedPrograms,
  ...alphaCapitalGroupPrograms,
  ...myFundedFxPrograms,
  ...fundscapPrograms,
];

export const propFirmRulePrograms = normalizeAccountLevelPrograms(sourcePropFirmRulePrograms);

export const propFirmFilterOptions = {
  firms: [
    'FTMO',
    'Apex Trader Funding',
    'Hantec Trader',
    'ASAP Funding Prop',
    'NP Future',
    'Topstep',
    'The Trading Pit',
    'FundingPips',
    'FundedNext',
    'The5ers',
    'FXIFY',
    'E8 Markets',
    'BrightFunded',
    'Alpha Capital Group',
    'MyFundedFX',
    'Fundscap',
  ] satisfies PropFirmName[],
  programTypes: ['1-Step', '2-Step', '3-Step', 'Instant', 'EOD', 'Intraday', 'Funded/PA'] satisfies ProgramType[],
  markets: ['MT4/MT5', 'Futures', 'CFD/Forex'] satisfies MarketType[],
  drawdownTypes: ['Static', 'Daily', 'Trailing', 'EOD', 'Intraday'] satisfies DrawdownType[],
  riskLevels: ['Baixo', 'Médio', 'Alto'] satisfies RiskLevel[],
};
