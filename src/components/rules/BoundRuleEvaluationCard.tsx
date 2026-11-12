import { AlertTriangle, CheckCircle2, CircleHelp, ShieldAlert, XCircle } from 'lucide-react';
import type { BoundAccountRuleEvaluation, BoundRuleEvaluation, RuleEvaluationStatus } from '@/lib/ruleEngine/ruleEngineTypes';

// Regras da conta, uma linha cada: nome, quanto falta e a barra de uso.
// Sem dado da conta, nada de "violado": mostra que ainda não chegou.

interface BoundRuleEvaluationCardProps {
  evaluation: BoundAccountRuleEvaluation;
  /** false = a conta ainda não mandou saldo (EA não conectou). */
  hasData?: boolean;
}

const statusMeta: Record<RuleEvaluationStatus, { label: string; tone: string; bar: string; icon: typeof CheckCircle2 }> = {
  safe: { label: 'Ok', tone: 'text-success', bar: 'bg-success', icon: CheckCircle2 },
  partial: { label: 'Parcial', tone: 'text-info', bar: 'bg-info', icon: CircleHelp },
  warning: { label: 'Atenção', tone: 'text-warning', bar: 'bg-warning', icon: AlertTriangle },
  critical: { label: 'Crítico', tone: 'text-destructive', bar: 'bg-destructive', icon: ShieldAlert },
  breached: { label: 'Quebrada', tone: 'text-destructive', bar: 'bg-destructive', icon: XCircle },
  not_monitorable: { label: 'Sem dados', tone: 'text-muted-foreground', bar: 'bg-muted-foreground', icon: CircleHelp },
  pending_binding: { label: 'Sem modelo', tone: 'text-warning', bar: 'bg-warning', icon: AlertTriangle },
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
}

/** A frase curta de cada regra: o número que o trader precisa ver. */
function shortValue(rule: BoundRuleEvaluation) {
  if (rule.status === 'not_monitorable' || rule.status === 'pending_binding') return 'Sem dados';
  if (rule.status === 'breached') return 'Limite atingido';
  if (rule.key === 'profit_target') {
    return rule.remainingValue !== null && rule.remainingValue > 0 ? `faltam ${money(rule.remainingValue, rule.currency)}` : 'Meta atingida';
  }
  if (rule.key === 'min_trading_days') {
    return rule.currentValue !== null && rule.limitValue !== null ? `${rule.currentValue} de ${rule.limitValue} dias` : 'Sem dados';
  }
  if (rule.key === 'consistency') {
    return rule.remainingValue !== null ? `hoje até +${money(rule.remainingValue, rule.currency)}` : rule.message;
  }
  return rule.remainingValue !== null ? `folga ${money(rule.remainingValue, rule.currency)}` : 'Sem dados';
}

export function BoundRuleEvaluationCard({ evaluation, hasData = true }: BoundRuleEvaluationCardProps) {
  const overallStatus: RuleEvaluationStatus = hasData ? evaluation.overallStatus : 'not_monitorable';
  const overall = statusMeta[overallStatus];

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground">Regras</h2>
        <span className={`text-xs font-semibold ${overall.tone}`}>{hasData ? overall.label : 'Aguardando dados'}</span>
      </div>

      <ul className="mt-3 divide-y divide-border">
        {evaluation.automaticRules.map((rule) => {
          const status: RuleEvaluationStatus = hasData ? rule.status : 'not_monitorable';
          const meta = statusMeta[status];
          const Icon = meta.icon;
          const used = hasData && rule.percentage !== null ? Math.min(100, Math.max(0, rule.percentage)) : null;
          return (
            <li key={rule.key} className="py-3" title={rule.sourceRule || undefined}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className={`h-4 w-4 ${meta.tone}`} aria-hidden />
                  {rule.label}
                  {rule.phaseLabel ? <span className="text-xs font-normal text-muted-foreground">{rule.phaseLabel}</span> : null}
                </span>
                <span className={`font-mono text-sm ${status === 'safe' ? 'text-foreground' : meta.tone}`}>
                  {hasData ? shortValue(rule) : 'Sem dados'}
                </span>
              </div>
              {used !== null && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className={`h-full ${meta.bar}`} style={{ width: `${used}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
