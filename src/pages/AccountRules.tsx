import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  Search,
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

const completenessLabel = {
  complete: 'Evidência completa',
  partial: 'Evidência parcial',
  legacy: 'Revisão legada',
};

const compactCompletenessLabel = {
  complete: 'Completa',
  partial: 'Parcial',
  legacy: 'Legada',
};

const confidenceLabel = {
  high: 'Confiança alta',
  medium: 'Confiança média',
  low: 'Confiança baixa',
};

const compactConfidenceLabel = {
  high: 'Alta confiança',
  medium: 'Confiança média',
  low: 'Baixa confiança',
};

const monitoringOptions = ['Automático MT5', 'Manual', 'Não suportado'];
const evidenceOptions = [
  'Evidência completa',
  'Evidência parcial',
  'Revisão legada',
  'Confiança alta',
  'Confiança média',
  'Confiança baixa',
];

function displayValue(value: unknown, compact = false) {
  const text = String(value ?? '').trim();
  const normalized = text.toLocaleLowerCase('pt-BR');

  if (!text || ['-', '--', 'n/a', 'na', 'tbd', 'undefined', 'null'].includes(normalized)) {
    return compact ? 'Verificar' : 'Verificar no site oficial';
  }
  if (
    normalized.includes('verificar no site oficial') ||
    normalized.includes('confirmar no termo oficial') ||
    normalized.includes('confirmar no site oficial') ||
    normalized.includes('confirmar no checkout oficial')
  ) {
    return compact ? 'Verificar' : 'Verificar no site oficial';
  }
  if (normalized.includes('não informado publicamente')) {
    return compact ? 'Não público' : 'Não informado publicamente';
  }
  if (normalized.includes('indisponível em fonte oficial vigente')) {
    return compact ? 'Indisponível' : 'Indisponível em fonte oficial vigente';
  }
  return text;
}

function briefValue(value: unknown, maxLength = 84) {
  const text = displayValue(value, true);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function summarizeList(values: string[], visible = 3) {
  const cleaned = values.map((value) => displayValue(value, true));
  if (cleaned.length <= visible) return cleaned.join(', ');
  return `${cleaned.slice(0, visible).join(', ')} +${cleaned.length - visible}`;
}

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
    <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-border pl-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {displayValue(value)}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p
        title={title ?? value}
        className="mt-1 line-clamp-2 break-words text-xs font-semibold text-foreground"
      >
        {value}
      </p>
    </div>
  );
}

function MonitoringBadges({ program }: { program: PropFirmRuleProgram }) {
  const automatic = program.monitorability?.automatic_mt5.length ?? 0;
  const manual = program.monitorability?.manual_check.length ?? 0;
  const unsupported = program.monitorability?.not_supported_yet.length ?? 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {automatic > 0 && (
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-200">
          Automático MT5
        </span>
      )}
      {manual > 0 && (
        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-200">
          Manual
        </span>
      )}
      {unsupported > 0 && (
        <span className="rounded-full border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">
          Não suportado
        </span>
      )}
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
  const isUnavailable = program.evidenceStatus === 'official_source_unavailable';
  const platforms = summarizeList(program.platforms, 2);
  const sizes = summarizeList(program.accountSizes, 3);

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card/80 p-4 shadow-sm shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            {program.firm}
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {program.programName}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {program.market} · {isUnavailable ? 'Catálogo não operacional' : platforms}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${
            isUnavailable
              ? 'border-slate-500/40 bg-slate-500/10 text-slate-300'
              : riskClass[program.riskLevel]
          }`}
        >
          {isUnavailable ? 'Indisponível' : `Risco ${program.riskLevel}`}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <InfoPill>{program.programType}</InfoPill>
        {!isUnavailable && <InfoPill>{program.drawdownType}</InfoPill>}
        {program.confidence && program.completeness && (
          <InfoPill>
            {compactConfidenceLabel[program.confidence]} ·{' '}
            {compactCompletenessLabel[program.completeness]}
          </InfoPill>
        )}
      </div>

      {isUnavailable ? (
        <div className="mt-4 border-y border-border py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Sem regras vigentes auditáveis para comparação ou configuração operacional.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3 border-y border-border py-3">
            <Metric
              label="Meta"
              value={briefValue(program.profitTarget, 44)}
              title={program.profitTarget}
            />
            <Metric
              label="Daily Loss"
              value={briefValue(program.dailyLoss, 44)}
              title={program.dailyLoss}
            />
            <Metric
              label="Max Loss"
              value={briefValue(program.maxLoss, 44)}
              title={program.maxLoss}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tamanhos:</span> {sizes}
          </p>
        </>
      )}

      <div className="mt-3 space-y-3">
        <div className="border-l-2 border-destructive/40 pl-3">
          <p className="text-[10px] font-medium uppercase text-muted-foreground">
            Pode reprovar por
          </p>
          <p
            title={program.mainRisk}
            className="mt-1 line-clamp-2 text-xs leading-5 text-foreground"
          >
            {briefValue(program.mainRisk, 116)}
          </p>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase text-muted-foreground">
            Monitoramento Fortify
          </p>
          <MonitoringBadges program={program} />
        </div>
      </div>

      <div className="mt-auto flex gap-2 pt-4">
        <Button onClick={onDetails} className="flex-1">
          {isUnavailable ? 'Ver status' : 'Ver regras'}
        </Button>
        <Button
          type="button"
          variant={isCompared ? 'secondary' : 'outline'}
          onClick={onCompare}
          disabled={isUnavailable || (!isCompared && compareDisabled)}
          className="flex-1"
        >
          {isUnavailable ? 'Não operacional' : isCompared ? 'Remover' : 'Comparar'}
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
  const representativeAccount = program.accountLevelRules?.[0];
  const accountRows =
    program.accountLevelRules && program.accountLevelRules.length > 0
      ? program.accountLevelRules.map((account) => ({
          label: account.label,
          profitTarget: account.phases.map((phase) => `${phase.label}: ${phase.profitTarget}`).join(' | '),
          dailyLoss: account.dailyLoss,
          maxLoss: account.maxLoss,
          maxContracts:
            account.maxContracts !== 'Não aplicável'
              ? account.maxContracts
              : account.maxLots !== 'Não aplicável'
                ? account.maxLots
                : 'Não aplicável',
        }))
      : program.accountSizeRows;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full w-full max-w-4xl flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              {program.firm}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
              {program.programName}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Revisado em {program.lastReviewedAt} · {program.programType} · {program.market}
            </p>
            {(program.confidence || program.completeness) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {program.confidence && <InfoPill>{confidenceLabel[program.confidence]}</InfoPill>}
                {program.completeness && <InfoPill>{completenessLabel[program.completeness]}</InfoPill>}
              </div>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar detalhes">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          <DrawerSection title="Resumo" defaultOpen>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Mesa" value={program.firm} />
              <Field label="Programa" value={program.programType} />
              <Field label="Mercado" value={program.market} />
              <Field label="Plataformas" value={program.platforms.join(', ')} />
              <Field label="Última revisão" value={program.lastReviewedAt} />
              <Field
                label="Evidência"
                value={`${program.confidence ? confidenceLabel[program.confidence] : 'Verificar'} · ${program.completeness ? completenessLabel[program.completeness] : 'Verificar'}`}
              />
            </div>
          </DrawerSection>

          <DrawerSection title="Regras críticas" defaultOpen>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Profit Target" value={program.profitTarget} />
              <Field label="Daily Loss" value={program.dailyLoss} />
              <Field label="Max Loss / Drawdown" value={program.maxLoss} />
              <Field label="Tipo de drawdown" value={`${program.drawdownType} · ${program.trailingDescription}`} />
              <Field label="Consistência" value={program.consistencyRule} />
              <Field label="Notícias" value={program.newsRule} />
              <Field label="Fim de semana" value={program.weekendRule} />
              <Field label="Pode reprovar por" value={program.mainRisk} />
            </div>
          </DrawerSection>

          <DrawerSection title="Contas e fases">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Conta</th>
                    <th className="px-4 py-3">Meta / fases</th>
                    <th className="px-4 py-3">Daily Loss</th>
                    <th className="px-4 py-3">Max Loss</th>
                    <th className="px-4 py-3">Contratos / lotes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accountRows.map((row) => (
                    <tr key={`${program.id}-${row.label}`} className="text-foreground">
                      <td className="px-4 py-3 font-medium">{displayValue(row.label)}</td>
                      <td className="px-4 py-3">{displayValue(row.profitTarget)}</td>
                      <td className="px-4 py-3">{displayValue(row.dailyLoss)}</td>
                      <td className="px-4 py-3">{displayValue(row.maxLoss)}</td>
                      <td className="px-4 py-3">{displayValue(row.maxContracts ?? 'Não aplicável')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DrawerSection>

          <DrawerSection title="Monitoramento Fortify" defaultOpen>
            <div className="grid gap-3 md:grid-cols-3">
              <DetailList
                title="Automático via MT5"
                items={program.monitorability?.automatic_mt5.length ? program.monitorability.automatic_mt5 : ['Não disponível para esta plataforma']}
              />
              <DetailList title="Validação manual" items={program.monitorability?.manual_check ?? []} tone="warning" />
              <DetailList title="Ainda não suportado" items={program.monitorability?.not_supported_yet ?? []} />
            </div>
          </DrawerSection>

          <DrawerSection title="Payout e operação">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Payout" value={program.payout} />
              <Field label="Profit split" value={representativeAccount?.payoutSplit ?? program.payout} />
              <Field label="Primeira retirada" value={representativeAccount?.firstPayoutTiming ?? 'Não informado publicamente'} />
              <Field label="Próximas retiradas" value={representativeAccount?.subsequentPayoutTiming ?? 'Não informado publicamente'} />
              <Field label="KYC" value={representativeAccount?.kycRule ?? 'Verificar no site oficial'} />
              <Field label="Dias mínimos" value={program.minTradingDays} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailList title="Objetivos" items={program.tradingObjectives} />
              <DetailList title="Notas operacionais" items={program.operationalNotes} />
            </div>
          </DrawerSection>

          <DrawerSection title="Fontes oficiais" defaultOpen>
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

            {program.conflicts && program.conflicts.length > 0 && (
              <div className="mt-4 border-l-2 border-amber-300 bg-amber-300/5 px-4 py-3">
                <h3 className="font-semibold text-amber-100">Conflitos de fonte registrados</h3>
                <ul className="mt-2 space-y-2">
                  {program.conflicts.map((conflict) => (
                    <li key={`${program.id}-${conflict.field}`} className="text-xs leading-5 text-amber-100/80">
                      <span className="font-medium text-amber-50">{conflict.field}:</span>{' '}
                      {conflict.summary}{' '}
                      <span className="text-foreground">Valor adotado: {conflict.preferredValue}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p>As regras podem mudar sem aviso. Confirme os termos oficiais antes de operar.</p>
            </div>
          </DrawerSection>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DrawerSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border border-border bg-background/25">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && <div className="border-t border-border px-4 py-4">{children}</div>}
    </section>
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
  const safeItems = items.length > 0 ? items : ['Não informado publicamente'];

  return (
    <section className="rounded-lg border border-border bg-background/35 p-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-2 space-y-2">
        {safeItems.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconClass}`} />
            <span>{displayValue(item)}</span>
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
      <section className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <ArrowUpDown className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Comparação</h2>
            <p className="text-xs text-muted-foreground">Selecione até 3 programas para comparar limites críticos.</p>
          </div>
        </div>
      </section>
    );
  }

  const monitoringLabel = (program: PropFirmRuleProgram) => {
    const automatic = program.monitorability?.automatic_mt5.length ?? 0;
    const manual = program.monitorability?.manual_check.length ?? 0;
    const unsupported = program.monitorability?.not_supported_yet.length ?? 0;
    return [
      automatic > 0 ? `MT5 automático (${automatic})` : null,
      manual > 0 ? `Manual (${manual})` : null,
      unsupported > 0 ? `Não suportado (${unsupported})` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  };

  const rows: Array<{
    label: string;
    value: (program: PropFirmRuleProgram) => string;
  }> = [
    { label: 'Target', value: (program) => program.profitTarget },
    { label: 'Daily Loss', value: (program) => program.dailyLoss },
    { label: 'Max Loss', value: (program) => program.maxLoss },
    { label: 'Drawdown', value: (program) => `${program.drawdownType} · ${program.trailingDescription}` },
    { label: 'Consistência', value: (program) => program.consistencyRule },
    { label: 'Notícias', value: (program) => program.newsRule },
    { label: 'Fim de semana', value: (program) => program.weekendRule },
    { label: 'Payout', value: (program) => program.payout },
    { label: 'Monitoramento', value: monitoringLabel },
    { label: 'Risco principal', value: (program) => program.mainRisk },
  ];

  return (
    <section className="rounded-lg border border-border bg-card/80 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Comparação de programas</h2>
          <p className="text-xs text-muted-foreground">Somente os campos que apoiam a decisão antes de operar.</p>
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
                    <span>
                      <span className="block text-primary">{program.firm}</span>
                      <span className="mt-1 block normal-case text-foreground">{program.programName}</span>
                    </span>
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
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                {programs.map((program) => (
                  <td key={`${program.id}-${row.label}`} className="px-4 py-3 text-xs leading-5 text-muted-foreground">
                    {briefValue(row.value(program), 112)}
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
  const [platform, setPlatform] = useState(allValue);
  const [drawdownType, setDrawdownType] = useState(allValue);
  const [monitoring, setMonitoring] = useState(allValue);
  const [evidence, setEvidence] = useState(allValue);
  const [accountSize, setAccountSize] = useState(allValue);
  const [riskLevel, setRiskLevel] = useState(allValue);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [detailsProgram, setDetailsProgram] = useState<PropFirmRuleProgram | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const comparisonRef = useRef<HTMLDivElement | null>(null);

  const accountSizeOptions = useMemo(
    () => Array.from(new Set(propFirmRulePrograms.flatMap((program) => program.accountSizes))).sort(),
    [],
  );
  const platformOptions = useMemo(
    () => Array.from(new Set(propFirmRulePrograms.flatMap((program) => program.platforms))).sort(),
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
          program.accountLevelRules
            .flatMap((account) => [
              account.label,
              account.initialBalance,
              account.price,
              account.platforms.join(' '),
              account.phases.map((phase) => phase.profitTarget).join(' '),
              account.dailyLoss,
              account.maxLoss,
              account.drawdownCalculation,
              account.consistencyRule,
              account.newsRule,
              account.weekendRule,
              account.payoutSplit,
              account.versions
                .flatMap((version) => [
                  version.label,
                  version.effectiveFrom ?? '',
                  version.effectiveTo ?? '',
                  version.condition ?? '',
                ])
                .join(' '),
            ])
            .join(' '),
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
        (platform === allValue || program.platforms.includes(platform)) &&
        (drawdownType === allValue || program.drawdownType === drawdownType) &&
        (monitoring === allValue ||
          (monitoring === 'Automático MT5' && Boolean(program.monitorability?.automatic_mt5.length)) ||
          (monitoring === 'Manual' && Boolean(program.monitorability?.manual_check.length)) ||
          (monitoring === 'Não suportado' && Boolean(program.monitorability?.not_supported_yet.length))) &&
        (evidence === allValue ||
          (evidence === 'Evidência completa' && program.completeness === 'complete') ||
          (evidence === 'Evidência parcial' && program.completeness === 'partial') ||
          (evidence === 'Revisão legada' && program.completeness === 'legacy') ||
          (evidence === 'Confiança alta' && program.confidence === 'high') ||
          (evidence === 'Confiança média' && program.confidence === 'medium') ||
          (evidence === 'Confiança baixa' && program.confidence === 'low')) &&
        (accountSize === allValue || program.accountSizes.includes(accountSize)) &&
        (riskLevel === allValue || program.riskLevel === riskLevel)
      );
    });
  }, [accountSize, drawdownType, evidence, firm, market, monitoring, platform, programType, query, riskLevel]);

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
    setPlatform(allValue);
    setDrawdownType(allValue);
    setMonitoring(allValue);
    setEvidence(allValue);
    setAccountSize(allValue);
    setRiskLevel(allValue);
  };

  const scrollToComparison = () => {
    comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const advancedFilterCount = [
    platform,
    drawdownType,
    monitoring,
    evidence,
    accountSize,
    riskLevel,
  ].filter((value) => value !== allValue).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-border pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Biblioteca informativa
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                Regras de Prop Firms
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Compare os limites que podem reprovar sua conta e abra os detalhes somente quando precisar.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={scrollToComparison}>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Comparar selecionados
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-l-2 border-amber-300/50 pl-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Confirme as regras no site oficial antes de operar.</p>
            <p>
              {new Set(propFirmRulePrograms.map((program) => program.firm)).size} mesas ·{' '}
              {propFirmRulePrograms.length} programas auditados
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4 text-primary" />
              Buscar regras
            </div>
            <p className="text-xs text-muted-foreground">{filteredPrograms.length} programas encontrados</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
          </div>
          {showAdvancedFilters && (
            <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-3">
              <SelectFilter label="Plataforma" value={platform} options={platformOptions} onChange={setPlatform} />
              <SelectFilter label="Drawdown" value={drawdownType} options={propFirmFilterOptions.drawdownTypes} onChange={setDrawdownType} />
              <SelectFilter label="Monitoramento" value={monitoring} options={monitoringOptions} onChange={setMonitoring} />
              <SelectFilter label="Confiança / completude" value={evidence} options={evidenceOptions} onChange={setEvidence} />
              <SelectFilter label="Tamanho" value={accountSize} options={accountSizeOptions} onChange={setAccountSize} />
              <SelectFilter label="Risco" value={riskLevel} options={propFirmFilterOptions.riskLevels} onChange={setRiskLevel} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvancedFilters((current) => !current)}
              aria-expanded={showAdvancedFilters}
              className="px-0 hover:bg-transparent"
            >
              Filtros avançados{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ''}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              Limpar filtros
            </Button>
          </div>
        </section>

        <div ref={comparisonRef} className="scroll-mt-6">
          <ComparisonPanel programs={comparedPrograms} onRemove={(id) => setComparisonIds((current) => current.filter((item) => item !== id))} />
        </div>

        {filteredPrograms.length > 0 ? (
          <section data-testid="rules-program-grid" className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
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
          <section className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Nenhuma regra encontrada</h2>
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma regra encontrada para os filtros selecionados.</p>
          </section>
        )}
      </div>

      <DetailsDrawer program={detailsProgram} onClose={() => setDetailsProgram(null)} />
    </div>
  );
}
