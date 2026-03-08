import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type MT5Status = 'disconnected' | 'connecting' | 'connected' | 'auth_error' | 'syncing';

const STATUS_CONFIG: Record<MT5Status, { label: string; icon: React.ElementType; className: string }> = {
  disconnected: {
    label: 'Desconectada',
    icon: WifiOff,
    className: 'bg-muted text-muted-foreground border-border',
  },
  connecting: {
    label: 'Conectando...',
    icon: Loader2,
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  connected: {
    label: 'Conectada',
    icon: CheckCircle2,
    className: 'bg-success/15 text-success border-success/30',
  },
  auth_error: {
    label: 'Erro de Autenticação',
    icon: XCircle,
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
  syncing: {
    label: 'Sincronizando...',
    icon: RefreshCw,
    className: 'bg-info/15 text-info border-info/30',
  },
};

interface MT5StatusBadgeProps {
  status: MT5Status;
  className?: string;
}

export function MT5StatusBadge({ status, className }: MT5StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isAnimated = status === 'connecting' || status === 'syncing';

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium', config.className, className)}
    >
      <Icon className={cn('h-3 w-3', isAnimated && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}
