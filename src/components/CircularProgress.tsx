import { RuleStatus } from '@/types/fortify';

interface CircularProgressProps {
  value: number;
  status: RuleStatus;
  size?: number;
}

export function CircularProgress({ value, status, size = 64 }: CircularProgressProps) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  const colorClass =
    status === 'APPROVING' ? 'text-success' :
    status === 'WARNING' ? 'text-warning' :
    status === 'VIOLATED' ? 'text-destructive' :
    'text-muted-foreground';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-mono font-bold ${colorClass}`}>
          {clampedValue}%
        </span>
      </div>
    </div>
  );
}
