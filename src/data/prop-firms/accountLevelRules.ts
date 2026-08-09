import type {
  AccountSizeRule,
  EvidenceCompleteness,
  EvidenceConfidence,
  PropFirmName,
  PropFirmRuleProgram,
  RuleAccountSize,
  RuleMonitorability,
  RulePhase,
  RuleVersion,
} from '../propFirmRules';

const reviewedAt = '2026-07-17';
const verifyOfficial = 'Verificar no site oficial';
const notPublic = 'Não informado publicamente';
const notApplicable = 'Não aplicável';

type AccountOverride = Partial<
  Pick<
    RuleAccountSize,
    | 'price'
    | 'currency'
    | 'maxTradingDays'
    | 'maxContracts'
    | 'maxLots'
    | 'overnightRule'
    | 'eaRule'
    | 'copyTradingRule'
    | 'bestDayRule'
    | 'inactivityRule'
    | 'payoutSplit'
    | 'firstPayoutTiming'
    | 'subsequentPayoutTiming'
    | 'minimumWithdrawal'
    | 'scalingPlan'
    | 'resetRefundRule'
    | 'kycRule'
  >
> & {
  versions?: RuleVersion[];
};

const firmOperationalRules: Record<
  PropFirmName,
  Pick<AccountOverride, 'eaRule' | 'copyTradingRule' | 'kycRule'>
> = {
  FTMO: {
    eaRule: 'Permitido se a estratégia for legítima, replicável e não violar as práticas proibidas da FTMO.',
    copyTradingRule: 'Uso entre contas próprias deve respeitar a alocação; sinais ou execução de terceiros exigem validação oficial.',
    kycRule: 'KYC/KYB obrigatório antes da relação contratual com a FTMO Account.',
  },
  FundingPips: {
    eaRule: 'Permitido sob a Responsible Trading Policy; execução abusiva, arbitragem e exploração técnica são proibidas.',
    copyTradingRule: 'Somente contas do próprio trader; cópia de terceiros e coordenação entre usuários são proibidas.',
    kycRule: 'KYC, revisão de trading responsável e assinatura do Customer Agreement antes da Master Account.',
  },
  FXIFY: {
    eaRule: 'Permitido quando a estratégia e a configuração pertencem ao trader e não exploram latência ou falhas.',
    copyTradingRule: 'Permitido entre contas próprias; copiar terceiros ou fornecer gestão de conta é proibido.',
    kycRule: 'Verificação de identidade exigida para funded account e retirada.',
  },
  'The Trading Pit': {
    eaRule: 'Permitido somente dentro das regras do programa; HFT, micro-scalping abusivo e exploração de execução são proibidos.',
    copyTradingRule: 'Verificar no site oficial para a plataforma e a modalidade contratadas.',
    kycRule: 'KYC e revisão da conta são exigidos antes de rewards.',
  },
  'E8 Markets': {
    eaRule: 'Permitido se não executar práticas proibidas, arbitragem, HFT abusivo ou exploração do ambiente simulado.',
    copyTradingRule: 'Permitido apenas sob as políticas oficiais e entre contas controladas pelo mesmo trader.',
    kycRule: 'KYC obrigatório para ativação e payouts.',
  },
  FundedNext: {
    eaRule: 'EA permitido; o trader continua responsável por falhas, risco e práticas proibidas.',
    copyTradingRule: 'Permitido entre challenges próprios; cópia entre titulares diferentes é proibida.',
    kycRule: 'KYC e revisão obrigatórios antes da funded account e performance reward.',
  },
  The5ers: {
    eaRule: 'Permitido se a estratégia não infringir práticas proibidas; confirmar limitações técnicas do programa.',
    copyTradingRule: 'Cópia de terceiros e gestão de conta não são permitidas; contas próprias exigem conformidade.',
    kycRule: 'KYC obrigatório antes da funded account e dos payouts.',
  },
  BrightFunded: {
    eaRule: 'EA permitido, sujeito às regras de estratégia proibida e à responsabilidade integral do trader.',
    copyTradingRule: 'Permitido entre contas próprias; copiar contas de terceiros é proibido.',
    kycRule: 'KYC e revisão de elegibilidade obrigatórios antes da funded account.',
  },
  'Apex Trader Funding': {
    eaRule: 'Automação que retire a decisão e o controle do trader é proibida.',
    copyTradingRule: 'Cópia própria deve respeitar a política Apex; compartilhamento, coordenação e hedge entre contas são proibidos.',
    kycRule: 'Validação de identidade e titularidade é exigida para Performance Account e payout.',
  },
  Topstep: {
    eaRule: 'Estratégias automatizadas são permitidas sob responsabilidade do trader e sem manipulação do ambiente.',
    copyTradingRule: 'Trade Copier permitido no Trading Combine e XFA entre contas próprias; Live Funded Account não suporta cópia.',
    kycRule: 'Uma única identidade/perfil; MFA é obrigatório e a titularidade é validada no processo de funding.',
  },
  'Hantec Trader': {
    eaRule: verifyOfficial,
    copyTradingRule: 'Cópia ou coordenação com terceiros e manipulação de consistência são proibidas.',
    kycRule: 'KYC e auditoria são exigidos para funded account e payout.',
  },
  'Alpha Capital Group': {
    eaRule: 'EA permitido conforme política oficial; estratégias proibidas e exploração técnica continuam vedadas.',
    copyTradingRule: 'Permitido entre contas próprias, respeitando limites; copiar terceiros é proibido.',
    kycRule: 'KYC obrigatório antes da Qualified Analyst Account e performance fee.',
  },
  'ASAP Funding Prop': {
    eaRule: verifyOfficial,
    copyTradingRule: 'Gestão por terceiros, coordenação e operações incompatíveis com o perfil do titular são proibidas.',
    kycRule: 'KYC e auditoria de payout obrigatórios.',
  },
  'NP Future': {
    eaRule: 'Automação deve respeitar o regulamento e não pode explorar plataforma, latência ou execução.',
    copyTradingRule: 'Conta de uso pessoal; compartilhamento, espelhamento de terceiros e coordenação abusiva são proibidos.',
    kycRule: 'Cadastro, KYC e compliance obrigatórios conforme Regulamento NPFuture.',
  },
};

const topstepPrices: Record<string, string> = {
  '$50K': 'US$49/mês (Standard) ou US$95/mês (sem taxa de ativação)',
  '$100K': 'US$99/mês (Standard) ou US$149/mês (sem taxa de ativação)',
  '$150K': 'US$199/mês (Standard) ou US$229/mês (sem taxa de ativação)',
};

const tradingPitPrices: Record<string, string> = {
  '$50K': '€99, taxa única',
  '$100K': '€189, taxa única',
  '$150K': '€289, taxa única',
};

const tradingPitReset: Record<string, string> = {
  '$50K': 'Reset €79; extensão €99; mantém os dias restantes no reset.',
  '$100K': 'Reset €149; extensão €189; mantém os dias restantes no reset.',
  '$150K': 'Reset €229; extensão €289; mantém os dias restantes no reset.',
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function explicit(value: string | undefined, fallback = notPublic) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function officialSourceRefs(program: PropFirmRuleProgram) {
  return Array.from(
    new Set([
      program.officialSourceUrl,
      ...(program.officialSources ?? []).map((source) => source.url),
    ]),
  ).filter((url) => url.startsWith('https://'));
}

function rowForAccount(program: PropFirmRuleProgram, label: string, index: number): AccountSizeRule {
  const exactRow = program.accountSizeRows.find(
    (row) => row.label.toLocaleLowerCase('pt-BR') === label.toLocaleLowerCase('pt-BR'),
  );
  if (exactRow) return exactRow;
  if (program.accountSizeRows.length === program.accountSizes.length) {
    return program.accountSizeRows[index];
  }
  return program.accountSizeRows[0] ?? {
    label,
    profitTarget: explicit(program.profitTarget, verifyOfficial),
    dailyLoss: explicit(program.dailyLoss, verifyOfficial),
    maxLoss: explicit(program.maxLoss, verifyOfficial),
  };
}

function phaseCount(program: PropFirmRuleProgram) {
  if (program.programType === '2-Step') return 2;
  if (program.programType === '3-Step') return 3;
  return 1;
}

function buildPhases(program: PropFirmRuleProgram, target: string): RulePhase[] {
  if (program.programType === 'Instant' || program.programType === 'Funded/PA') {
    return [{ id: 'operacao', label: 'Operação', profitTarget: explicit(target, notApplicable) }];
  }

  const count = phaseCount(program);
  const targets = target
    .split(/\s+(?:\/|;)\s+|\s*;\s*/)
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from({ length: count }, (_, index) => ({
    id: `phase-${index + 1}`,
    label: count === 1 ? 'Avaliação' : `Fase ${index + 1}`,
    profitTarget: explicit(targets[index], index === 0 ? explicit(target, verifyOfficial) : verifyOfficial),
  }));
}

function bestDayRule(program: PropFirmRuleProgram) {
  if (/melhor dia|best day/i.test(program.consistencyRule)) return program.consistencyRule;
  if (/sem (regra de )?consist/i.test(program.consistencyRule)) return notApplicable;
  return verifyOfficial;
}

function inactivityRule(program: PropFirmRuleProgram) {
  const item = [...program.notes, ...program.attentionRules, ...program.operationalNotes].find((value) =>
    /inativ/i.test(value),
  );
  return explicit(item, notPublic);
}

function payoutSplit(program: PropFirmRuleProgram) {
  if (/não possui na avaliação|sem payout na avaliação/i.test(program.payout)) {
    return notApplicable;
  }
  return /\d+\s*%|100\/0|90\/10|80\/20|70\/30/i.test(program.payout)
    ? program.payout
    : verifyOfficial;
}

function payoutTiming(program: PropFirmRuleProgram) {
  if (/não possui na avaliação|sem payout na avaliação/i.test(program.payout)) {
    return notApplicable;
  }
  return /dia|seman|quinzen|mensal|demand|sob demanda|ciclo/i.test(program.payout)
    ? program.payout
    : notPublic;
}

function versionsFor(program: PropFirmRuleProgram): RuleVersion[] {
  const current: RuleVersion = {
    label: 'Regras vigentes na revisão Sprint 4',
    effectiveFrom: reviewedAt,
    condition: 'Aplicar à conta somente após confirmar a data de compra e o dashboard oficial.',
    notes: ['Snapshot documental revisado em fonte oficial; campanhas e add-ons podem alterar condições.'],
  };

  if (program.firm === 'BrightFunded') {
    return [
      {
        label: 'BrightFunded 2.0',
        effectiveFrom: '2026-04-13',
        condition: 'Contas compradas em ou após 13/04/2026.',
        notes: ['Usar os planos 2-Step Bright, 2-Step Classic e 1-Step.'],
      },
      {
        label: 'Original Account',
        effectiveTo: '2026-04-12',
        condition: 'Contas compradas antes de 13/04/2026.',
        notes: ['Não misturar as regras legadas com os planos BrightFunded 2.0.'],
      },
    ];
  }

  if (program.firm === 'FundingPips') {
    return [
      {
        label: 'Profit Concentration Policy',
        effectiveFrom: '2026-06-27',
        condition: 'Novas evaluations de US$25K ou mais.',
        notes: ['Acima de 60% da meta em uma trade idea exige quatro dias lucrativos no Master antes de cada reward.'],
      },
      current,
    ];
  }

  if (program.firm === 'Hantec Trader') {
    return [
      {
        label: 'Cálculo diário vigente',
        effectiveFrom: '2026-02-01',
        condition: 'Contas compradas em ou após 01/02/2026.',
        notes: ['Base diária: maior valor entre balance e equity do fechamento anterior, conforme o programa.'],
      },
      {
        label: 'Cálculo diário legado',
        effectiveTo: '2026-01-31',
        condition: 'Contas compradas antes de 01/02/2026.',
        notes: ['A fonte oficial informa cálculo anterior baseado somente em balance.'],
      },
    ];
  }

  if (program.id === 'trading-pit-prime-futures-2026') {
    return [
      {
        label: 'Prime Futures sem activation fee',
        effectiveFrom: '2026-03-26',
        condition: 'Novas contas conforme página oficial vigente.',
        notes: ['Preço, reset e extensão variam por tamanho.'],
      },
      current,
    ];
  }

  if (program.id === 'trading-pit-prime-cfd-one-step-2026') {
    return [
      {
        label: 'CFD Prime atual',
        effectiveFrom: '2026-07-06',
        condition: 'Contas criadas em ou após 06/07/2026.',
        notes: ['US$100K/US$200K: mínimo de três dias e consistência de 50% nos dias positivos.'],
      },
      current,
    ];
  }

  if (program.firm === 'Topstep') {
    return [
      {
        label: 'Dashboard atual',
        effectiveFrom: '2026-01-12',
        condition: 'Política de split e payout do dashboard atual.',
        notes: ['Caminho Standard e caminho sem taxa de ativação não podem ser trocados após a compra.'],
      },
      {
        label: 'Regra de split legada',
        effectiveTo: '2026-01-11',
        condition: 'Traders elegíveis que aderiram antes de 12/01/2026.',
        notes: ['A fonte oficial preserva 100% dos primeiros US$10.000 de lucro vitalício para o grupo elegível.'],
      },
    ];
  }

  if (program.firm === 'Apex Trader Funding') {
    return [
      {
        label: program.drawdownType === 'EOD' ? 'EOD Trailing atual' : 'Intraday Trailing atual',
        effectiveFrom: reviewedAt,
        condition: 'Contas atuais do produto indicado.',
        notes: ['Não aplicar parâmetros de produtos Legacy a estas avaliações.'],
      },
    ];
  }

  return [current];
}

function normalizeVersions(program: PropFirmRuleProgram, versions: RuleVersion[]): RuleAccountSize['versions'] {
  return versions.map((version, index) => ({
    ...version,
    id:
      version.id ??
      `${program.id}-rules-${slugify(version.label) || `version-${index + 1}`}`,
  }));
}

function accountOverride(program: PropFirmRuleProgram, label: string): AccountOverride {
  const common: AccountOverride = {
    ...firmOperationalRules[program.firm],
    bestDayRule: bestDayRule(program),
    inactivityRule: inactivityRule(program),
    payoutSplit: payoutSplit(program),
    firstPayoutTiming: payoutTiming(program),
    subsequentPayoutTiming: payoutTiming(program),
    versions: versionsFor(program),
  };

  if (program.id === 'topstep-trading-combine-2026') {
    return {
      ...common,
      price: topstepPrices[label] ?? verifyOfficial,
      currency: 'USD',
      maxTradingDays: 'Sem limite; assinatura renova a cada 30 dias até aprovação ou cancelamento.',
      overnightRule: 'Posições devem ser encerradas até 15:10 CT e só podem reabrir após 17:00 CT.',
      minimumWithdrawal: notPublic,
      scalingPlan: 'Scaling e payout ocorrem na XFA/Live; não se aplicam ao Trading Combine.',
      resetRefundRule: `Reset custa o mesmo da mensalidade: ${topstepPrices[label] ?? verifyOfficial}.`,
    };
  }

  if (program.id === 'trading-pit-prime-futures-2026') {
    return {
      ...common,
      price: tradingPitPrices[label] ?? verifyOfficial,
      currency: 'EUR',
      maxTradingDays: '30 dias',
      overnightRule: 'Não permitido.',
      firstPayoutTiming: 'Após cinco dias lucrativos de pelo menos US$200.',
      subsequentPayoutTiming: 'Novo pedido após superar o saldo pós-payout anterior em pelo menos US$0,01.',
      minimumWithdrawal: notPublic,
      scalingPlan: 'Earning Account escala contratos diariamente conforme lucro EOD.',
      resetRefundRule: tradingPitReset[label] ?? verifyOfficial,
    };
  }

  if (program.id === 'trading-pit-prime-cfd-one-step-2026') {
    return {
      ...common,
      maxTradingDays: notPublic,
      minimumWithdrawal: 'US$100',
      firstPayoutTiming: 'Após 14 dias, sujeito às regras da conta e KYC.',
      subsequentPayoutTiming: 'A cada 14 dias, sujeito à elegibilidade.',
      resetRefundRule: verifyOfficial,
    };
  }

  if (program.firm === 'Apex Trader Funding') {
    return {
      ...common,
      currency: 'USD',
      maxTradingDays: '30 dias corridos de acesso à evaluation.',
      overnightRule: 'Somente dentro dos horários de mercado e regras de fechamento Apex.',
      minimumWithdrawal: program.programType === 'Intraday' ? 'US$500 na PA Intraday' : verifyOfficial,
      scalingPlan: program.programType === 'Intraday' ? 'Tier based na PA; não se aplica à evaluation.' : 'Não aplicável na evaluation.',
      resetRefundRule: 'Sem extensão; confirmar nova compra ou regras de reset no dashboard oficial.',
    };
  }

  if (program.firm === 'FundingPips') {
    return {
      ...common,
      currency: 'USD',
      maxLots: '20 lotes por clique; cripto: 1 lote por clique.',
      maxTradingDays: 'Sem limite, desde que haja ao menos um trade concluído a cada 30 dias.',
      overnightRule: 'Permitido durante a semana; Master deve fechar antes do fim de semana enquanto a medida temporária estiver ativa.',
      minimumWithdrawal: '1% do tamanho da Master Account, incluindo o split; On Demand exige 2%.',
      scalingPlan: verifyOfficial,
      resetRefundRule: 'Reset com 10% de desconto em até sete dias após breach da evaluation; não vale para inatividade ou Master.',
    };
  }

  if (program.firm === 'FTMO') {
    return {
      ...common,
      currency: 'EUR',
      maxTradingDays: 'Sem prazo máximo publicado para os produtos atuais.',
      overnightRule: 'Standard e Swing diferem; validar o tipo de conta. Swing permite overnight/weekend.',
      minimumWithdrawal: notPublic,
      scalingPlan: 'Scaling Plan disponível mediante critérios oficiais da FTMO.',
      resetRefundRule:
        program.programType === '2-Step'
          ? 'Taxa pode ser reembolsada no primeiro reward quando elegível.'
          : 'Sem reembolso da taxa no 1-Step.',
    };
  }

  if (program.firm === 'The5ers') {
    return {
      ...common,
      currency: 'USD',
      maxTradingDays: 'Sem limite; inatividade de 30 dias.',
      overnightRule: 'Permitido manter posições overnight e no fim de semana.',
      firstPayoutTiming: 'Primeiro payout após 14 dias na funded account.',
      subsequentPayoutTiming: 'A cada 14 dias, sujeito à elegibilidade.',
      minimumWithdrawal: notPublic,
      scalingPlan: 'Escala ao atingir a meta de crescimento prevista no High Stakes.',
      resetRefundRule: verifyOfficial,
    };
  }

  if (program.firm === 'BrightFunded') {
    return {
      ...common,
      currency: 'EUR',
      maxTradingDays: 'Sem prazo máximo publicado; respeitar a regra de inatividade.',
      overnightRule: program.weekendRule,
      minimumWithdrawal: verifyOfficial,
      scalingPlan: 'Revisão contínua; aumento de 30% do saldo original quando os critérios oficiais são cumpridos.',
      resetRefundRule: verifyOfficial,
    };
  }

  if (program.firm === 'ASAP Funding Prop') {
    return {
      ...common,
      currency: 'USD',
      maxTradingDays: 'Sem prazo máximo publicado; inatividade máxima de 15 dias.',
      overnightRule: verifyOfficial,
      minimumWithdrawal: notPublic,
      scalingPlan: notPublic,
      resetRefundRule: verifyOfficial,
    };
  }

  if (program.firm === 'NP Future') {
    return {
      ...common,
      currency: 'USD',
      maxTradingDays: verifyOfficial,
      overnightRule: program.market === 'Futures' ? 'Respeitar a janela operacional BlackArrow/Globex do regulamento.' : verifyOfficial,
      minimumWithdrawal: verifyOfficial,
      scalingPlan: verifyOfficial,
      resetRefundRule: verifyOfficial,
    };
  }

  return common;
}

function normalizeAccount(program: PropFirmRuleProgram, label: string, index: number): RuleAccountSize {
  const row = rowForAccount(program, label, index);
  const overrides = accountOverride(program, label);
  const isFutures = program.market === 'Futures';
  const sourceRefs = officialSourceRefs(program);
  const confidence: EvidenceConfidence = program.confidence ?? 'medium';
  const dataCompleteness: EvidenceCompleteness =
    program.dataCompleteness ?? program.completeness ?? 'partial';
  const monitorability: RuleMonitorability = program.monitorability ?? {
    automatic_mt5: [],
    manual_check: ['Revisar regras e limites no dashboard oficial'],
    not_supported_yet: ['Monitoramento automático não classificado'],
  };
  const payoutDoesNotApply = /não possui na avaliação|sem payout na avaliação/i.test(program.payout);

  return {
    id: `${program.id}-${slugify(label) || `variant-${index + 1}`}`,
    label: explicit(label, verifyOfficial),
    initialBalance: /^\$[\d.]+K$/i.test(label) ? label : explicit(label, notPublic),
    price: overrides.price ?? notPublic,
    currency: overrides.currency ?? notPublic,
    platforms: program.platforms.length > 0 ? [...program.platforms] : [verifyOfficial],
    market: program.market,
    programType: program.programType,
    phases: buildPhases(program, explicit(row.profitTarget, program.profitTarget)),
    dailyLoss: explicit(row.dailyLoss, verifyOfficial),
    maxLoss: explicit(row.maxLoss, verifyOfficial),
    drawdownType: program.drawdownType,
    drawdownCalculation: explicit(program.trailingDescription, verifyOfficial),
    minTradingDays: explicit(program.minTradingDays, verifyOfficial),
    maxTradingDays: overrides.maxTradingDays ?? notPublic,
    maxContracts: overrides.maxContracts ?? (isFutures ? explicit(row.maxContracts, notPublic) : notApplicable),
    maxLots: overrides.maxLots ?? (!isFutures ? explicit(row.maxContracts, notPublic) : notApplicable),
    leverage: explicit(program.leverage, notPublic),
    newsRule: explicit(program.newsRule, verifyOfficial),
    weekendRule: explicit(program.weekendRule, verifyOfficial),
    overnightRule: overrides.overnightRule ?? explicit(program.weekendRule, verifyOfficial),
    eaRule: overrides.eaRule ?? verifyOfficial,
    copyTradingRule: overrides.copyTradingRule ?? verifyOfficial,
    consistencyRule: explicit(program.consistencyRule, verifyOfficial),
    bestDayRule: overrides.bestDayRule ?? bestDayRule(program),
    inactivityRule: overrides.inactivityRule ?? inactivityRule(program),
    payoutSplit: overrides.payoutSplit ?? payoutSplit(program),
    firstPayoutTiming: overrides.firstPayoutTiming ?? payoutTiming(program),
    subsequentPayoutTiming: overrides.subsequentPayoutTiming ?? payoutTiming(program),
    minimumWithdrawal: overrides.minimumWithdrawal ?? (payoutDoesNotApply ? notApplicable : notPublic),
    scalingPlan: overrides.scalingPlan ?? notPublic,
    resetRefundRule: overrides.resetRefundRule ?? notPublic,
    kycRule: overrides.kycRule ?? verifyOfficial,
    prohibitedPractices:
      program.prohibitedPractices && program.prohibitedPractices.length > 0
        ? [...program.prohibitedPractices]
        : [verifyOfficial],
    breachConditions:
      program.riskRules.length > 0
        ? [...program.riskRules]
        : ['Tocar ou ultrapassar um limite crítico encerra ou restringe a conta conforme o programa.'],
    sourceRefs: sourceRefs.length > 0 ? sourceRefs : [program.officialSourceUrl],
    lastReviewedAt: reviewedAt,
    confidence,
    dataCompleteness,
    monitorability: {
      automatic_mt5: [...monitorability.automatic_mt5],
      manual_check: [...monitorability.manual_check],
      not_supported_yet: [...monitorability.not_supported_yet],
    },
    notes: [row.notes, ...program.notes].filter((note): note is string => Boolean(note?.trim())),
    conflicts: (program.conflicts ?? []).map(
      (conflict) => `${conflict.field}: ${conflict.summary} Valor adotado: ${conflict.preferredValue}.`,
    ),
    versions: normalizeVersions(program, overrides.versions ?? versionsFor(program)),
  };
}

export type AccountLevelPropFirmRuleProgram = PropFirmRuleProgram & {
  firmSlug: string;
  programSlug: string;
  officialSourceUrls: string[];
  accountLevelRules: RuleAccountSize[];
};

export function normalizeAccountLevelPrograms(
  programs: PropFirmRuleProgram[],
): AccountLevelPropFirmRuleProgram[] {
  return programs.map((program) => {
    const unavailable = program.evidenceStatus === 'official_source_unavailable';
    const firmSlug = program.firmSlug ?? slugify(program.firm);
    const officialSourceUrls = officialSourceRefs(program);

    return {
      ...program,
      firmSlug,
      programSlug: program.programSlug ?? program.id,
      officialSourceUrls:
        officialSourceUrls.length > 0 ? officialSourceUrls : [program.officialSourceUrl],
      confidence: program.confidence ?? 'medium',
      completeness: program.completeness ?? 'partial',
      dataCompleteness: program.dataCompleteness ?? program.completeness ?? 'partial',
      evidenceStatus: program.evidenceStatus ?? 'verified',
      accountLevelRules: unavailable
        ? []
        : program.accountSizes.map((label, index) => normalizeAccount(program, label, index)),
    };
  });
}
