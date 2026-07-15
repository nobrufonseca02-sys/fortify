import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Filter,
  Info,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  PropFirmRuleProgram,
  propFirmFilterOptions,
  propFirmRulePrograms,
} from '@/data/propFirmRules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const allValue = 'Todos';

const riskClass: Record<PropFirmRuleProgram['riskLevel'], string> = {
  Baixo: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  Médio: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  Alto: 'border-red-400/30 bg-red-400/10 text-red-200',
};

const sourceByFirm: Record<string, string> = {
  FTMO: 'https://ftmo.com/en/trading-objectives/',
  'Apex Trader Funding': 'https://apextraderfunding.com/help-center/',
  'Hantec Trader': 'https://htrader.hmarkets.com/programs/rules/',
  'ASAP Funding Prop': 'https://asapfundingprop.com/pt/termos/',
  'NP Future': 'https://npfuture.com/regulamento/',
};

const completenessLabel = {
  complete: 'Evidência completa',
  partial: 'Evidência parcial',
  legacy: 'Revisão legada',
};

const confidenceLabel = {
  high: 'Confiança alta',
  medium: 'Confiança média',
  low: 'Confiança baixa',
};

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background/80 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
      >
        <option value={allValue}>{allValue}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/40 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ProgramCard({
  program,
  isCompared,
  compareDisabled,
  onDetails,
  onCompare,
}: {
  program: PropFirmRuleProgram;
  isCompared: boolean;
  compareDisabled: boolean;
  onDetails: () => void;
  onCompare: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card/80 p-5 shadow-sm shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{program.firm}</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{program.programName}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass[program.riskLevel]}`}>
          Risco {program.riskLevel}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <InfoPill>{program.programType}</InfoPill>
        <InfoPill>{program.market}</InfoPill>
        <InfoPill>{program.drawdownType}</InfoPill>
        {program.completeness && <InfoPill>{completenessLabel[program.completeness]}</InfoPill>}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Meta" value={program.profitTarget} />
        <Field label="Perda diaria" value={program.dailyLoss} />
        <Field label="Perda maxima" value={program.maxLoss} />
        <Field label="Dias min." value={program.minTradingDays} />
      </div>

      <div className="mt-4 space-y-3 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Tamanhos:</span> {program.accountSizes.join(', ')}
        </p>
        <p>
          <span className="font-medium text-foreground">Plataformas:</span> {program.platforms.join(', ')}
        </p>
        <p>
          <span className="font-medium text-foreground">Risco principal:</span> {program.mainRisk}
        </p>
        <p>
          <span className="font-medium text-foreground">Melhor para:</span> {program.bestFor}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
        <Button onClick={onDetails} className="flex-1">
          Ver detalhes
        </Button>
        <Button
          type="button"
          variant={isCompared ? 'secondary' : 'outline'}
          onClick={onCompare}
          disabled={!isCompared && compareDisabled}
          className="flex-1"
        >
          {isCompared ? 'Remover' : 'Comparar'}
        </Button>
      </div>
    </article>
  );
}

function DetailsDrawer({
  program,
  onClose,
}: {
  program: PropFirmRuleProgram | null;
  onClose: () => void;
}) {
  if (!program) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full w-full max-w-3xl flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{program.firm}</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">{program.programName}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Revisado em {program.lastReviewedAt}. Dados informativos para triagem de risco.
            </p>
            {(program.confidence || program.completeness) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {program.confidence && <InfoPill>{confidenceLabel[program.confidence]}</InfoPill>}
                {program.completeness && <InfoPill>{completenessLabel[program.completeness]}</InfoPill>}
              </div>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar detalhes">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Programa" value={program.programType} />
            <Field label="Mercado" value={program.market} />
            <Field label="Drawdown" value={program.drawdownType} />
          </div>

          <section className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tamanhos e limites</h3>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Conta</th>
                    <th className="px-4 py-3">Meta</th>
                    <th className="px-4 py-3">Perda diaria</th>
                    <th className="px-4 py-3">Perda maxima</th>
                    <th className="px-4 py-3">Contratos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {program.accountSizeRows.map((row) => (
                    <tr key={`${program.id}-${row.label}`} className="text-foreground">
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3">{row.profitTarget}</td>
                      <td className="px-4 py-3">{row.dailyLoss}</td>
                      <td className="px-4 py-3">{row.maxLoss}</td>
                      <td className="px-4 py-3">{row.maxContracts ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <DetailList title="Objetivos de trading" items={program.tradingObjectives} />
            <DetailList title="Regras de risco" items={program.riskRules} tone="risk" />
            <DetailList title="Pontos de atencao" items={program.attentionRules} tone="warning" />
            <DetailList title="Notas operacionais" items={program.operationalNotes} />
          </div>

          {program.conflicts && program.conflicts.length > 0 && (
            <section className="mt-6 border-l-2 border-amber-300 bg-amber-300/5 px-4 py-3">
              <h3 className="font-semibold text-amber-100">Conflitos de fonte registrados</h3>
              <ul className="mt-3 space-y-3">
                {program.conflicts.map((conflict) => (
                  <li key={`${program.id}-${conflict.field}`} className="text-sm text-amber-100/80">
                    <span className="font-medium text-amber-50">{conflict.field}:</span> {conflict.summary}{' '}
                    <span className="text-foreground">Valor adotado: {conflict.preferredValue}.</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {program.monitorability && (
            <section className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monitorabilidade</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <DetailList title="Automático via MT5" items={program.monitorability.automatic_mt5.length > 0 ? program.monitorability.automatic_mt5 : ['Não disponível para esta plataforma']} />
                <DetailList title="Verificação manual" items={program.monitorability.manual_check} tone="warning" />
                <DetailList title="Ainda não suportado" items={program.monitorability.not_supported_yet} />
              </div>
            </section>
          )}

          <section className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
              <div>
                <h3 className="font-semibold text-amber-100">Aviso importante</h3>
                <p className="mt-1 text-sm text-amber-100/80">
                  As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-5">
          <p className="text-xs text-muted-foreground">Fonte principal: {program.sourceLabel}</p>
          <div className="flex flex-wrap gap-2">
            {(program.officialSources ?? [{ label: program.sourceLabel, url: program.officialSourceUrl }]).map((source) => (
              <Button key={source.url} asChild variant="outline" size="sm">
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailList({
  title,
  items,
  tone = 'default',
}: {
  title: string;
  items: string[];
  tone?: 'default' | 'risk' | 'warning';
}) {
  const iconClass = tone === 'risk' ? 'text-red-300' : tone === 'warning' ? 'text-amber-300' : 'text-primary';

  return (
    <section className="rounded-xl border border-border bg-background/35 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComparisonPanel({
  programs,
  onRemove,
}: {
  programs: PropFirmRuleProgram[];
  onRemove: (id: string) => void;
}) {
  if (programs.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card/60 p-5">
        <div className="flex items-center gap-3">
          <ArrowUpDown className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Comparacao</h2>
            <p className="text-sm text-muted-foreground">Selecione ate 3 programas para comparar limites criticos lado a lado.</p>
          </div>
        </div>
      </section>
    );
  }

  const rows: Array<[string, keyof PropFirmRuleProgram]> = [
    ['Mesa', 'firm'],
    ['Programa', 'programName'],
    ['Tipo', 'programType'],
    ['Mercado', 'market'],
    ['Meta', 'profitTarget'],
    ['Perda diaria', 'dailyLoss'],
    ['Perda maxima', 'maxLoss'],
    ['Drawdown', 'drawdownType'],
    ['Dias minimos', 'minTradingDays'],
    ['Consistencia', 'consistencyRule'],
    ['Noticias', 'newsRule'],
    ['Fim de semana', 'weekendRule'],
    ['Payout', 'payout'],
    ['Risco', 'riskLevel'],
  ];

  return (
    <section className="rounded-xl border border-border bg-card/80 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Comparacao de programas</h2>
          <p className="text-sm text-muted-foreground">Limites e regras que mais reprovam contas.</p>
        </div>
        <span className="text-xs text-muted-foreground">{programs.length}/3 selecionados</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Campo</th>
              {programs.map((program) => (
                <th key={program.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>{program.programName}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(program.id)}
                      className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`Remover ${program.programName} da comparacao`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(([label, key]) => (
              <tr key={label}>
                <td className="px-4 py-3 font-medium text-foreground">{label}</td>
                {programs.map((program) => (
                  <td key={`${program.id}-${String(key)}`} className="px-4 py-3 text-muted-foreground">
                    {String(program[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AccountRules() {
  const [query, setQuery] = useState('');
  const [firm, setFirm] = useState(allValue);
  const [programType, setProgramType] = useState(allValue);
  const [market, setMarket] = useState(allValue);
  const [drawdownType, setDrawdownType] = useState(allValue);
  const [accountSize, setAccountSize] = useState(allValue);
  const [riskLevel, setRiskLevel] = useState(allValue);
  const [detailsProgram, setDetailsProgram] = useState<PropFirmRuleProgram | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const filtersRef = useRef<HTMLElement | null>(null);
  const comparisonRef = useRef<HTMLDivElement | null>(null);

  const accountSizeOptions = useMemo(
    () => Array.from(new Set(propFirmRulePrograms.flatMap((program) => program.accountSizes))).sort(),
    [],
  );

  const filteredPrograms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return propFirmRulePrograms.filter((program) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          program.firm,
          program.programName,
          program.market,
          program.programType,
          program.bestFor,
          program.platforms.join(' '),
          program.criticalRules.join(' '),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return (
        matchesQuery &&
        (firm === allValue || program.firm === firm) &&
        (programType === allValue || program.programType === programType) &&
        (market === allValue ||
          program.market === market ||
          (market === 'MT4/MT5' && (program.platforms.includes('MT4') || program.platforms.includes('MT5')))) &&
        (drawdownType === allValue || program.drawdownType === drawdownType) &&
        (accountSize === allValue || program.accountSizes.includes(accountSize)) &&
        (riskLevel === allValue || program.riskLevel === riskLevel)
      );
    });
  }, [accountSize, drawdownType, firm, market, programType, query, riskLevel]);

  const comparedPrograms = comparisonIds
    .map((id) => propFirmRulePrograms.find((program) => program.id === id))
    .filter(Boolean) as PropFirmRuleProgram[];

  const toggleComparison = (id: string) => {
    setComparisonIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  };

  const resetFilters = () => {
    setQuery('');
    setFirm(allValue);
    setProgramType(allValue);
    setMarket(allValue);
    setDrawdownType(allValue);
    setAccountSize(allValue);
    setRiskLevel(allValue);
  };

  const scrollToFilters = () => {
    filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToComparison = () => {
    comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectFirm = (selectedFirm: string) => {
    setFirm(selectedFirm);
    scrollToFilters();
  };

  const heroFirmCards = [
    {
      firm: 'FTMO',
      label: 'FTMO',
      description: 'Forex/CFD • MT4/MT5',
      risk: 'Daily Loss e Max Loss',
    },
    {
      firm: 'Apex Trader Funding',
      label: 'Apex',
      description: 'Futures • Manual reference',
      risk: 'Trailing Drawdown',
    },
    {
      firm: 'Hantec Trader',
      label: 'Hantec',
      description: 'Forex/CFD • MT5',
      risk: 'Daily Loss, Total Loss e Consistência',
    },
  ];

  const heroStats = [
    { value: String(new Set(propFirmRulePrograms.map((program) => program.firm)).size), label: 'mesas' },
    { value: String(propFirmRulePrograms.length), label: 'programas' },
    { value: 'Regras', label: 'críticas' },
    { value: 'Comparação', label: 'rápida' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-slate-950 p-5 shadow-2xl shadow-cyan-950/20 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.16),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]" />
          <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                MVP • Biblioteca informativa
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">Escolha sua PropFirm</h1>
              <p className="mt-3 text-xl font-semibold text-cyan-100">Gerencie o risco da sua conta antes do próximo trade.</p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Compare regras, limites de perda, drawdown, consistência e restrições operacionais das principais mesas
                proprietarias.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={scrollToFilters} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  Ver regras
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={scrollToComparison}
                  className="border-cyan-300/30 bg-white/5 text-cyan-50 hover:bg-cyan-300/10 hover:text-white"
                >
                  Comparar programas
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-xl shadow-cyan-950/20 backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {heroFirmCards.map((card) => (
                  <button
                    key={card.firm}
                    type="button"
                    onClick={() => selectFirm(card.firm)}
                    className="group rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:shadow-lg hover:shadow-cyan-950/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-white">{card.label}</span>
                      <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.8)]" />
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{card.description}</p>
                    <p className="mt-3 rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-xs font-medium text-red-100">
                      {card.risk}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {heroStats.map((stat) => (
              <div key={`${stat.value}-${stat.label}`} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p>As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.</p>
            </div>
          </div>
        </section>

        <section ref={filtersRef} className="scroll-mt-6 rounded-xl border border-border bg-card/80 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4 text-primary" />
            Filtros da biblioteca
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Buscar</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por mesa, programa ou mercado"
                  className="pl-9"
                />
              </div>
            </label>
            <SelectFilter label="Mesa" value={firm} options={propFirmFilterOptions.firms} onChange={setFirm} />
            <SelectFilter label="Tipo" value={programType} options={propFirmFilterOptions.programTypes} onChange={setProgramType} />
            <SelectFilter label="Mercado" value={market} options={propFirmFilterOptions.markets} onChange={setMarket} />
            <SelectFilter label="Drawdown" value={drawdownType} options={propFirmFilterOptions.drawdownTypes} onChange={setDrawdownType} />
            <SelectFilter label="Tamanho" value={accountSize} options={accountSizeOptions} onChange={setAccountSize} />
            <SelectFilter label="Risco" value={riskLevel} options={propFirmFilterOptions.riskLevels} onChange={setRiskLevel} />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{filteredPrograms.length} programas encontrados</p>
            <Button type="button" variant="ghost" onClick={resetFilters}>
              Limpar filtros
            </Button>
          </div>
        </section>

        <div ref={comparisonRef} className="scroll-mt-6">
          <ComparisonPanel programs={comparedPrograms} onRemove={(id) => setComparisonIds((current) => current.filter((item) => item !== id))} />
        </div>

        {filteredPrograms.length > 0 ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {filteredPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                isCompared={comparisonIds.includes(program.id)}
                compareDisabled={comparisonIds.length >= 3}
                onDetails={() => setDetailsProgram(program)}
                onCompare={() => toggleComparison(program.id)}
              />
            ))}
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Nenhuma regra encontrada</h2>
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma regra encontrada para os filtros selecionados.</p>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: 'Drawdown e perda diaria',
              text: 'A maioria das reprovas acontece quando o trader olha apenas saldo fechado e ignora posicoes abertas.',
            },
            {
              title: 'Consistencia e saque',
              text: 'Programas com regra de consistencia podem bloquear payout mesmo quando a conta esta lucrativa.',
            },
            {
              title: 'Noticias e fim de semana',
              text: 'Regras operacionais variam por programa. Abrir, fechar ou segurar posicoes no horario errado pode reprovar.',
            },
          ].map((item) => (
            <article key={item.title} className="rounded-xl border border-red-400/20 bg-red-400/10 p-5">
              <ShieldAlert className="h-5 w-5 text-red-300" />
              <h2 className="mt-3 font-semibold text-red-100">{item.title}</h2>
              <p className="mt-2 text-sm text-red-100/80">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-primary/20 bg-primary/10 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Como o Fortify le isso</h2>
              </div>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                O Fortify transforma limites como perda diaria, perda maxima, trailing drawdown, consistencia e regras
                operacionais em alertas de risco. A biblioteca ajuda voce a entender o contrato; as protecoes reais devem
                ser configuradas na conta MT5 monitorada.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 md:min-w-[420px]">
              <InfoPill>Alertas antes da violacao</InfoPill>
              <InfoPill>Leitura por conta</InfoPill>
              <InfoPill>Foco em prop firms</InfoPill>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/80 p-5">
          <h2 className="text-lg font-semibold text-foreground">Fontes oficiais</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(sourceByFirm).map(([label, url]) => (
              <Button key={label} asChild variant="outline">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {label}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ))}
          </div>
        </section>
      </div>

      <DetailsDrawer program={detailsProgram} onClose={() => setDetailsProgram(null)} />
    </div>
  );
}
