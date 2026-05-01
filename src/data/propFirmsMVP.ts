// Static MVP prop firm presets — used to pre-fill rules in Create Account.
// Values are PERCENTAGES of starting balance.

export interface PropFirmPreset {
  name: string;
  programs: ProgramPreset[];
}

export interface ProgramPreset {
  name: string;
  phases: PhasePreset[];
}

export interface PhasePreset {
  name: string;
  dailyLossPct: number;
  totalLossPct: number;
  profitTargetPct: number;
  minTradingDays: number;
}

export const PROP_FIRMS: PropFirmPreset[] = [
  {
    name: 'FTMO',
    programs: [
      {
        name: 'Challenge',
        phases: [
          { name: 'Phase 1', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 10, minTradingDays: 4 },
          { name: 'Phase 2 (Verification)', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 5, minTradingDays: 4 },
          { name: 'Funded', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 0, minTradingDays: 0 },
        ],
      },
    ],
  },
  {
    name: 'FundingPips',
    programs: [
      {
        name: 'Evaluation 2-Step',
        phases: [
          { name: 'Phase 1', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 8, minTradingDays: 3 },
          { name: 'Phase 2', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 5, minTradingDays: 3 },
          { name: 'Funded', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 0, minTradingDays: 0 },
        ],
      },
    ],
  },
  {
    name: 'FXIFY',
    programs: [
      {
        name: '1-Phase',
        phases: [
          { name: 'Evaluation', dailyLossPct: 3, totalLossPct: 6, profitTargetPct: 10, minTradingDays: 0 },
          { name: 'Funded', dailyLossPct: 3, totalLossPct: 6, profitTargetPct: 0, minTradingDays: 0 },
        ],
      },
      {
        name: '2-Phase',
        phases: [
          { name: 'Phase 1', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 8, minTradingDays: 0 },
          { name: 'Phase 2', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 5, minTradingDays: 0 },
          { name: 'Funded', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 0, minTradingDays: 0 },
        ],
      },
    ],
  },
  {
    name: 'The5ers',
    programs: [
      {
        name: 'High Stakes',
        phases: [
          { name: 'Phase 1', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 8, minTradingDays: 3 },
          { name: 'Phase 2', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 5, minTradingDays: 3 },
          { name: 'Funded', dailyLossPct: 4, totalLossPct: 8, profitTargetPct: 0, minTradingDays: 0 },
        ],
      },
    ],
  },
  {
    name: 'E8 Markets',
    programs: [
      {
        name: 'E8 Track',
        phases: [
          { name: 'Phase 1', dailyLossPct: 5, totalLossPct: 8, profitTargetPct: 8, minTradingDays: 0 },
          { name: 'Phase 2', dailyLossPct: 5, totalLossPct: 8, profitTargetPct: 5, minTradingDays: 0 },
          { name: 'Funded', dailyLossPct: 5, totalLossPct: 8, profitTargetPct: 0, minTradingDays: 0 },
        ],
      },
    ],
  },
  {
    name: 'Personalizada',
    programs: [
      {
        name: 'Custom',
        phases: [
          { name: 'Custom', dailyLossPct: 5, totalLossPct: 10, profitTargetPct: 10, minTradingDays: 0 },
        ],
      },
    ],
  },
];
