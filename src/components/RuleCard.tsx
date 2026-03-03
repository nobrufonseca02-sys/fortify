import { motion } from 'framer-motion';
import { RuleEvaluation, STATUS_CONFIG, RULE_TYPE_DESCRIPTIONS } from '@/types/fortify';
import { CircularProgress } from './CircularProgress';
import { useState } from 'react';
import { RuleDetailModal } from './RuleDetailModal';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const StatusIcon = ({ status }: { status: RuleEvaluation['status'] }) => {
  switch (status) {
    case 'APPROVING': return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'WARNING': return <AlertTriangle className="w-4 h-4 text-warning" />;
    case 'VIOLATED': return <XCircle className="w-4 h-4 text-destructive" />;
    case 'NOT_MET': return <Shield className="w-4 h-4 text-muted-foreground" />;
  }
};

interface RuleCardProps {
  evaluation: RuleEvaluation;
  index: number;
}

export function RuleCard({ evaluation, index }: RuleCardProps) {
  const [showModal, setShowModal] = useState(false);
  const config = STATUS_CONFIG[evaluation.status];
  const description = RULE_TYPE_DESCRIPTIONS[evaluation.rule.type];

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (value <= 100 && evaluation.rule.type === 'CONSISTENCY_BEST_DAY_CAP') return `${value}%`;
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="group relative rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        {/* Status glow line */}
        <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-full ${
          evaluation.status === 'APPROVING' ? 'bg-success' :
          evaluation.status === 'WARNING' ? 'bg-warning' :
          evaluation.status === 'VIOLATED' ? 'bg-destructive' :
          'bg-muted-foreground/30'
        }`} />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon status={evaluation.status} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass}`}>
                {config.label}
              </span>
              {evaluation.rule.severity === 'hard' && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-destructive/70">hard</span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-foreground mb-1 truncate">
              {evaluation.rule.name}
            </h3>

            {/* Description */}
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {description}
            </p>

            {/* Values */}
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Atual</span>
                <p className="font-mono font-semibold text-foreground">{formatValue(evaluation.currentValue)}</p>
              </div>
              <div className="text-muted-foreground/30">/</div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Limite</span>
                <p className="font-mono font-semibold text-muted-foreground">{formatValue(evaluation.limitValue)}</p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex-shrink-0">
            <CircularProgress 
              value={evaluation.progressPct} 
              status={evaluation.status}
              size={64}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">{evaluation.message}</span>
          <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Ver detalhes →
          </span>
        </div>
      </motion.div>

      <RuleDetailModal
        evaluation={evaluation}
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
