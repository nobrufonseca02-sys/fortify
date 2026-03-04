import { useState } from 'react';
import { MOCK_ACCOUNTS, MOCK_EVALUATIONS } from '@/data/mockData';
import { AccountSelector } from '@/components/AccountSelector';
import { RuleCard } from '@/components/RuleCard';
import { TradingAccount } from '@/types/fortify';

const AccountRules = () => {
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(MOCK_ACCOUNTS[0]);
  const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === selectedAccount.id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground mb-1">Regras da Conta</h1>
        <p className="text-xs text-muted-foreground">Todas as regras aplicadas à conta selecionada.</p>
      </div>

      <AccountSelector accounts={MOCK_ACCOUNTS} selected={selectedAccount} onSelect={setSelectedAccount} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {evals.map((evaluation, i) => (
          <RuleCard key={evaluation.id} evaluation={evaluation} index={i} />
        ))}
      </div>
    </div>
  );
};

export default AccountRules;
