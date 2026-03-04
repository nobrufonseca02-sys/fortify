import { Progress } from '@/components/ui/progress';

interface RiskCardProps {
  title: string;
  limit: number;
  current: number;
  status: 'APPROVING' | 'WARNING' | 'VIOLATED' | 'NOT_MET';
  highlight?: string;
}

export function RiskCard({ title, limit, current, status, highlight }: RiskCardProps) {
  const remaining = Math.max(0, limit - current);
  const pct = limit > 0 ? Math.min(100, (current / limit) * 100) : 0;

  const barColor =
    status === 'VIOLATED' ? 'bg-destructive' :
    status === 'WARNING' ? 'bg-warning' :
    'bg-success';

  const textColor =
    status === 'VIOLATED' ? 'text-destructive' :
    status === 'WARNING' ? 'text-warning' :
    'text-success';

  const fmt = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>

      {highlight && (
        <p className={`text-lg font-bold font-mono ${textColor}`}>{highlight}</p>
      )}

      <div className="space-y-2">
        <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>

        <div className="flex justify-between text-xs font-mono text-muted-foreground">
          <span>Atual: <span className={textColor}>{fmt(current)}</span></span>
          <span>Limite: {fmt(limit)}</span>
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          Restante: <span className="text-foreground">{fmt(remaining)}</span>
        </p>
      </div>
    </div>
  );
}
