import { Shield, AlertTriangle, XCircle } from 'lucide-react';

type HealthStatus = 'SAFE' | 'WARNING' | 'VIOLATED';

interface AccountHealthBannerProps {
  status: HealthStatus;
}

const config: Record<HealthStatus, { label: string; icon: typeof Shield; bgClass: string; textClass: string; borderClass: string }> = {
  SAFE: { label: 'SAFE', icon: Shield, bgClass: 'bg-success/10', textClass: 'text-success', borderClass: 'border-success/30' },
  WARNING: { label: 'WARNING', icon: AlertTriangle, bgClass: 'bg-warning/10', textClass: 'text-warning', borderClass: 'border-warning/30' },
  VIOLATED: { label: 'VIOLATED', icon: XCircle, bgClass: 'bg-destructive/10', textClass: 'text-destructive', borderClass: 'border-destructive/30' },
};

export function AccountHealthBanner({ status }: AccountHealthBannerProps) {
  const c = config[status];
  const Icon = c.icon;

  return (
    <div className={`rounded-xl border ${c.borderClass} ${c.bgClass} p-6 flex items-center gap-4`}>
      <Icon className={`w-8 h-8 ${c.textClass}`} />
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Account Health</p>
        <p className={`text-2xl font-bold font-mono tracking-wider ${c.textClass}`}>{c.label}</p>
      </div>
    </div>
  );
}
