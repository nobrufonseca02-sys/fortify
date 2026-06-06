import { TradingAccount } from '@/types/fortify';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AccountStatsProps {
  account: TradingAccount;
}

export function AccountStats({ account }: AccountStatsProps) {
  const pnl = account.currentBalance - account.startBalance;
  const pnlPct = account.startBalance > 0 ? ((pnl / account.startBalance) * 100).toFixed(2) : '0.00';
  const isPositive = pnl >= 0;
  const drawdown = account.highestEquityAllTime - account.currentEquity;
  const drawdownPct = account.highestEquityAllTime > 0 ? ((drawdown / account.highestEquityAllTime) * 100).toFixed(2) : '0.00';

  const stats = [
    {
      label: 'Saldo Atual',
      value: `$${account.currentBalance.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      label: 'P&L Total',
      value: `${isPositive ? '+' : ''}$${pnl.toLocaleString()}`,
      sub: `${isPositive ? '+' : ''}${pnlPct}%`,
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-success' : 'text-destructive',
    },
    {
      label: 'Equity',
      value: `$${account.currentEquity.toLocaleString()}`,
      icon: BarChart3,
      color: 'text-info',
    },
    {
      label: 'Drawdown',
      value: `$${drawdown.toLocaleString()}`,
      sub: `${drawdownPct}%`,
      icon: TrendingDown,
      color: 'text-warning',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
          </div>
          <p className={`font-mono font-bold text-lg ${stat.color}`}>{stat.value}</p>
          {stat.sub && (
            <p className={`text-xs font-mono ${stat.color} opacity-70`}>{stat.sub}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
