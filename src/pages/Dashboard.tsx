import { useState } from 'react';
import { MOCK_ACCOUNTS, MOCK_EVALUATIONS } from '@/data/mockData';
import { AccountSelector } from '@/components/AccountSelector';
import { AccountHealthBanner } from '@/components/AccountHealthBanner';
import { RiskCard } from '@/components/RiskCard';
import { ProgressCard } from '@/components/ProgressCard';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { TradingAccount } from '@/types/fortify';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(MOCK_ACCOUNTS[0]);
  const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === selectedAccount.id);

  // Account stats
  const pnl = selectedAccount.currentBalance - selectedAccount.startBalance;
  const pnlPct = ((pnl / selectedAccount.startBalance) * 100).toFixed(2);
  const isPositive = pnl >= 0;
  const drawdown = selectedAccount.highestEquityAllTime - selectedAccount.currentEquity;
  const drawdownPct = ((drawdown / selectedAccount.highestEquityAllTime) * 100).toFixed(2);

  // Risk
  const dailyLoss = evals.find(e => e.rule.type === 'MAX_DAILY_LOSS');
  const totalLoss = evals.find(e => e.rule.type === 'MAX_TOTAL_LOSS') || evals.find(e => e.rule.type === 'TRAILING_MAX_LOSS');
  const floatingLoss = {
    current: Math.max(0, selectedAccount.currentBalance - selectedAccount.currentEquity),
    limit: selectedAccount.startBalance * 0.1,
  };

  // Progress
  const profitTarget = evals.find(e => e.rule.type === 'PROFIT_TARGET');
  const minDays = evals.find(e => e.rule.type === 'MIN_TRADING_DAYS');

  // Health
  const hasViolation = evals.some(e => e.status === 'VIOLATED');
  const hasWarning = evals.some(e => e.status === 'WARNING');
  const healthStatus = hasViolation ? 'VIOLATED' as const : hasWarning ? 'WARNING' as const : 'SAFE' as const;

  // Health score (0-100)
  const riskEvals = evals.filter(e => ['MAX_DAILY_LOSS', 'MAX_TOTAL_LOSS', 'TRAILING_MAX_LOSS'].includes(e.rule.type));
  const avgRiskUsage = riskEvals.length > 0 ? riskEvals.reduce((s, e) => s + e.progressPct, 0) / riskEvals.length : 0;
  const healthScore = Math.max(0, Math.round(100 - avgRiskUsage));

  // Alerts
  const alerts = evals.filter(e => e.status === 'WARNING' || e.status === 'VIOLATED');

  const dailyRemaining = dailyLoss ? Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue) : 0;

  const fmt = (v: number) => `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <AccountSelector accounts={MOCK_ACCOUNTS} selected={selectedAccount} onSelect={setSelectedAccount} />

      {/* ACCOUNT HEALTH */}
      <AccountHealthBanner status={healthStatus} score={healthScore} />

      {/* ACCOUNT STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Saldo Atual', value: fmt(selectedAccount.currentBalance), icon: DollarSign, color: 'text-primary' },
          { label: 'P&L Total', value: `${isPositive ? '+' : ''}${fmt(pnl)}`, sub: `${isPositive ? '+' : ''}${pnlPct}%`, icon: isPositive ? TrendingUp : TrendingDown, color: isPositive ? 'text-success' : 'text-destructive' },
          { label: 'Equity', value: fmt(selectedAccount.currentEquity), icon: BarChart3, color: 'text-info' },
          { label: 'Drawdown', value: fmt(drawdown), sub: `${drawdownPct}%`, icon: TrendingDown, color: 'text-warning' },
        ].map((stat, i) => (
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
            {stat.sub && <p className={`text-xs font-mono ${stat.color} opacity-70`}>{stat.sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* RISCO DA CONTA */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Risco da Conta</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {totalLoss && (
            <RiskCard
              title="Perda Máxima"
              limit={totalLoss.limitValue}
              current={totalLoss.currentValue}
              status={totalLoss.status}
            />
          )}
          {dailyLoss && (
            <RiskCard
              title="Perda Diária"
              limit={dailyLoss.limitValue}
              current={dailyLoss.currentValue}
              status={dailyLoss.status}
              highlight={`Você ainda pode perder hoje: ${fmt(dailyRemaining)}`}
            />
          )}
          <RiskCard
            title="Perda Flutuante"
            limit={floatingLoss.limit}
            current={floatingLoss.current}
            status={floatingLoss.current / floatingLoss.limit > 0.7 ? 'WARNING' : 'APPROVING'}
          />
        </div>
      </section>

      {/* PROGRESSO DA CONTA */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Progresso da Conta</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profitTarget && (
            <ProgressCard
              title="Meta de Lucro"
              current={fmt(profitTarget.currentValue)}
              target={fmt(profitTarget.limitValue)}
              pct={profitTarget.progressPct}
              status={profitTarget.status}
            />
          )}
          {minDays && (
            <ProgressCard
              title="Dias Lucrativos"
              current={minDays.currentValue}
              target={minDays.limitValue}
              pct={minDays.progressPct}
              status={minDays.status}
            />
          )}
          {evals.find(e => e.rule.type === 'CONSISTENCY_BEST_DAY_CAP') && (() => {
            const consistency = evals.find(e => e.rule.type === 'CONSISTENCY_BEST_DAY_CAP')!;
            return (
              <ProgressCard
                title="Consistência"
                current={`${consistency.currentValue}%`}
                target={`${consistency.limitValue}%`}
                pct={consistency.progressPct}
                status={consistency.status}
              />
            );
          })()}
        </div>
      </section>

      {/* ALERTAS */}
      {alerts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Alertas</h2>
          <div className="space-y-2">
            {alerts.map(a => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-lg border p-4 flex items-center gap-3 ${
                  a.status === 'VIOLATED'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-warning/30 bg-warning/5'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${a.status === 'VIOLATED' ? 'text-destructive' : 'text-warning'}`} />
                <p className="text-sm text-foreground">{a.message}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <footer className="pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground font-mono">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
