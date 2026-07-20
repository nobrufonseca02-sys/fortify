import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  propFirmFilterOptions,
  propFirmRulePrograms,
  type PropFirmName,
  type PropFirmRuleProgram,
  type RuleAccountSize,
} from '@/data/propFirmRules';

const selectClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary';

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

type FirmStatus = 'operational' | 'unavailable' | 'legacy';

const firmStatusLabel: Record<FirmStatus, string> = {
  operational: 'Operacional',
  unavailable: 'Indisponível',
  legacy: 'Legado',
};

function cleanValue(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized || ['-', '--', 'n/a', 'na', 'tbd', 'undefined', 'null'].includes(normalized.toLowerCase())) {
    return 'Verificar no site oficial';
  }
  return normalized
    .replace(/Indisponível em fonte oficial vigente/gi, 'Não público')
    .replace(/Não informado publicamente/gi, 'Não público')
    .replace(/Confirmar no termo oficial/gi, 'Verificar no site oficial')
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

function normalizedSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function matchesLibraryQuery(programs: PropFirmRuleProgram[], query: string) {
  const normalizedQuery = normalizedSearch(query.trim());
  if (!normalizedQuery) return true;

  const searchableText = programs.flatMap((program) => [
    program.firm,
    program.programName,
    program.programType,
    program.market,
    program.platforms.join(' '),
    program.dailyLoss,
    program.maxLoss,
    program.drawdownType,
    program.trailingDescription,
    program.mainRisk,
    'daily loss perda diária max loss perda máxima drawdown plataforma mercado conta tamanho',
    ...accountRules(program).flatMap((account) => [
      account.label,
      formatAccountLabel(account.label),
      account.initialBalance,
      account.market,
      account.programType,
      account.platforms.join(' '),
      account.dailyLoss,
      account.maxLoss,
      account.drawdownType,
      account.drawdownCalculation,
      account.leverage,
    ]),
  ]).join(' ');

  return normalizedSearch(searchableText).includes(normalizedQuery);
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

function countLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function FirmCard({
  name,
  programs,
  onSelect,
}: {
  name: PropFirmName;
  programs: PropFirmRuleProgram[];
  onSelect: () => void;
}) {
  const availablePrograms = programs.filter((program) => accountRules(program).length > 0);
  const accounts = availablePrograms.reduce((total, program) => total + accountRules(program).length, 0);
  const status = getFirmStatus(programs);
  const available = status === 'operational';
  const markets = Array.from(new Set(programs.map((program) => program.market))).join(' · ');
  const platforms = getFirmPlatforms(programs);

  return (
    <button
      type="button"
      data-testid={`firm-${name}`}
      onClick={onSelect}
      className="group flex min-h-32 flex-col justify-between rounded-lg border border-border bg-card/70 p-4 text-left transition-colors hover:border-primary/55 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="mt-4">
        <h2 className="text-sm font-semibold text-foreground">{name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{markets}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {platforms.length ? platforms.map((platform) => cleanValue(platform)).join(' · ') : 'Plataforma não pública'}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
          <span className={available ? 'text-foreground' : 'text-amber-300'}>
            {available
              ? `${countLabel(availablePrograms.length, 'programa', 'programas')} · ${countLabel(accounts, 'conta', 'contas')}`
              : 'Catálogo não operacional'}
          </span>
          <span className={available ? 'text-emerald-300' : 'text-muted-foreground'}>
            {firmStatusLabel[status]}
          </span>
        </div>
      </div>
    </button>
  );
}

function ProgramSummary({ program, accountCount }: { program: PropFirmRuleProgram; accountCount: number }) {
  const confidence = program.confidence ?? program.accountLevelRules?.[0]?.confidence;
  const completeness = program.dataCompleteness ?? program.completeness ?? program.accountLevelRules?.[0]?.dataCompleteness;

  return (
    <section className="border-t border-border p-4" data-testid="program-summary">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Programa selecionado</p>
      <h3 className="mt-1 text-sm font-semibold text-foreground">{program.programName}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        <div>
          <dt className="text-muted-foreground">Tipo</dt>
          <dd className="mt-0.5 text-foreground">{program.programType}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Mercado</dt>
          <dd className="mt-0.5 text-foreground">{program.market}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Plataformas</dt>
          <dd className="mt-0.5 text-foreground">
            {program.platforms.length ? program.platforms.map((platform) => cleanValue(platform)).join(', ') : 'Não público'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Contas</dt>
          <dd className="mt-0.5 text-foreground">{countLabel(accountCount, 'tamanho', 'tamanhos')}</dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-border/70 pt-3">
        <p className="text-[10px] text-muted-foreground">Principal risco</p>
        <p className="mt-1 text-xs leading-5 text-amber-100">{cleanValue(program.mainRisk)}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {confidence && <span>{confidenceLabel[confidence]}</span>}
        {completeness && <span>{completenessLabel[completeness]}</span>}
        <span>Revisão {program.lastReviewedAt}</span>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-5 text-foreground">{cleanValue(value)}</dd>
    </div>
  );
}

function RuleRow({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-3 last:border-0 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`text-sm leading-5 ${warning ? 'text-amber-100' : 'text-foreground'}`}>{cleanValue(value)}</dd>
    </div>
  );
}

function RuleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border px-4 py-4 sm:px-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      <dl className="mt-2">{children}</dl>
    </section>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-t border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-sm font-semibold text-foreground sm:px-5">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/70 px-4 pb-4 sm:px-5">{children}</div>
    </details>
  );
}

function RulesView({
  firm,
  program,
  account,
  onCreateAccount,
}: {
  firm: PropFirmName;
  program: PropFirmRuleProgram;
  account: RuleAccountSize;
  onCreateAccount: () => void;
}) {
  const sourceLinks = program.officialSources?.length
    ? program.officialSources.map((source) => ({ label: source.label, url: source.url }))
    : [{ label: program.sourceLabel, url: program.officialSourceUrl }];

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card/70">
      <header className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{firm}</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {program.programName} · {formatAccountLabel(account.label)}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {program.market} · {account.platforms.join(', ')} · revisão {account.lastReviewedAt}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-200">
              {confidenceLabel[account.confidence]}
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
              {completenessLabel[account.dataCompleteness]}
            </span>
          </div>
        </div>
      </header>

      <dl className="grid border-y border-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
        <Metric label="Meta de lucro" value={phaseSummary(account)} />
        <Metric label="Perda diária" value={account.dailyLoss} />
        <Metric label="Perda máxima" value={account.maxLoss} />
        <Metric label="Drawdown" value={`${account.drawdownType} · ${account.drawdownCalculation}`} />
      </dl>

      <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-border">
        <RuleSection title="Regras para não reprovar">
          <RuleRow label="Principal risco" value={program.mainRisk} warning />
          <RuleRow label="Consistência" value={account.consistencyRule} warning />
          <RuleRow label="Melhor dia" value={account.bestDayRule} />
          <RuleRow label="Notícias" value={account.newsRule} warning />
          <RuleRow label="Final de semana" value={account.weekendRule} />
          <RuleRow label="Inatividade" value={account.inactivityRule} />
        </RuleSection>
        <RuleSection title="Limites operacionais">
          <RuleRow label="Fases" value={phaseSummary(account)} />
          <RuleRow label="Dias mínimos" value={account.minTradingDays} />
          <RuleRow label="Dias máximos" value={account.maxTradingDays} />
          <RuleRow label="Contratos / lotes" value={executionLimit(account)} />
          <RuleRow label="Alavancagem" value={account.leverage} />
          <RuleRow label="Overnight" value={account.overnightRule} />
        </RuleSection>
      </div>

      <DetailSection title="Payout e evolução da conta">
        <dl>
          <RuleRow label="Profit split" value={account.payoutSplit} />
          <RuleRow label="Primeiro payout" value={account.firstPayoutTiming} />
          <RuleRow label="Próximos payouts" value={account.subsequentPayoutTiming} />
          <RuleRow label="Retirada mínima" value={account.minimumWithdrawal} />
          <RuleRow label="Scaling" value={account.scalingPlan} />
        </dl>
      </DetailSection>

      <DetailSection title="Automação e práticas proibidas">
        <dl>
          <RuleRow label="EA" value={account.eaRule} />
          <RuleRow label="Copy trading" value={account.copyTradingRule} />
          <RuleRow label="KYC" value={account.kycRule} />
        </dl>
        <ul className="mt-3 space-y-2">
          {account.prohibitedPractices.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span>{cleanValue(item)}</span>
            </li>
          ))}
        </ul>
      </DetailSection>

      <DetailSection title="Monitoramento Fortify e fontes">
        <div className="grid gap-5 py-4 md:grid-cols-3">
          <MonitoringList title="Automático via MT5" items={account.monitorability.automatic_mt5} tone="success" />
          <MonitoringList title="Revisão manual" items={account.monitorability.manual_check} tone="warning" />
          <MonitoringList title="Ainda não suportado" items={account.monitorability.not_supported_yet} tone="muted" />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {sourceLinks.map((source) => (
            <Button key={source.url} asChild variant="outline" size="sm">
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.label}
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
          ))}
        </div>
      </DetailSection>

      <footer className="flex flex-col gap-3 border-t border-border bg-background/35 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
          A biblioteca é para consulta. A gestão automática começa quando a conta é cadastrada, vinculada ao MT5 e acompanhada pelo dashboard.
        </p>
        <Button type="button" onClick={onCreateAccount} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Cadastrar conta
        </Button>
      </footer>
    </article>
  );
}

function MonitoringList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'success' | 'warning' | 'muted';
}) {
  const color = tone === 'success' ? 'text-emerald-300' : tone === 'warning' ? 'text-amber-300' : 'text-muted-foreground';
  const safeItems = items.length ? items : ['Nenhum item informado'];

  return (
    <section>
      <h4 className={`text-xs font-semibold ${color}`}>{title}</h4>
      <ul className="mt-2 space-y-2">
        {safeItems.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
            <span>{cleanValue(item)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PropFirmLibrary() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedFirm, setSelectedFirm] = useState<PropFirmName | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const firms = useMemo(
    () =>
      propFirmFilterOptions.firms
        .map((name) => ({ name, programs: firmPrograms(name) }))
        .filter(({ programs }) => matchesLibraryQuery(programs, query)),
    [query],
  );

  const operationalFirms = firms.filter(({ programs: firmRulePrograms }) => getFirmStatus(firmRulePrograms) === 'operational');
  const coverageFirms = firms.filter(({ programs: firmRulePrograms }) => getFirmStatus(firmRulePrograms) !== 'operational');

  const programs = firmPrograms(selectedFirm);
  const selectedProgram = programs.find((program) => program.id === selectedProgramId) ?? programs[0];
  const accounts = accountRules(selectedProgram);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0];

  const chooseFirm = (firm: PropFirmName) => {
    const nextPrograms = firmPrograms(firm);
    const firstProgram = nextPrograms.find((program) => accountRules(program).length > 0) ?? nextPrograms[0];
    const firstAccount = accountRules(firstProgram)[0];
    setSelectedFirm(firm);
    setSelectedProgramId(firstProgram?.id ?? '');
    setSelectedAccountId(firstAccount?.id ?? '');
  };

  const chooseProgram = (programId: string) => {
    const program = programs.find((item) => item.id === programId);
    setSelectedProgramId(programId);
    setSelectedAccountId(accountRules(program)[0]?.id ?? '');
  };

  const resetSelection = () => {
    setSelectedFirm(null);
    setSelectedProgramId('');
    setSelectedAccountId('');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Consulta oficial</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Biblioteca de Mesas Proprietárias</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Escolha a mesa, o programa e o tamanho da conta para consultar as regras aplicáveis.
          </p>
        </div>
        {selectedFirm && (
          <Button type="button" variant="outline" onClick={resetSelection}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Todas as mesas
          </Button>
        )}
      </header>

      {!selectedFirm ? (
        <>
          <section className="flex flex-col gap-3 rounded-lg border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Escolha a mesa proprietária</p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar mesa, programa, conta ou regra"
                aria-label="Buscar mesa, programa, conta ou regra"
                className="pl-9"
              />
            </div>
          </section>

          {firms.length ? (
            <div className="space-y-6">
              {operationalFirms.length > 0 && (
                <section aria-labelledby="operational-firms-title">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 id="operational-firms-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Mesas operacionais
                    </h2>
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
                  <div className="mb-3">
                    <h2 id="coverage-firms-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Cobertura histórica ou indisponível
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">Consulta de status sem oferta operacional no Fortify.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {coverageFirms.map(({ name, programs: firmRulePrograms }) => (
                      <FirmCard key={name} name={name} programs={firmRulePrograms} onSelect={() => chooseFirm(name)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <section className="rounded-lg border border-dashed border-border p-8 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">Mesa não encontrada</p>
              <p className="mt-1 text-xs text-muted-foreground">Revise o nome informado ou limpe a busca.</p>
            </section>
          )}
        </>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="h-fit rounded-lg border border-border bg-card/60 lg:sticky lg:top-6">
            <div className="border-b border-border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Mesa selecionada</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{selectedFirm}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {countLabel(
                  programs.filter((program) => accountRules(program).length > 0).length,
                  'programa operacional',
                  'programas operacionais',
                )}
              </p>
            </div>

            <div className="space-y-4 p-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Mesa proprietária</span>
                <select
                  aria-label="Mesa proprietária"
                  value={selectedFirm}
                  onChange={(event) => chooseFirm(event.target.value as PropFirmName)}
                  className={selectClass}
                >
                  {propFirmFilterOptions.firms.map((firm) => (
                    <option key={firm} value={firm}>{firm}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Programa</span>
                <select
                  aria-label="Programa da mesa"
                  value={selectedProgram?.id ?? ''}
                  onChange={(event) => chooseProgram(event.target.value)}
                  className={selectClass}
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id} disabled={accountRules(program).length === 0}>
                      {program.programName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Conta oferecida</span>
                <select
                  aria-label="Conta oferecida"
                  value={selectedAccount?.id ?? ''}
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                  disabled={!accounts.length}
                  className={selectClass}
                >
                  {accounts.length ? (
                    accounts.map((account) => (
                      <option key={account.id} value={account.id}>{formatAccountLabel(account.label)}</option>
                    ))
                  ) : (
                    <option value="">Sem conta auditável</option>
                  )}
                </select>
              </label>
            </div>

            {selectedProgram && <ProgramSummary program={selectedProgram} accountCount={accounts.length} />}

            {accounts.length > 0 && (
              <div className="border-t border-border p-2" data-testid="account-options">
                <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Contas deste programa
                </p>
                <div className="space-y-1">
                  {accounts.map((account) => {
                    const active = account.id === selectedAccount?.id;
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setSelectedAccountId(account.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                          active ? 'bg-primary/12 text-primary' : 'text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span>
                          <span className="block font-medium">{formatAccountLabel(account.label)}</span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">{account.programType} · {account.market}</span>
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          <div className="min-w-0">
            {selectedProgram && selectedAccount ? (
              <RulesView
                firm={selectedFirm}
                program={selectedProgram}
                account={selectedAccount}
                onCreateAccount={() => navigate('/accounts/new')}
              />
            ) : (
              <section className="rounded-lg border border-amber-400/25 bg-amber-400/5 p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <h2 className="font-semibold text-foreground">Regras operacionais indisponíveis</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Esta mesa não possui um catálogo oficial vigente que permita criar contas ou limites confiáveis no Fortify.
                    </p>
                    {selectedProgram?.officialSourceUrl && (
                      <Button asChild variant="outline" size="sm" className="mt-4">
                        <a href={selectedProgram.officialSourceUrl} target="_blank" rel="noopener noreferrer">
                          Consultar fonte oficial
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </section>
            )}

            <div className="mt-4 flex items-start gap-3 border-l-2 border-primary/40 px-4 py-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Consulte as regras aqui. Depois do cadastro e da sincronização MT5, o Fortify usa o snapshot vinculado para mostrar saúde, violações e pontos de atenção no dashboard da conta.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
