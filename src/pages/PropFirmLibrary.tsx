import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, stagger, useAnimate, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Link2,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fortifyMotion } from '@/lib/motion';
import {
  propFirmFilterOptions,
  propFirmRulePrograms,
  type PropFirmName,
  type PropFirmRuleProgram,
  type RuleAccountSize,
} from '@/data/propFirmRules';
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
const firmLogos: Partial<Record<PropFirmName, string>> = {
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

type FirmStatus = 'operational' | 'unavailable' | 'legacy';
type TransitionDirection = 1 | -1;

function LibraryStageMotion({
  stageKey,
  direction,
  children,
}: {
  stageKey: string;
  direction: TransitionDirection;
  children: ReactNode;
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;

    const animations = [
      animate(
        '[data-library-stage]',
        { opacity: [0.72, 1], x: [direction * 12, 0] },
        { ...fortifyMotion.gentle, opacity: fortifyMotion.fade },
      ),
    ];

    if (scope.current?.querySelector('[data-library-reveal]')) {
      animations.push(
        animate(
          '[data-library-reveal]',
          { opacity: [0, 1], y: [6, 0] },
          {
            ...fortifyMotion.reveal,
            delay: stagger(0.028, { startDelay: 0.025 }),
            opacity: fortifyMotion.fade,
          },
        ),
      );
    }

    return () => animations.forEach((animation) => animation.stop());
  }, [animate, direction, scope, shouldReduceMotion, stageKey]);

  return (
    <div ref={scope} className="min-w-0">
      <div key={stageKey} data-library-stage>
        {children}
      </div>
    </div>
  );
}

const confidenceLabel = {
  high: 'Confiança alta',
  medium: 'Confiança média',
  low: 'Confiança baixa',
};

const completenessLabel = {
  complete: 'Dados completos',
  partial: 'Dados parciais',
  legacy: 'Dados legados',
};

const firmStatusLabel: Record<FirmStatus, string> = {
  operational: 'Operacional',
  unavailable: 'Indisponível',
  legacy: 'Legado',
};

function cleanValue(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized || ['-', '--', 'n/a', 'na', 'tbd', 'undefined', 'null'].includes(normalized.toLowerCase())) {
    return 'Verificar';
  }

  return normalized
    .replace(/Indisponível em fonte oficial vigente/gi, 'Não público')
    .replace(/Não informado publicamente/gi, 'Não público')
    .replace(/Confirmar no termo oficial/gi, 'Verificar')
    .replace(/(?:US)?\$\s*/gi, 'US$ ');
}

function formatAccountLabel(value: string) {
  const normalized = cleanValue(value).replace(/^US\$\s*/i, '$');
  const shortDollar = normalized.match(/^\$(\d+(?:[.,]\d+)?)(K|M)$/i);
  if (shortDollar) {
    const amount = shortDollar[1].replace('.', ',');
    return `US$ ${amount} ${shortDollar[2].toUpperCase() === 'K' ? 'mil' : 'milhões'}`;
  }

  const fullDollar = normalized.match(/^\$([\d,]+)$/);
  if (fullDollar) return `US$ ${fullDollar[1].replace(/,/g, '.')}`;
  return normalized;
}

function firmPrograms(firm: PropFirmName | null) {
  if (!firm) return [];
  return propFirmRulePrograms.filter((program) => program.firm === firm);
}

function accountRules(program?: PropFirmRuleProgram) {
  if (!program || program.evidenceStatus === 'official_source_unavailable') return [];
  return program.accountLevelRules ?? [];
}

function getFirmStatus(programs: PropFirmRuleProgram[]): FirmStatus {
  if (programs.some((program) => accountRules(program).length > 0)) return 'operational';
  if (programs.some((program) => program.evidenceStatus === 'official_source_unavailable')) return 'unavailable';
  return 'legacy';
}

function getFirmPlatforms(programs: PropFirmRuleProgram[]) {
  return Array.from(
    new Set(
      programs.flatMap((program) => [
        ...program.platforms,
        ...accountRules(program).flatMap((account) => account.platforms),
      ]),
    ),
  ).filter(Boolean);
}

function phaseSummary(account: RuleAccountSize) {
  return account.phases
    .map((phase) => `${phase.label}: ${cleanValue(phase.profitTarget)}`)
    .join(' · ');
}

function executionLimit(account: RuleAccountSize) {
  if (account.maxContracts !== 'Não aplicável') return cleanValue(account.maxContracts);
  if (account.maxLots !== 'Não aplicável') return cleanValue(account.maxLots);
  return 'Não aplicável';
}

function payoutSummary(account: RuleAccountSize) {
  const split = cleanValue(account.payoutSplit);
  const timing = cleanValue(account.firstPayoutTiming);
  return split === timing ? split : `${split} · ${timing}`;
}

function countLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function shortRisk(value: string) {
  const firstSentence = cleanValue(value).split(/(?<=[.!?])\s/)[0];
  return firstSentence.length > 150 ? `${firstSentence.slice(0, 147).trim()}...` : firstSentence;
}

function preferredPlatform(account: RuleAccountSize, program: PropFirmRuleProgram) {
  const platforms = [...account.platforms, ...program.platforms].map((platform) => platform.trim()).filter(Boolean);
  return platforms.find((platform) => platform.toUpperCase() === 'MT5') ?? platforms[0];
}

export function accountConnectionPath(program: PropFirmRuleProgram, account: RuleAccountSize) {
  const platform = preferredPlatform(account, program);
  const ruleVersionId = account.versions.find((version) => !version.effectiveTo)?.id ?? account.versions[0]?.id;
  if (!program.firmSlug || !program.programSlug || !platform || !ruleVersionId) return null;

  const params = new URLSearchParams({
    propFirmSlug: program.firmSlug,
    programSlug: program.programSlug,
    accountSizeId: account.id,
    platform,
    ruleVersionId,
  });

  return `/accounts?${params.toString()}`;
}

function FirmCard({ name, programs, onSelect }: { name: PropFirmName; programs: PropFirmRuleProgram[]; onSelect: () => void }) {
  const operationalPrograms = programs.filter((program) => accountRules(program).length > 0);
  const status = getFirmStatus(programs);
  const operational = status === 'operational';
  const markets = Array.from(new Set(programs.map((program) => program.market))).join(' · ');
  const platforms = getFirmPlatforms(programs);
  const logo = firmLogos[name];

  return (
    <motion.button
      type="button"
      data-testid={`firm-${name}`}
      data-library-reveal
      onClick={onSelect}
      disabled={!operational}
      whileHover={operational ? fortifyMotion.hover : undefined}
      whileTap={operational ? fortifyMotion.press : undefined}
      transition={fortifyMotion.responsive}
      className="group flex min-h-36 flex-col justify-between rounded-lg border border-border bg-card/60 p-4 text-left transition-[color,background-color,border-color] duration-150 hover:border-primary/55 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border disabled:hover:bg-card/60"
    >
      <div className="flex items-start justify-between gap-3">
        {/* bg-brand-chip / border-brand-chip-border are fixed dark, not theme-adaptive —
            most of the imported firm logos above are single-color (white-fill) SVGs/PNGs
            that would disappear against an adaptive bg-background in light mode. See the
            --brand-chip-bg comment in index.css. */}
        <div className="flex h-9 max-w-[132px] min-w-9 items-center justify-center rounded-md border border-brand-chip-border bg-brand-chip px-2 text-primary">
          {logo ? (
            <img src={logo} alt="" aria-hidden="true" className="max-h-5 w-auto max-w-[108px] object-contain" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
        </div>
        {operational ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning" />
        )}
      </div>
      <div className="mt-5 min-w-0">
        <h2 className="truncate text-sm font-semibold text-foreground">{name}</h2>
        <p className="mt-1 truncate text-xs text-muted-foreground">{markets}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {platforms.length ? platforms.map((platform) => cleanValue(platform)).join(' · ') : 'Plataforma não pública'}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
          <span className="text-foreground">
            {operational ? countLabel(operationalPrograms.length, 'modelo', 'modelos') : 'Sem modelo operacional'}
          </span>
          <span className={operational ? 'text-success' : 'text-warning'}>{firmStatusLabel[status]}</span>
        </div>
      </div>
    </motion.button>
  );
}

function ProgramCard({ program, onSelect }: { program: PropFirmRuleProgram; onSelect: () => void }) {
  const accounts = accountRules(program);

  return (
    <motion.button
      type="button"
      data-testid={`program-${program.id}`}
      data-library-reveal
      onClick={onSelect}
      whileHover={fortifyMotion.hover}
      whileTap={fortifyMotion.press}
      transition={fortifyMotion.responsive}
      className="group flex min-h-44 flex-col justify-between rounded-lg border border-border bg-card/60 p-5 text-left transition-[color,background-color,border-color] duration-150 hover:border-primary/55 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{program.programType}</p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{program.programName}</h3>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="mt-5">
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{shortRisk(program.mainRisk)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
          <span>{program.market}</span>
          <span>{program.platforms.map((platform) => cleanValue(platform)).join(', ') || 'Não público'}</span>
          <span className="text-foreground">{countLabel(accounts.length, 'conta', 'contas')}</span>
        </div>
      </div>
    </motion.button>
  );
}

function RuleCard({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card/55 p-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className={`mt-2 break-words text-sm font-semibold leading-5 ${warning ? 'text-warning' : 'text-foreground'}`}>
        {cleanValue(value)}
      </dd>
    </div>
  );
}

function MonitoringList({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'warning' | 'muted' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-muted-foreground';
  const safeItems = items.length ? items : ['Não público'];

  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <h4 className={`text-xs font-semibold ${color}`}>{title}</h4>
      <ul className="mt-3 space-y-2">
        {safeItems.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
            <span>{cleanValue(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RulesView({ firm, program, account, onConnect, connectionUnavailable }: {
  firm: PropFirmName;
  program: PropFirmRuleProgram;
  account: RuleAccountSize;
  onConnect?: () => void;
  connectionUnavailable?: boolean;
}) {
  const sourceLinks = program.officialSources?.length
    ? program.officialSources.map((source) => ({ label: source.label, url: source.url }))
    : [{ label: program.sourceLabel, url: program.officialSourceUrl }];

  return (
    <article className="space-y-7" data-testid="account-rules">
      <header data-library-reveal className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Aqui estão as regras principais</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {program.programName} · {formatAccountLabel(account.label)}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {firm} · {program.market} · {account.platforms.map((platform) => cleanValue(platform)).join(', ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] text-success">
            {confidenceLabel[account.confidence]}
          </span>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
            {completenessLabel[account.dataCompleteness]}
          </span>
        </div>
      </header>

      <section data-library-reveal>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">Regras críticas</h3>
          <p className="mt-1 text-xs text-muted-foreground">O que decide se a conta continua ativa.</p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <RuleCard label="Meta" value={phaseSummary(account)} />
          <RuleCard label="Perda diária" value={account.dailyLoss} warning />
          <RuleCard label="Perda máxima" value={account.maxLoss} warning />
          <RuleCard label="Drawdown" value={`${account.drawdownType} · ${account.drawdownCalculation}`} warning />
        </dl>
      </section>

      <section data-library-reveal>
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Fortify monitora</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MonitoringList title="Automático" items={account.monitorability.automatic_mt5} tone="success" />
          <MonitoringList title="Manual" items={account.monitorability.manual_check} tone="warning" />
          <MonitoringList title="Ainda não suportado" items={account.monitorability.not_supported_yet} tone="muted" />
        </div>
      </section>

      <details data-library-reveal className="group border-t border-b border-border py-1">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-foreground">
          <span>Ver detalhes completos</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-6 border-t border-border py-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Regras adicionais</h4>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <RuleCard label="Consistência" value={account.consistencyRule} />
              <RuleCard label="Notícias" value={account.newsRule} />
              <RuleCard label="Fim de semana" value={account.weekendRule} />
            </dl>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Operacional</h4>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <RuleCard label="Lotes / contratos" value={executionLimit(account)} />
              <RuleCard label="Alavancagem" value={account.leverage} />
              <RuleCard label="Mínimo de dias" value={account.minTradingDays} />
              <RuleCard label="Máximo de dias" value={account.maxTradingDays} />
              <RuleCard label="Payout" value={payoutSummary(account)} />
            </dl>
          </div>
        </div>
      </details>

      <details data-library-reveal className="group border-b border-border py-1">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-foreground">
          <span className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Fontes oficiais
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-wrap gap-2 border-t border-border py-4">
          {sourceLinks.map((source) => (
            <Button key={source.url} asChild variant="outline" size="sm">
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.label}
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
          ))}
        </div>
      </details>

      <footer data-library-reveal className="flex flex-col gap-4 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-foreground">Pronto para monitorar esta conta?</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            A Biblioteca serve para consulta. A gestão automática começa após cadastrar e conectar a conta.
          </p>
        </div>
        {onConnect ? (
          <button type="button" onClick={onConnect} className="pill-btn pill-btn-primary w-full shrink-0 sm:w-auto">
            Conectar essa conta
            <ChevronRight className="ml-2 h-4 w-4" />
          </button>
        ) : connectionUnavailable ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5 text-xs text-warning sm:max-w-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span>Conexão indisponível para este modelo — dados de plataforma ou versão de regra incompletos na Biblioteca.</span>
          </div>
        ) : null}
      </footer>
    </article>
  );
}

export default function PropFirmLibrary() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedFirm, setSelectedFirm] = useState<PropFirmName | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>(1);

  const firms = useMemo(
    () => propFirmFilterOptions.firms
      .map((name) => ({ name, programs: firmPrograms(name) }))
      .filter(({ name }) => name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))),
    [query],
  );

  const operationalFirms = firms.filter(({ programs }) => getFirmStatus(programs) === 'operational');
  const coverageFirms = firms.filter(({ programs }) => getFirmStatus(programs) !== 'operational');
  const programs = firmPrograms(selectedFirm).filter((program) => accountRules(program).length > 0);
  const selectedProgram = programs.find((program) => program.id === selectedProgramId);
  const accounts = accountRules(selectedProgram);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const connectionPath = selectedProgram && selectedAccount
    ? accountConnectionPath(selectedProgram, selectedAccount)
    : null;

  const chooseFirm = (firm: PropFirmName) => {
    setTransitionDirection(1);
    setSelectedFirm(firm);
    setSelectedProgramId('');
    setSelectedAccountId('');
  };

  const chooseProgram = (programId: string) => {
    setTransitionDirection(1);
    setSelectedProgramId(programId);
    setSelectedAccountId('');
  };

  const chooseAccount = (accountId: string) => {
    setTransitionDirection(1);
    setSelectedAccountId(accountId);
  };

  const goBack = () => {
    setTransitionDirection(-1);
    if (selectedAccount) {
      setSelectedAccountId('');
      return;
    }
    if (selectedProgram) {
      setSelectedProgramId('');
      return;
    }
    setSelectedFirm(null);
  };

  const backLabel = selectedAccount
    ? 'Escolher outra conta'
    : selectedProgram
      ? 'Voltar aos modelos'
      : 'Todas as mesas';
  const stageKey = selectedAccount
    ? `rules:${selectedAccount.id}`
    : selectedProgram
      ? `accounts:${selectedProgram.id}`
      : selectedFirm
        ? `programs:${selectedFirm}`
        : 'firms';

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 pb-32 sm:px-6 lg:px-8">
      <div className="hero-surface p-7 md:p-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Consulta oficial</p>
          <h1 className="display-editorial-sm text-foreground">
            Biblioteca de <span className="text-gradient-primary">Mesas Proprietárias</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 max-w-md leading-relaxed">
            Escolha uma mesa, veja os modelos disponíveis e consulte as regras principais antes de conectar sua conta.
          </p>
        </div>
        {selectedFirm && (
          <button type="button" onClick={goBack} className="pill-btn shrink-0">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
        )}
      </div>

      <LibraryStageMotion stageKey={stageKey} direction={transitionDirection}>
        {!selectedFirm && (
          <section className="space-y-6" data-testid="firm-step">
            <div data-library-reveal className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Etapa 1 de 4</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Escolha uma mesa proprietária.</h2>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar mesa proprietária..."
                aria-label="Buscar mesa proprietária"
                className="pl-9"
              />
            </div>
          </div>

          {firms.length ? (
            <div className="space-y-7">
              {operationalFirms.length > 0 && (
                <section aria-labelledby="operational-firms-title">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 id="operational-firms-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Mesas operacionais
                    </h3>
                    <span className="text-xs text-muted-foreground">{operationalFirms.length} disponíveis</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {operationalFirms.map(({ name, programs: firmRulePrograms }) => (
                      <FirmCard key={name} name={name} programs={firmRulePrograms} onSelect={() => chooseFirm(name)} />
                    ))}
                  </div>
                </section>
              )}

              {coverageFirms.length > 0 && (
                <section aria-labelledby="coverage-firms-title" className="border-t border-border pt-5">
                  <h3 id="coverage-firms-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Cobertura indisponível ou legada
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">Mantida apenas para referência histórica.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {coverageFirms.map(({ name, programs: firmRulePrograms }) => (
                      <FirmCard key={name} name={name} programs={firmRulePrograms} onSelect={() => chooseFirm(name)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div data-library-reveal className="rounded-lg border border-dashed border-border p-8 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">Mesa não encontrada</p>
              <p className="mt-1 text-xs text-muted-foreground">Revise o nome informado ou limpe a busca.</p>
            </div>
          )}
          </section>
        )}

        {selectedFirm && !selectedProgram && (
          <section className="space-y-5" data-testid="program-step">
            <div data-library-reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Etapa 2 de 4 · {selectedFirm}</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Modelos disponíveis na {selectedFirm}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Agora escolha um modelo.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} onSelect={() => chooseProgram(program.id)} />
            ))}
          </div>
          </section>
        )}

        {selectedFirm && selectedProgram && !selectedAccount && (
          <section className="space-y-5" data-testid="account-step">
            <div data-library-reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Etapa 3 de 4 · {selectedFirm} · {selectedProgram.programName}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Escolha a conta</h2>
            <p className="mt-1 text-sm text-muted-foreground">Agora escolha o tamanho que deseja consultar.</p>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="account-options">
            {accounts.map((account) => (
              <motion.button
                key={account.id}
                type="button"
                data-testid={`account-${account.id}`}
                data-library-reveal
                onClick={() => chooseAccount(account.id)}
                whileHover={fortifyMotion.hover}
                whileTap={fortifyMotion.press}
                transition={fortifyMotion.responsive}
                className="rounded-full border border-border bg-card/60 px-4 py-2.5 text-sm font-semibold text-foreground transition-[color,background-color,border-color] duration-150 hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {formatAccountLabel(account.label)}
              </motion.button>
            ))}
          </div>
          </section>
        )}

        {selectedFirm && selectedProgram && selectedAccount && (
          <RulesView
            firm={selectedFirm}
            program={selectedProgram}
            account={selectedAccount}
            onConnect={connectionPath ? () => navigate(connectionPath) : undefined}
            connectionUnavailable={!connectionPath}
          />
        )}
      </LibraryStageMotion>
    </div>
  );
}
