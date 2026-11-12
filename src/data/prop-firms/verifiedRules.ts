// GERADO a partir da conferência nas fontes oficiais (pesquisa de 2026-11-12).
// Consistência estruturada por programa + documento oficial. Revisar à mão as
// condições em português (campo `condition`) a cada nova conferência.
import type { ConsistencyClause } from '../../../services/metaapi-gateway/src/ruleEngine/bindingTypes';

export interface VerifiedProgramRules {
  verifiedAt: string;
  stillSold: boolean | null;
  officialDocumentUrl: string | null;
  /** A página/PDF oficial abre embutida (a mesa não bloqueia iframe). */
  embeddable: boolean;
  consistency: ConsistencyClause[];
}

export const verifiedProgramRules: Record<string, VerifiedProgramRules> = {
  // Challenge Express
  "asap-challenge-express": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://asapfundingprop.com/pt/termos/",
    embeddable: true,
    consistency: [
    ],
  },
  // Funded Express
  "asap-funded-express": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://asapfundingprop.com/pt/termos/",
    embeddable: true,
    consistency: [
      { appliesTo: "funded", kind: "largest_trade_vs_net_profit", percent: 33, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Trade Value Score. A mesa não define o ciclo.", estimated: true, officialText: "O maior trade lucrativo não poderá representar mais de 33% do lucro líquido total do ciclo analisado.", sourceUrl: "https://asapfundingprop.com/pt/termos/" },
    ],
  },
  // Instant Account
  "asap-instant-account": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://asapfundingprop.com/pt/termos/",
    embeddable: true,
    consistency: [
      { appliesTo: "funded", kind: "largest_trade_vs_net_profit", percent: 33, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Trade Value Score. A mesa não define o ciclo.", estimated: true, officialText: "O maior trade lucrativo não poderá representar mais de 33% do lucro líquido total do ciclo analisado.", sourceUrl: "https://asapfundingprop.com/pt/termos/" },
    ],
  },
  // Standard - BlackArrow
  "npfuture-standard-blackarrow": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://npfuture.com/regulamento/",
    embeddable: true,
    consistency: [
      { appliesTo: "evaluation", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "soft", condition: "Na avaliação.", estimated: true, officialText: "O maior dia de lucro da avaliação não poderá representar mais de 40% do lucro total acumulado para aprovação.", sourceUrl: "https://npfuture.com/regulamento/" },
    ],
  },
  // Standard - MT5
  "npfuture-standard-mt5": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://npfuture.com/regulamento/",
    embeddable: true,
    consistency: [
      { appliesTo: "evaluation", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "soft", condition: "Na avaliação.", estimated: true, officialText: "O maior dia de lucro da avaliação não poderá representar mais de 40% do lucro total acumulado para aprovação.", sourceUrl: "https://npfuture.com/regulamento/" },
    ],
  },
  // Funded - BlackArrow
  "npfuture-funded-blackarrow": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://npfuture.com/regulamento/",
    embeddable: true,
    consistency: [
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 30, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "No saque.", estimated: true, officialText: "O maior dia de lucro considerado na solicitação não poderá representar mais de 30% do lucro total elegível disponível considerado para o payout.", sourceUrl: "https://npfuture.com/regulamento/" },
    ],
  },
  // Funded - MT5
  "npfuture-funded-mt5": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://npfuture.com/regulamento/",
    embeddable: true,
    consistency: [
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 30, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "No saque.", estimated: true, officialText: "O maior dia de lucro considerado na solicitação não poderá representar mais de 30% do lucro total elegível disponível considerado para o payout.", sourceUrl: "https://npfuture.com/regulamento/" },
    ],
  },
  // Flash - BlackArrow
  "npfuture-flash-blackarrow": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://npfuture.com/regulamento/",
    embeddable: true,
    consistency: [
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 20, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "No saque.", estimated: true, officialText: "Em qualquer ciclo, o maior dia de lucro não poderá representar mais de 20% do lucro total elegível do ciclo.", sourceUrl: "https://npfuture.com/regulamento/" },
    ],
  },
  // Flash - MT5
  "npfuture-flash-mt5": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://npfuture.com/regulamento/",
    embeddable: true,
    consistency: [
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 20, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "No saque.", estimated: true, officialText: "Em qualquer ciclo, o maior dia de lucro não poderá representar mais de 20% do lucro total elegível do ciclo.", sourceUrl: "https://npfuture.com/regulamento/" },
    ],
  },
  // FTMO Challenge 1-Step
  "ftmo-challenge-1-step-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://cdn.ftmo.com/docs%2Fterms-and-conditions%2F118cdaed571a48529431ffa6ff28a91b",
    embeddable: false,
    consistency: [
      // fonte: Contas de ordens criadas em/após 12 Oct 2026 (ou contas mescladas a partir dessa data). Aplica-se para passar no Challenge 1-Step e para elegibilidade
      { appliesTo: "both", kind: "best_day_vs_total_profit", percent: 50, amount: null, days: null, minDayProfitPercent: null, effect: "soft", condition: "Ordens de 12/10/2026 em diante. Lucro total inclui dias negativos.", estimated: false, officialText: "the Consistency rule requires that your Best Day does not represent more than 50% of your total profit.", sourceUrl: "https://ftmo.com/en/trading-objectives/" },
    ],
  },
  // FTMO Challenge 2-Step
  "ftmo-challenge-2-step-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://cdn.ftmo.com/docs%2Fterms-and-conditions%2F118cdaed571a48529431ffa6ff28a91b",
    embeddable: false,
    consistency: [
    ],
  },
  // EOD Trailing Drawdown Evaluation
  "apex-eod-evaluation-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-evaluations/",
    embeddable: false,
    consistency: [
      // fonte: Performance Account (PA), apurado desde o último payout aprovado
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 50, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Na conta PA, desde o último saque.", estimated: true, officialText: "No single profitable trading day may account for 50% or more of total profit earned since your last approved payout.", sourceUrl: "https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-payouts/" },
    ],
  },
  // Intraday Trailing Drawdown Evaluation
  "apex-intraday-evaluation-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://apextraderfunding.com/help-center/evaluation-accounts-ea/intraday-trailing-drawdown-evaluations/",
    embeddable: false,
    consistency: [
      // fonte: Performance Account (PA), apurado desde o último payout aprovado
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 50, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Na conta PA, desde o último saque.", estimated: true, officialText: "No single profitable trading day may account for 50% or more of total profit earned since your last approved payout.", sourceUrl: "https://apextraderfunding.com/help-center/intraday-trailing-drawdown-accounts/intraday-trailing-drawdown-payouts/" },
    ],
  },
  // Instant Funding
  "hantec-instant-funding-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.rzrfunded.com/en/support/solutions/articles/158000470345-instant-funding",
    embeddable: true,
    consistency: [
    ],
  },
  // Express Challenge
  "hantec-express-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.rzrfunded.com/en/support/solutions/articles/158000470340-express-1-step-",
    embeddable: true,
    consistency: [
    ],
  },
  // Enhanced Challenge
  "hantec-enhanced-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.rzrfunded.com/en/support/solutions/articles/158000470342-enhanced-2-step-",
    embeddable: true,
    consistency: [
      { appliesTo: "both", kind: "profitable_days", percent: null, amount: null, days: 3, minDayProfitPercent: 0.5, effect: "blocks_pass", condition: "Na avaliação e em cada ciclo de saque.", estimated: true, officialText: "A minimum of 3 profitable days is required at each stage to progress or become eligible for a payout.", sourceUrl: "https://help.rzrfunded.com/en/support/solutions/articles/158000470342-enhanced-2-step-" },
    ],
  },
  // EnhancedX Challenge
  "hantec-enhancedx-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.rzrfunded.com/en/support/solutions/articles/158000470343-enhancedx-2-step-consistency-",
    embeddable: true,
    consistency: [
      // fonte: Na fase Challenge pode ser removida com add-on 'Remove Consistency Stage 1 & 2' (o add-on é 'CHALLENGE PHASE ONLY', o que implica que segue valendo no
      { appliesTo: "both", kind: "best_day_vs_total_profit", percent: 35, amount: null, days: null, minDayProfitPercent: null, effect: "soft", condition: "No Challenge pode ser removida com add-on.", estimated: true, officialText: "The consistency requirement is 35% and is based on end of day (00:00 server time) equity.", sourceUrl: "https://help.rzrfunded.com/en/support/solutions/articles/158000470343-enhancedx-2-step-consistency-" },
    ],
  },
  // Trading Combine
  "topstep-trading-combine-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.topstep.com/en/articles/8284208-consistency-at-topstep",
    embeddable: false,
    consistency: [
      { appliesTo: "evaluation", kind: "best_day_vs_profit_target", percent: 55, amount: null, days: null, minDayProfitPercent: null, effect: "raises_target", condition: "Só no Combine.", estimated: true, officialText: "Your single best day of profit must stay at or below 55% of your Profit Target. If it exceeds that, your Profit Target increases.", sourceUrl: "https://help.topstep.com/en/articles/8284208-consistency-at-topstep" },
      // fonte: Somente na XFA se o trader escolher o caminho de payout 'Consistency' na ativação (o caminho 'Standard' exige 5 winning days de $150+).
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Só na XFA com o caminho de saque Consistency (3 dias).", estimated: false, officialText: "Your Consistency % must be 40% or below to be Payout eligible.", sourceUrl: "https://help.topstep.com/en/articles/8284208-consistency-at-topstep" },
    ],
  },
  // Prime Futures Challenge
  "trading-pit-prime-futures-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://www.thetradingpit.com/futures",
    embeddable: false,
    consistency: [
      // fonte: Accounts created on/after 14 July 2026: new target = Highest Day / 0.40. Accounts created before 14 July 2026: amount over the 40% cap is added to the
      { appliesTo: "evaluation", kind: "best_day_vs_profit_target", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "raises_target", condition: "Só no Challenge. Contas de 14/07/2026 em diante: meta = melhor dia ÷ 40%.", estimated: true, officialText: "Your highest trading day is capped at 40% of your Profit Target; going over simply raises the target. ... Applies to the Challenge only — never to a Futures Earning Account — and it never fails your account. ... the target is recalculated so your highest day equals 40% of it (Highest Day ÷ 0.40 = ne", sourceUrl: "https://support.thetradingpit.com/what-is-the-40-consistency-rule-for-your-challenges-0" },
    ],
  },
  // CFD Prime 1-Phase
  "trading-pit-prime-cfd-one-step-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "http://client-area.thetradingpit.com/quick-checkout/challenge/cfd?country=BR",
    embeddable: false,
    consistency: [
      // fonte: Only 1-Phase $100K and $200K accounts created on/after 6 July 2026 (reward policy page says 'after 5 July 2026' — official date conflict). Other sizes
      { appliesTo: "both", kind: "best_day_vs_total_profit", percent: 50, amount: null, days: null, minDayProfitPercent: null, effect: "soft", condition: "Só contas de US$ 100 mil e US$ 200 mil criadas a partir de 06/07/2026.", estimated: false, officialText: "The consistency rule requires that your Best Day does not represent more than 50% of your Positive Days' Profit. ... Going over 50% does not fail your account.", sourceUrl: "https://support.thetradingpit.com/en/articles/835084" },
    ],
  },
  // 1 Step Model
  "fundingpips-one-step-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.fundingpips.com/hc/en-us/articles/48982278587665-1-Step-Model",
    embeddable: false,
    consistency: [
      // fonte: Only for the On Demand (90%) reward cycle; resets after each reward; min On Demand reward 2% of Master Account Size.
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 35, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Só no saque On Demand. Zera a cada saque.", estimated: true, officialText: "A 35% consistency score must be achieved: no single trading day can account for more than 35% of total profit.", sourceUrl: "https://help.fundingpips.com/hc/en-us/articles/48982278587665-1-Step-Model" },
    ],
  },
  // 2 Step Standard
  "fundingpips-two-step-standard-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.fundingpips.com/hc/en-us/articles/34501809112081-2-Step-Standard",
    embeddable: false,
    consistency: [
      // fonte: Only On Demand (100%) reward cycle; Weekly and Bi-Weekly not subject; resets after each processed reward.
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 35, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Só no saque On Demand. Zera a cada saque.", estimated: true, officialText: "no single trading day can account for more than 35% of total profit", sourceUrl: "https://help.fundingpips.com/hc/en-us/articles/34501809112081-2-Step-Standard" },
      // fonte: On Demand reward cycle eligibility; resets after each processed reward.
      { appliesTo: "funded", kind: "profitable_days", percent: null, amount: null, days: 7, minDayProfitPercent: 0.5, effect: "blocks_payout", condition: "Só no saque On Demand. Zera a cada saque.", estimated: true, officialText: "You need at least 7 profitable days to qualify for a reward, each with 0.5% or more profit of the starting Master Account Size.", sourceUrl: "https://help.fundingpips.com/hc/en-us/articles/34501809112081-2-Step-Standard" },
    ],
  },
  // Stellar 1-Step
  "fundednext-stellar-one-step-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fundednext.com/cfds/stellar-1-step",
    embeddable: false,
    consistency: [
    ],
  },
  // Stellar 2-Step
  "fundednext-stellar-two-step-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fundednext.com/cfds/stellar-2-step",
    embeddable: false,
    consistency: [
      // fonte: Only if trader selects the built-in On-Demand Performance Reward option (90% share); also requires >= 2% account growth; evaluated only when an on-dem
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Só no saque On-Demand, que também pede 2% de crescimento.", estimated: true, officialText: "Highest Profit Contribution = (Highest Profit Day / Total Profit) × 100% ... best trading day's profit should not exceed 40% of your total generated profit ... it is only evaluated when you submit an on-demand request.", sourceUrl: "https://help.fundednext.com/en/articles/15586820-does-fundednext-cfds-offer-on-demand-performance-rewards" },
      // fonte: Only if trader selects the '3 Day Performance Reward' option (60% share): at least 3 profitable trading days per 3-day cycle, each >= 1% profit.
      { appliesTo: "funded", kind: "profitable_days", percent: null, amount: null, days: 3, minDayProfitPercent: 1, effect: "blocks_payout", condition: "Só na opção de saque a cada 3 dias.", estimated: true, officialText: "", sourceUrl: "https://help.fundednext.com/en/articles/10701585-how-often-will-i-receive-my-performance-reward" },
    ],
  },
  // High Stakes New
  "the5ers-high-stakes-new-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://the5ers.com/high-stakes/",
    embeddable: false,
    consistency: [
      // fonte: Each step (and for Pro scaling).
      { appliesTo: "evaluation", kind: "profitable_days", percent: null, amount: null, days: 3, minDayProfitPercent: 0.5, effect: "blocks_pass", condition: "Em cada fase.", estimated: false, officialText: "Minimum (Midnight Balance or Midnight Equity- whichever is the lowest) – Previous Day Balance", sourceUrl: "https://the5ers.com/high-stakes/" },
    ],
  },
  // High Stakes Classic
  "the5ers-high-stakes-classic-2026": {
    verifiedAt: '2026-11-12',
    stillSold: null,
    officialDocumentUrl: "https://the5ers.com/high-stakes/",
    embeddable: false,
    consistency: [
      // fonte: Each step.
      { appliesTo: "evaluation", kind: "profitable_days", percent: null, amount: null, days: 3, minDayProfitPercent: 0.5, effect: "blocks_pass", condition: "Em cada fase.", estimated: false, officialText: "Minimum (Midnight Balance or Midnight Equity- whichever is the lowest) – Previous Day Balance", sourceUrl: "https://the5ers.com/high-stakes/" },
    ],
  },
  // One Phase
  "fxify-one-phase-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fxify.com/faqs/all-faqs/what-are-the-rules-for-the-assessment-account/",
    embeddable: false,
    consistency: [
    ],
  },
  // Two Phase Standard
  "fxify-two-phase-standard-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fxify.com/faqs/all-faqs/what-are-the-rules-for-the-assessment-account/",
    embeddable: false,
    consistency: [
    ],
  },
  // Two Phase Classic
  "fxify-two-phase-classic-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fxify.com/blog/introducing-fxify-2-phase-pro/",
    embeddable: false,
    consistency: [
      // fonte: Required total profit = Highest Daily Profit / 0.25; Highest Daily Profit does NOT reset after a withdrawal.
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 25, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Melhor dia não zera depois do saque.", estimated: true, officialText: "The Highest Daily Profit divided by the consistency percentage equals the total profit required. ... the Highest Daily Profit does not reset after a withdrawal on the programmes that carry a consistency rule. ... The consistency rule does not breach the account. It delays the payout until the profit", sourceUrl: "https://fxify.com/blog/why-most-traders-never-get-a-payout/" },
    ],
  },
  // Two Phase Pro
  "fxify-two-phase-pro-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fxify.com/blog/introducing-fxify-2-phase-pro/",
    embeddable: false,
    consistency: [
      // fonte: Daily profit cap of $4,000. Official text does NOT say profit above the cap is excluded from the target — it is a trading lock, not a counted-profit c
      { appliesTo: "both", kind: "daily_profit_cap", percent: null, amount: 4000, days: null, minDayProfitPercent: null, effect: "locks_trading", condition: "Passou de US$ 4.000 no dia, a conta trava até o dia seguinte.", estimated: true, officialText: "If total daily profit goes above $4,000, the account moves into read-only mode for the rest of that trading day.", sourceUrl: "https://fxify.com/blog/introducing-fxify-2-phase-pro/" },
      // fonte: Per phase; also applies in funded stage.
      { appliesTo: "both", kind: "profitable_days", percent: null, amount: null, days: 3, minDayProfitPercent: 0.5, effect: "blocks_pass", condition: "Em cada fase e no funded.", estimated: true, officialText: "A trading day only counts if the account closes the day in at least +0.5% profit.", sourceUrl: "https://fxify.com/blog/introducing-fxify-2-phase-pro/" },
    ],
  },
  // Three Phase
  "fxify-three-phase-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fxify.com/faqs/all-faqs/what-are-the-rules-for-the-assessment-account/",
    embeddable: false,
    consistency: [
    ],
  },
  // Instant Funding
  "fxify-instant-funding-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fxify.com/faqs/instant-funded-faq/",
    embeddable: false,
    consistency: [
    ],
  },
  // Instant Funding Lite
  "fxify-instant-funding-lite-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fxify.com/blog/introducing-fxify-instant-funding-lite/",
    embeddable: false,
    consistency: [
      // fonte: Required total = best day / 0.20; Highest Daily Profit does not reset after withdrawal (Sept 2026 blog).
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 20, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Melhor dia não zera depois do saque.", estimated: true, officialText: "No single trading day can account for more than 20% of total realised gains. ... based on daily closed profits, not individual trades.", sourceUrl: "https://fxify.com/blog/introducing-fxify-instant-funding-lite/" },
    ],
  },
  // Lightning Challenge
  "fxify-lightning-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://fxify.com/faqs/all-faqs/lightning-plan/lighting-plan-whats-the-consistency-rule/",
    embeddable: false,
    consistency: [
      // fonte: Applies in Challenge (blocks pass until met within the 5-day window) and Live stage (delays payout). Required total = best day / 0.30; does not reset 
      { appliesTo: "both", kind: "best_day_vs_total_profit", percent: 30, amount: null, days: null, minDayProfitPercent: null, effect: "soft", condition: "No Challenge e no funded. Melhor dia não zera depois do saque.", estimated: true, officialText: "Profits from any single trading day cannot exceed 30% of the total profits made. ... This rule applies to both the Challenge and Live stages.", sourceUrl: "https://fxify.com/faqs/all-faqs/lightning-plan/lighting-plan-whats-the-consistency-rule/" },
    ],
  },
  // E8 One Forex
  "e8-one-forex-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.e8markets.com/en/articles/11775980-e8-one",
    embeddable: false,
    consistency: [
      // fonte: Performance (funded) stage; profit window = current payout cycle only (resets after each payout; profit left from previous cycle excluded)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Conta só o ciclo de saque atual.", estimated: true, officialText: "With a 40% best-day rule, you must ensure that no single trading day exceeds more than 40% of your total generated profits.", sourceUrl: "https://help.e8markets.com/en/articles/10450125-40-best-day-rule" },
    ],
  },
  // E8 One Crypto
  "e8-one-crypto-2026": {
    verifiedAt: '2026-11-12',
    stillSold: false,
    officialDocumentUrl: "https://help.e8markets.com/en/articles/11775980-e8-one",
    embeddable: false,
    consistency: [
      // fonte: Performance (funded) stage; profit window = current payout cycle only (resets after each payout; profit left from previous cycle excluded)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Conta só o ciclo de saque atual.", estimated: true, officialText: "With a 40% best-day rule, you must ensure that no single trading day exceeds more than 40% of your total generated profits.", sourceUrl: "https://help.e8markets.com/en/articles/10450125-40-best-day-rule" },
    ],
  },
  // E8 Pro Forex
  "e8-pro-forex-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.e8markets.com/en/articles/15274219-e8-pro",
    embeddable: false,
    consistency: [
      // fonte: Applies in Challenge and Performance stages
      { appliesTo: "both", kind: "daily_profit_cap", percent: 2, amount: null, days: null, minDayProfitPercent: null, effect: "caps_counted_profit", condition: "No Challenge e no funded.", estimated: false, officialText: "2% Daily Profit cap - In each day, only 2% counts toward the target or profit. You can make more than 2% in a day, but only 2% of the initial balance per day counts toward the profit target or profit.", sourceUrl: "https://intercom.help/e8/en/articles/15319043-daily-profit-cap" },
    ],
  },
  // E8 Pro Crypto
  "e8-pro-crypto-2026": {
    verifiedAt: '2026-11-12',
    stillSold: false,
    officialDocumentUrl: "https://help.e8markets.com/en/articles/15274219-e8-pro",
    embeddable: false,
    consistency: [
      // fonte: Applies in Challenge and Performance stages
      { appliesTo: "both", kind: "daily_profit_cap", percent: 2, amount: null, days: null, minDayProfitPercent: null, effect: "caps_counted_profit", condition: "No Challenge e no funded.", estimated: false, officialText: "2% Daily Profit cap - In each day, only 2% counts toward the target or profit. You can make more than 2% in a day, but only 2% of the initial balance per day counts toward the profit target or profit.", sourceUrl: "https://intercom.help/e8/en/articles/15319043-daily-profit-cap" },
    ],
  },
  // E8 Signature Forex
  "e8-signature-forex-2026": {
    verifiedAt: '2026-11-12',
    stillSold: false,
    officialDocumentUrl: "https://help.e8markets.com/en/articles/11755943-e8-signature",
    embeddable: false,
    consistency: [
      // fonte: Performance stage; computed on profits of the current payout cycle only (resets after each payout)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 35, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Conta só o ciclo de saque atual.", estimated: true, officialText: "35% Best Day rule - With a 35% best-day rule, you must ensure that no single trading day exceeds more than 35% of your total generated profits.", sourceUrl: "https://help.e8markets.com/en/articles/11755943-e8-signature" },
      // fonte: Between payouts only; not required for the first payout
      { appliesTo: "funded", kind: "profitable_days", percent: null, amount: null, days: 5, minDayProfitPercent: 0.3, effect: "blocks_payout", condition: "Entre saques; não vale para o primeiro.", estimated: true, officialText: "Minimum profitable days between each payout: 5 (does not apply for first payout)", sourceUrl: "https://help.e8markets.com/en/articles/11755943-e8-signature" },
    ],
  },
  // E8 Signature Crypto
  "e8-signature-crypto-2026": {
    verifiedAt: '2026-11-12',
    stillSold: false,
    officialDocumentUrl: "https://help.e8markets.com/en/articles/11755943-e8-signature",
    embeddable: false,
    consistency: [
      // fonte: Performance stage; computed on profits of the current payout cycle only (resets after each payout)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 35, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Conta só o ciclo de saque atual.", estimated: true, officialText: "35% Best Day rule - With a 35% best-day rule, you must ensure that no single trading day exceeds more than 35% of your total generated profits.", sourceUrl: "https://help.e8markets.com/en/articles/11755943-e8-signature" },
      // fonte: Between payouts only; not required for the first payout
      { appliesTo: "funded", kind: "profitable_days", percent: null, amount: null, days: 5, minDayProfitPercent: 0.3, effect: "blocks_payout", condition: "Entre saques; não vale para o primeiro.", estimated: true, officialText: "Minimum profitable days between each payout: 5 (does not apply for first payout)", sourceUrl: "https://help.e8markets.com/en/articles/11755943-e8-signature" },
    ],
  },
  // E8 Signature Futures
  "e8-signature-futures-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.e8markets.com/en/articles/11755943-e8-signature",
    embeddable: false,
    consistency: [
      // fonte: Performance stage; computed on profits of the current payout cycle only (resets after each payout)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 35, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Conta só o ciclo de saque atual.", estimated: true, officialText: "35% Best Day rule - With a 35% best-day rule, you must ensure that no single trading day exceeds more than 35% of your total generated profits.", sourceUrl: "https://help.e8markets.com/en/articles/11755943-e8-signature" },
      // fonte: Between payouts only; not required for the first payout
      { appliesTo: "funded", kind: "profitable_days", percent: null, amount: null, days: 5, minDayProfitPercent: 0.3, effect: "blocks_payout", condition: "Entre saques; não vale para o primeiro.", estimated: true, officialText: "Minimum profitable days between each payout: 5 (does not apply for first payout)", sourceUrl: "https://help.e8markets.com/en/articles/11755943-e8-signature" },
    ],
  },
  // E8 Zero Futures Starter
  "e8-zero-futures-starter-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://helpfutures.e8markets.com/en/articles/15935817-e8-zero-starter-and-max",
    embeddable: false,
    consistency: [
      // fonte: Challenge stage only
      { appliesTo: "evaluation", kind: "best_day_vs_profit_target", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "raises_target", condition: "Só no Challenge. Meta = melhor dia ÷ 40%.", estimated: true, officialText: "Your profit should not exceed 40% of the total profit target in a single day. If it does, your profit target increases by the amount you made over that limit.", sourceUrl: "https://helpfutures.e8markets.com/en/articles/15936479-40-best-day-rule-challenge" },
    ],
  },
  // E8 Zero Futures Max
  "e8-zero-futures-max-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://helpfutures.e8markets.com/en/articles/15935817-e8-zero-starter-and-max",
    embeddable: false,
    consistency: [
      // fonte: Challenge stage only
      { appliesTo: "evaluation", kind: "best_day_vs_profit_target", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "raises_target", condition: "Só no Challenge. Meta = melhor dia ÷ 40%.", estimated: true, officialText: "Your profit should not exceed 40% of the total profit target in a single day. If it does, your profit target increases by the amount you made over that limit.", sourceUrl: "https://helpfutures.e8markets.com/en/articles/15936479-40-best-day-rule-challenge" },
    ],
  },
  // 2-Step Bright
  "brightfunded-two-step-bright-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.brightfunded.com/en/articles/9241611-what-are-the-current-rules-for-the-evaluation-process",
    embeddable: false,
    consistency: [
    ],
  },
  // 2-Step Classic
  "brightfunded-two-step-classic-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.brightfunded.com/en/articles/9241611-what-are-the-current-rules-for-the-evaluation-process",
    embeddable: false,
    consistency: [
    ],
  },
  // 1-Step
  "brightfunded-one-step-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://help.brightfunded.com/en/articles/9241611-what-are-the-current-rules-for-the-evaluation-process",
    embeddable: false,
    consistency: [
    ],
  },
  // Alpha Pro 10%
  "alpha-capital-pro-10-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://alphacapitalgroup.uk/assets/terms-and-conditions.pdf",
    embeddable: false,
    consistency: [
      // fonte: Only with the On-Demand performance fee option (not with Bi-weekly)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Só no saque On-Demand.", estimated: true, officialText: "Alpha Pro, Swing, One, and Three: 40%", sourceUrl: "https://help.alphacapitalgroup.uk/en/articles/10102634-on-demand-performance-fee" },
    ],
  },
  // Alpha Pro 8%
  "alpha-capital-pro-8-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://alphacapitalgroup.uk/assets/terms-and-conditions.pdf",
    embeddable: false,
    consistency: [
      // fonte: Only with the On-Demand performance fee option (not with Bi-weekly)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Só no saque On-Demand.", estimated: true, officialText: "Alpha Pro, Swing, One, and Three: 40%", sourceUrl: "https://help.alphacapitalgroup.uk/en/articles/10102634-on-demand-performance-fee" },
    ],
  },
  // Alpha Pro 6%
  "alpha-capital-pro-6-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://alphacapitalgroup.uk/assets/terms-and-conditions.pdf",
    embeddable: false,
    consistency: [
      // fonte: Only with the On-Demand performance fee option (not with Bi-weekly)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Só no saque On-Demand.", estimated: true, officialText: "Alpha Pro, Swing, One, and Three: 40%", sourceUrl: "https://help.alphacapitalgroup.uk/en/articles/10102634-on-demand-performance-fee" },
    ],
  },
  // Alpha Swing
  "alpha-capital-swing-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://alphacapitalgroup.uk/assets/terms-and-conditions.pdf",
    embeddable: false,
    consistency: [
      // fonte: Always on this plan (Swing is available only with the On-Demand payout type)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Sempre (o Swing só tem saque On-Demand).", estimated: true, officialText: "Alpha Pro, Swing, One, and Three: 40%", sourceUrl: "https://help.alphacapitalgroup.uk/en/articles/10102634-on-demand-performance-fee" },
    ],
  },
  // Alpha One
  "alpha-capital-one-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://alphacapitalgroup.uk/assets/terms-and-conditions.pdf",
    embeddable: false,
    consistency: [
      // fonte: Only with the On-Demand performance fee option (not with Bi-weekly)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Só no saque On-Demand.", estimated: true, officialText: "Alpha Pro, Swing, One, and Three: 40%", sourceUrl: "https://help.alphacapitalgroup.uk/en/articles/10102634-on-demand-performance-fee" },
    ],
  },
  // Alpha Three
  "alpha-capital-three-2026": {
    verifiedAt: '2026-11-12',
    stillSold: true,
    officialDocumentUrl: "https://alphacapitalgroup.uk/assets/terms-and-conditions.pdf",
    embeddable: false,
    consistency: [
      // fonte: Only with the On-Demand performance fee option (not with Bi-weekly)
      { appliesTo: "funded", kind: "best_day_vs_total_profit", percent: 40, amount: null, days: null, minDayProfitPercent: null, effect: "blocks_payout", condition: "Só no saque On-Demand.", estimated: true, officialText: "Alpha Pro, Swing, One, and Three: 40%", sourceUrl: "https://help.alphacapitalgroup.uk/en/articles/10102634-on-demand-performance-fee" },
    ],
  },
};
