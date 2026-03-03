import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RuleEvaluation, STATUS_CONFIG, RULE_TYPE_DESCRIPTIONS } from '@/types/fortify';
import { CircularProgress } from './CircularProgress';
import { Shield, AlertTriangle, Info } from 'lucide-react';

interface RuleDetailModalProps {
  evaluation: RuleEvaluation;
  open: boolean;
  onClose: () => void;
}

export function RuleDetailModal({ evaluation, open, onClose }: RuleDetailModalProps) {
  const config = STATUS_CONFIG[evaluation.status];
  const description = RULE_TYPE_DESCRIPTIONS[evaluation.rule.type];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            {evaluation.rule.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${config.bgClass} ${config.textClass}`}>
              {config.label}
            </span>
            <CircularProgress value={evaluation.progressPct} status={evaluation.status} size={56} />
          </div>

          {/* Description */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor Atual</span>
              <p className="text-lg font-mono font-bold text-foreground mt-1">
                {evaluation.currentValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Limite</span>
              <p className="text-lg font-mono font-bold text-muted-foreground mt-1">
                {evaluation.limitValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm text-muted-foreground font-mono">{evaluation.message}</p>
          </div>

          {/* Rule params */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Parâmetros da Regra</h4>
            <div className="space-y-1">
              {Object.entries(evaluation.rule.params).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-mono text-foreground">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Severity warning */}
          {evaluation.rule.severity === 'hard' && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">
                Regra HARD — Violação desta regra resulta em reprovação imediata da conta.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
