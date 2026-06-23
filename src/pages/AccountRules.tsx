import { useMemo, useState } from 'react';
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

        <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">Fonte: {program.sourceLabel}</p>
          <Button asChild variant="outline">
            <a href={program.officialSourceUrl} target="_blank" rel="noopener noreferrer">
              Abrir fonte oficial
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
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

  const accountSizeOptions = useMemo(
    () => Array.from(new Set(propFirmRulePrograms.flatMap((program) => program.accountSizes))).sort(),
    [],
  );

  const filteredPrograms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return propFirmRulePrograms.filter((program) => {
      const matchesQuery =
        !normalizedQuery ||
        [program.firm, program.programName, program.market, program.programType, program.bestFor]
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-card/80 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                MVP • Dados informativos
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Biblioteca de Regras</h1>
              <p className="mt-3 text-base text-muted-foreground">
                Compare regras de mesas proprietarias, veja limites criticos e entenda o que pode reprovar sua conta.
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100 lg:max-w-md">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/80 p-5">
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

        <ComparisonPanel programs={comparedPrograms} onRemove={(id) => setComparisonIds((current) => current.filter((item) => item !== id))} />

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
