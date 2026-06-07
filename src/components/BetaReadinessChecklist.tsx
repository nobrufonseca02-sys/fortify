import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import type { ElementType } from 'react';
import type { BetaChecklistItem, BetaChecklistStatus } from '@/lib/betaReadiness';
import { cn } from '@/lib/utils';

const statusMeta: Record<BetaChecklistStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  complete: { label: 'Complete', icon: CheckCircle2, className: 'bg-success/15 text-success border-success/20' },
  pending: { label: 'Pending', icon: Circle, className: 'bg-muted text-muted-foreground border-border' },
  warning: { label: 'Warning', icon: AlertTriangle, className: 'bg-warning/15 text-warning border-warning/25' },
};

export function BetaReadinessChecklist({
  items,
  title = 'Beta readiness checklist',
  description = 'Complete these steps before relying on this account for live monitoring.',
  compact = false,
}: {
  items: BetaChecklistItem[];
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      <div className={cn('grid gap-2', compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
        {items.map((item) => {
          const meta = statusMeta[item.status];
          const Icon = meta.icon;
          return (
            <div key={item.id} className="rounded-lg border border-border/70 bg-background/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', meta.className)}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.description}</p>
                </div>
                {item.actionLabel && item.actionTo ? (
                  <button
                    type="button"
                    onClick={() => navigate(item.actionTo!)}
                    className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {item.actionLabel}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function BetaResponsibilityNotice({ variant = 'default' }: { variant?: 'default' | 'rules' | 'broker' | 'custom' }) {
  const copy = {
    default: 'Fortify helps monitor rules and risk, but traders must confirm official terms with the prop firm dashboard, contract or support team.',
    rules: 'Templates marked needs_review must be validated before use. Fortify does not replace the official prop firm dashboard or contract.',
    broker: 'Broker-only templates are generic risk guardrails. They are not official prop firm rules.',
    custom: 'Custom rules are controlled by the user. Review limits carefully before relying on them for decisions.',
  };

  return (
    <div className="rounded-xl border border-info/25 bg-info/5 p-4 flex items-start gap-3">
      <ShieldCheck className="h-4 w-4 text-info mt-0.5 shrink-0" />
      <p className="text-xs text-foreground/85 leading-relaxed">{copy[variant]}</p>
    </div>
  );
}

export function GuidedEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">{description}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="pill-btn pill-btn-primary mt-4">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
