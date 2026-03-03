import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Target, CreditCard } from 'lucide-react';
import { MOCK_ACCOUNTS, MOCK_EVALUATIONS } from '@/data/mockData';
import { AccountSelector } from '@/components/AccountSelector';
import { AccountStats } from '@/components/AccountStats';
import { RuleCard } from '@/components/RuleCard';
import { TradingAccount } from '@/types/fortify';

const Dashboard = () => {
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(MOCK_ACCOUNTS[0]);

  const accountEvals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === selectedAccount.id);
  const riskRules = accountEvals.filter(e => 
    ['MAX_DAILY_LOSS', 'MAX_TOTAL_LOSS', 'TRAILING_MAX_LOSS'].includes(e.rule.type)
  );
  const objectiveRules = accountEvals.filter(e => 
    ['PROFIT_TARGET', 'MIN_TRADING_DAYS', 'CONSISTENCY_BEST_DAY_CAP', 'INACTIVITY_LIMIT'].includes(e.rule.type)
  );
  const otherRules = accountEvals.filter(e => 
    ['NEWS_RESTRICTION_WINDOW', 'SCALPING_RULE', 'MAX_STACKING_TRADES', 'PROFIT_CAP_PAYOUT'].includes(e.rule.type)
  );

  const violatedCount = accountEvals.filter(e => e.status === 'VIOLATED').length;
  const warningCount = accountEvals.filter(e => e.status === 'WARNING').length;
  const approvingCount = accountEvals.filter(e => e.status === 'APPROVING').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">FORTIFY</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Risk Control</p>
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex items-center gap-2">
            {violatedCount > 0 && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-destructive/15 text-destructive">
                {violatedCount} violado
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-warning/15 text-warning">
                {warningCount} atenção
              </span>
            )}
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-success/15 text-success">
              {approvingCount} ok
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Account Selector */}
        <AccountSelector
          accounts={MOCK_ACCOUNTS}
          selected={selectedAccount}
          onSelect={setSelectedAccount}
        />

        {/* Stats */}
        <AccountStats account={selectedAccount} />

        {/* Risk Rules */}
        {riskRules.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-destructive" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Limites de Risco</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riskRules.map((evaluation, i) => (
                <RuleCard key={evaluation.id} evaluation={evaluation} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Objective Rules */}
        {objectiveRules.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Objetivos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {objectiveRules.map((evaluation, i) => (
                <RuleCard key={evaluation.id} evaluation={evaluation} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Compliance / Other Rules */}
        {otherRules.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-info" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Compliance & Payout</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherRules.map((evaluation, i) => (
                <RuleCard key={evaluation.id} evaluation={evaluation} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-mono">
            FORTIFY v1.0 — Risk Control Engine
          </p>
          <p className="text-xs text-muted-foreground">
            Última atualização: {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
