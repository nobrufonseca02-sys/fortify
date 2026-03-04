import { Shield, AlertTriangle, XCircle } from 'lucide-react';

type HealthStatus = 'SAFE' | 'WARNING' | 'VIOLATED';

interface AccountHealthBannerProps {
  status: HealthStatus;
}

const config: Record<HealthStatus, { label: string; subtitle: string; icon: typeof Shield; bgClass: string; textClass: string; borderClass: string }> = {
  SAFE: { label: 'SEGURO', subtitle: 'Sua conta está dentro dos limites.', icon: Shield, bgClass: 'bg-success/10', textClass: 'text-success', borderClass: 'border-success/30' },
  WARNING: { label: 'ATENÇÃO', subtitle: 'Você está se aproximando de um limite.', icon: AlertTriangle, bgClass: 'bg-warning/10', textClass: 'text-warning', borderClass: 'border-warning/30' },
  VIOLATED: { label: 'VIOLADO', subtitle: 'Uma ou mais regras foram violadas.', icon: XCircle, bgClass: 'bg-destructive/10', textClass: 'text-destructive', borderClass: 'border-destructive/30' },
};

export function AccountHealthBanner({ status }: AccountHealthBannerProps) {
  const c = config[status];
  const Icon = c.icon;

  return (
    <div className={`rounded-xl border ${c.borderClass} ${c.bgClass} p-6 flex items-center gap-4`}>
      <Icon className={`w-8 h-8 ${c.textClass}`} />
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Saúde da Conta</p>
        <p className={`text-2xl font-bold font-mono tracking-wider ${c.textClass}`}>{c.label}</p>
        <p className="text-xs text-muted-foreground mt-1">{c.subtitle}</p>
      </div>
    </div>
  );
}
