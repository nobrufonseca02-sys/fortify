import { useState } from 'react';
import { MOCK_ACCOUNTS, MOCK_EVALUATIONS } from '@/data/mockData';
import { AccountSelector } from '@/components/AccountSelector';
import { AccountHealthBanner } from '@/components/AccountHealthBanner';
import { RiskCard } from '@/components/RiskCard';
import { ProgressCard } from '@/components/ProgressCard';
import { AlertTriangle } from 'lucide-react';
import { TradingAccount } from '@/types/fortify';

const Dashboard = () => {
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(MOCK_ACCOUNTS[0]);
  const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === selectedAccount.id);

  // Risco
  const dailyLoss = evals.find(e => e.rule.type === 'MAX_DAILY_LOSS');
  const totalLoss = evals.find(e => e.rule.type === 'MAX_TOTAL_LOSS') || evals.find(e => e.rule.type === 'TRAILING_MAX_LOSS');
  const floatingLoss = {
    current: Math.max(0, selectedAccount.currentBalance - selectedAccount.currentEquity),
    limit: selectedAccount.startBalance * 0.1,
  };

  // Progresso
  const profitTarget = evals.find(e => e.rule.type === 'PROFIT_TARGET');
  const minDays = evals.find(e => e.rule.type === 'MIN_TRADING_DAYS');

  // Saúde
  const hasViolation = evals.some(e => e.status === 'VIOLATED');
  const hasWarning = evals.some(e => e.status === 'WARNING');
  const healthStatus = hasViolation ? 'VIOLATED' as const : hasWarning ? 'WARNING' as const : 'SAFE' as const;

  // Alertas
  const alerts = evals.filter(e => e.status === 'WARNING' || e.status === 'VIOLATED');

  const dailyRemaining = dailyLoss ? Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <AccountSelector accounts={MOCK_ACCOUNTS} selected={selectedAccount} onSelect={setSelectedAccount} />

      <AccountHealthBanner status={healthStatus} />

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
              highlight={`Você ainda pode perder hoje: $${dailyRemaining.toLocaleString('pt-BR')}`}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profitTarget && (
            <ProgressCard
              title="Meta de Lucro"
              current={`$${profitTarget.currentValue.toLocaleString('pt-BR')}`}
              target={`$${profitTarget.limitValue.toLocaleString('pt-BR')}`}
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
        </div>
      </section>

      {/* ALERTAS */}
      {alerts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Alertas</h2>
          <div className="space-y-2">
            {alerts.map(a => (
              <div
                key={a.id}
                className={`rounded-lg border p-4 flex items-center gap-3 ${
                  a.status === 'VIOLATED'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-warning/30 bg-warning/5'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${a.status === 'VIOLATED' ? 'text-destructive' : 'text-warning'}`} />
                <p className="text-sm text-foreground">{a.message}</p>
              </div>
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
