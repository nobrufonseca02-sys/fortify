import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Hand,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type {
  BoundAccountRuleEvaluation,
  RuleEvaluationStatus,
} from '@/lib/ruleEngine/ruleEngineTypes';

interface BoundRuleEvaluationCardProps {
  evaluation: BoundAccountRuleEvaluation;
}

const statusMeta: Record<
  RuleEvaluationStatus,
  {
    label: string;
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  safe: {
    label: 'Seguro',
    className: 'border-success/30 bg-success/10 text-success',
    icon: CheckCircle2,
  },
  warning: {
    label: 'Atenção',
    className: 'border-warning/30 bg-warning/10 text-warning',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Crítico',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    icon: ShieldAlert,
  },
  breached: {
    label: 'Violado',
    className: 'border-destructive/50 bg-destructive/15 text-destructive',
    icon: XCircle,
  },
  not_monitorable: {
    label: 'Não monitorável',
    className: 'border-border bg-muted/30 text-muted-foreground',
    icon: CircleHelp,
  },
  pending_binding: {
    label: 'Vínculo pendente',
    className: 'border-warning/30 bg-warning/10 text-warning',
    icon: AlertTriangle,
  },
};

function formatMoney(value: number | null, currency: string) {
  if (value === null) return 'Sem dados';
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
}

export function BoundRuleEvaluationCard({
  evaluation,
}: BoundRuleEvaluationCardProps) {
  const overall = statusMeta[evaluation.overallStatus];
  const OverallIcon = overall.icon;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Motor operacional</p>
          <h2 className="mt-2 font-semibold text-foreground">
            Regras do snapshot versionado
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {evaluation.overallMessage}
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${overall.className}`}
        >
          <OverallIcon className="h-3.5 w-3.5" />
          {overall.label}
        </span>
      </div>

      <div className="divide-y divide-border border-y border-border">
        {evaluation.automaticRules.map((rule) => {
          const meta = statusMeta[rule.status];
          const StatusIcon = meta.icon;
          return (
            <div
              key={rule.key}
              className="grid gap-3 py-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(250px,1.4fr)_auto]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-4 w-4 ${meta.className.split(' ').at(-1)}`} />
                  <p className="text-sm font-semibold text-foreground">{rule.label}</p>
                </div>
                {rule.phaseLabel ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {rule.phaseLabel}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs text-foreground">{rule.message}</p>
                {rule.detail ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">{rule.detail}</p>
                ) : null}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Regra: {rule.sourceRule || 'Não informada no snapshot'}
                </p>
              </div>
              <div className="grid min-w-[210px] grid-cols-3 gap-3 text-right">
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground">Atual</p>
                  <p className="font-mono text-xs text-foreground">
                    {formatMoney(rule.currentValue, rule.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground">Limite</p>
                  <p className="font-mono text-xs text-foreground">
                    {formatMoney(rule.limitValue, rule.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground">
                    {rule.key === 'profit_target' ? 'Falta' : 'Margem'}
                  </p>
                  <p className="font-mono text-xs text-foreground">
                    {formatMoney(rule.remainingValue, rule.currency)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(evaluation.manualRules.length > 0 ||
        evaluation.unsupportedRules.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Hand className="h-3.5 w-3.5 text-warning" />
              Validação manual
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {evaluation.manualRules.map((rule) => (
                <span
                  key={rule.label}
                  className="rounded-full border border-warning/20 bg-warning/5 px-2 py-1 text-[10px] text-muted-foreground"
                >
                  {rule.label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" />
              Ainda não suportado
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {evaluation.unsupportedRules.map((rule) => (
                <span
                  key={rule.label}
                  className="rounded-full border border-border bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground"
                >
                  {rule.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {evaluation.source.snapshotHash ? (
        <p className="text-[10px] text-muted-foreground">
          Fonte operacional: snapshot da conta ·{' '}
          <span className="font-mono">
            {evaluation.source.snapshotHash.slice(0, 22)}...
          </span>
        </p>
      ) : null}
    </section>
  );
}
