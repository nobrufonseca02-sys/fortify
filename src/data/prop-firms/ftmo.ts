import type { OfficialRuleSource, PropFirmRuleProgram } from '../propFirmRules';

const reviewedAt = '2026-07-15';
const objectivesUrl = 'https://ftmo.com/en/trading-objectives/';
const oneStepUrl = 'https://ftmo.com/en/1-step-challenge/';
const twoStepUrl = 'https://ftmo.com/en/2-step-challenge/';
const prohibitedUrl = 'https://ftmo.com/en/forbidden-trading-practices/';
const payoutUrl = 'https://ftmo.com/faq/how-do-i-withdraw-my-profits/';
const swingUrl = 'https://ftmo.com/faq/ftmo-swing-account-type/';

const officialSources: OfficialRuleSource[] = [
  { label: 'FTMO Trading Objectives', url: objectivesUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
  { label: 'FTMO Forbidden Trading Practices', url: prohibitedUrl, kind: 'official_terms', precedence: 2, lastAccessedAt: reviewedAt },
  { label: 'FTMO Reward withdrawal FAQ', url: payoutUrl, kind: 'official_website', precedence: 3, lastAccessedAt: reviewedAt },
];

const accountSizes = ['$10K', '$25K', '$50K', '$100K', '$200K'];
const prohibitedPractices = [
  'Explorar erros, atrasos de preço ou falhas do feed de dados.',
  'Coordenar operações opostas ou compartilhar a conta com terceiros.',
  'Usar execução artificial de alta velocidade, entrada em massa ou manipulação por automação.',
  'Distribuir lucro artificialmente para contornar a Best Day Rule.',
  'Assumir exposição ou alavancagem incompatível com negociação replicável.',
];

const monitorability = {
  automatic_mt5: ['Meta de lucro', 'Perda diária', 'Perda máxima', 'Best Day Rule', 'Dias negociados', 'Posições abertas e custos'],
  manual_check: ['Classificação Standard/Swing', 'Conduta coordenada ou manipulação', 'Elegibilidade e revisão de Reward'],
  not_supported_yet: ['Calendário FTMO de eventos restritos', 'Detecção de acesso por terceiros'],
};

export const ftmoPrograms: PropFirmRuleProgram[] = [
  {
    id: 'ftmo-challenge-1-step-2026',
    firm: 'FTMO',
    firmSlug: 'ftmo',
    programName: 'FTMO Challenge 1-Step',
    programType: '1-Step',
    market: 'CFD/Forex',
    platforms: ['MT4', 'MT5', 'cTrader', 'DXtrade'],
    accountSizes,
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '10%', dailyLoss: '3%', maxLoss: '10% EOD trailing' }],
    profitTarget: '10%',
    dailyLoss: '3%',
    maxLoss: '10%',
    drawdownType: 'EOD',
    trailingDescription: 'Perda máxima EOD trailing: acompanha o maior saldo observado às 00:00 CE(S)T e nunca recua.',
    minTradingDays: 'Sem mínimo; prazo ilimitado',
    consistencyRule: 'Best Day Rule de 50%; exceder não reprova, mas exige continuar operando',
    newsRule: 'Avaliação sem restrição; na FTMO Account Standard há eventos restritos e o tipo Swing não está disponível no 1-Step',
    weekendRule: 'Avaliação permite; FTMO Account 1-Step não possui opção Swing e segue as restrições Standard',
    payout: 'Reward de 90%; solicitação a partir de 14 dias após o primeiro trade elegível',
    leverage: 'Standard até 1:100; varia por ativo',
    riskLevel: 'Alto',
    mainRisk: 'Daily Loss de 3%, EOD trailing e Best Day Rule comprimem a margem após um dia muito lucrativo.',
    bestFor: 'Trader que prefere uma fase e consegue distribuir lucro sem concentrar o melhor dia.',
    officialSourceUrl: oneStepUrl,
    sourceLabel: 'FTMO 1-Step Challenge',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    dataCompleteness: 'complete',
    evidenceStatus: 'verified',
    officialSources: [{ label: 'FTMO 1-Step Challenge', url: oneStepUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt }, ...officialSources],
    conflicts: [],
    monitorability,
    prohibitedPractices,
    notes: ['Daily Loss inclui resultado fechado, flutuante, comissões e swaps.', 'A Best Day Rule continua aplicável na FTMO Account originada do 1-Step.'],
    tradingObjectives: ['Atingir 10% sem violar os limites.', 'Manter o melhor dia em até 50% do lucro positivo considerado.'],
    riskRules: ['Daily Loss de 3% recalculado às 00:00 CE(S)T.', 'Maximum Loss de 10% com trailing EOD.'],
    attentionRules: ['O trailing usa o maior saldo diário registrado.', 'Não presumir que regras Swing se aplicam ao 1-Step.'],
    operationalNotes: ['Fechar posições e ordens antes de solicitar Reward.', 'Conferir o calendário oficial na FTMO Account Standard.'],
    criticalRules: ['Daily Loss 3%', 'EOD trailing 10%', 'Best Day 50%', 'Eventos na conta Standard'],
  },
  {
    id: 'ftmo-challenge-2-step-2026',
    firm: 'FTMO',
    firmSlug: 'ftmo',
    programName: 'FTMO Challenge 2-Step',
    programType: '2-Step',
    market: 'CFD/Forex',
    platforms: ['MT4', 'MT5', 'cTrader', 'DXtrade'],
    accountSizes,
    accountSizeRows: [{ label: 'Todos os tamanhos', profitTarget: '10% / 5%', dailyLoss: '5%', maxLoss: '10% estático' }],
    profitTarget: '10% na Challenge; 5% na Verification',
    dailyLoss: '5%',
    maxLoss: '10%',
    drawdownType: 'Static',
    trailingDescription: 'Maximum Loss estático de 10% do capital simulado inicial.',
    minTradingDays: '4 dias em cada fase; prazo ilimitado',
    consistencyRule: 'Sem regra de consistência para aprovação do 2-Step',
    newsRule: 'Avaliação sem restrição; FTMO Account Standard restringe eventos selecionados, Swing não restringe',
    weekendRule: 'Avaliação permite; na conta financiada, Swing permite e Standard possui restrições',
    payout: 'Reward de 80%, podendo chegar a 90%; solicitação a partir de 14 dias',
    leverage: 'Standard até 1:100; Swing até 1:30',
    riskLevel: 'Médio',
    mainRisk: 'Daily Loss considera equity e custos; manter posição no rollover pode alterar a folga disponível.',
    bestFor: 'Trader que prefere perda máxima estática e aceita duas fases com quatro dias cada.',
    officialSourceUrl: twoStepUrl,
    sourceLabel: 'FTMO 2-Step Challenge',
    lastReviewedAt: reviewedAt,
    confidence: 'high',
    completeness: 'complete',
    dataCompleteness: 'complete',
    evidenceStatus: 'verified',
    officialSources: [
      { label: 'FTMO 2-Step Challenge', url: twoStepUrl, kind: 'official_website', precedence: 1, lastAccessedAt: reviewedAt },
      { label: 'FTMO Swing Account FAQ', url: swingUrl, kind: 'official_website', precedence: 2, lastAccessedAt: reviewedAt },
      ...officialSources,
    ],
    conflicts: [],
    monitorability,
    prohibitedPractices,
    notes: ['Um dia conta quando ao menos uma posição é aberta no dia CE(S)T.', 'A opção Swing existe apenas no percurso 2-Step.'],
    tradingObjectives: ['Atingir 10% e depois 5%.', 'Completar quatro dias negociados em cada fase.'],
    riskRules: ['Daily Loss de 5%.', 'Maximum Loss estático de 10%.'],
    attentionRules: ['Equity, swaps e comissões entram no Daily Loss.', 'Standard e Swing possuem regras operacionais diferentes após aprovação.'],
    operationalNotes: ['Selecionar Standard ou Swing de acordo com notícias e holding.', 'Reward inicial padrão de 80%.'],
    criticalRules: ['Daily Loss 5%', 'Maximum Loss 10%', 'Quatro dias por fase', 'Tipo Standard/Swing'],
  },
];
