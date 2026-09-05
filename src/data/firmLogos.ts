import type { PropFirmName } from '@/data/propFirmRules';
import logoFtmo from '@/assets/brands/ftmo.svg';
import logoAlphaCapitalGroup from '@/assets/brands/alpha-capital-group.svg';
import logoBrightFunded from '@/assets/brands/brightfunded.png';
import logoFundedNext from '@/assets/brands/fundednext.png';
import logoHantecTrader from '@/assets/brands/hantec-trader.svg';
import logoFxify from '@/assets/brands/fxify.svg';
import logoTopstep from '@/assets/brands/topstep.webp';
import logoTheTradingPit from '@/assets/brands/the-trading-pit.svg';
import logoApexTraderFunding from '@/assets/brands/apex-trader-funding.svg';
import logoE8Markets from '@/assets/brands/e8-markets.svg';
import logoThe5ers from '@/assets/brands/the5ers.png';
import logoAsapFundingProp from '@/assets/brands/asap-funding-prop.svg';
import logoFundingPips from '@/assets/brands/fundingpips.jpg';
import logoNpFuture from '@/assets/brands/np-future.png';

// Real, first-party firm logos we were able to source (official press kit / brand-assets page
// or the firm's own site header). Firms without an entry here fall back to the generic icon —
// see the task report for why each one is missing (Cloudflare/bot-protected site, no logo asset
// published, etc). Keyed by the exact PropFirmName display string.
export const firmLogos: Partial<Record<PropFirmName, string>> = {
  FTMO: logoFtmo,
  'Alpha Capital Group': logoAlphaCapitalGroup,
  BrightFunded: logoBrightFunded,
  FundedNext: logoFundedNext,
  'Hantec Trader': logoHantecTrader,
  FXIFY: logoFxify,
  Topstep: logoTopstep,
  'The Trading Pit': logoTheTradingPit,
  'Apex Trader Funding': logoApexTraderFunding,
  'E8 Markets': logoE8Markets,
  The5ers: logoThe5ers,
  'ASAP Funding Prop': logoAsapFundingProp,
  // App-icon mark (Apple App Store listing, official FundingPips developer account) — their
  // own site's asset paths are blocked by a Vercel Security Checkpoint bot-challenge even
  // though the HTML document itself loads, see task report.
  FundingPips: logoFundingPips,
  // Favicon — NP Future's site header is text-only (no logo image anywhere on the page), this
  // 300x300 brand mark is the best first-party asset available, see task report.
  'NP Future': logoNpFuture,
};
