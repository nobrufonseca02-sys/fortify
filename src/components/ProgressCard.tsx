interface ProgressCardProps {
  title: string;
  current: number | string;
  target: number | string;
  pct: number;
  status: 'APPROVING' | 'WARNING' | 'VIOLATED' | 'NOT_MET';
}

export function ProgressCard({ title, current, target, pct, status }: ProgressCardProps) {
  const barColor =
    status === 'APPROVING' ? 'bg-success' :
    status === 'WARNING' ? 'bg-warning' :
    status === 'VIOLATED' ? 'bg-destructive' :
    'bg-muted-foreground';

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>

      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold font-mono text-foreground">{current}</span>
        <span className="text-sm font-mono text-muted-foreground">/ {target}</span>
      </div>

      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>

      <p className="text-xs font-mono text-muted-foreground">{pct}% concluído</p>
    </div>
  );
}
