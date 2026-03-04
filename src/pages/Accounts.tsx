import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RULE_SET_TEMPLATES, TEMPLATE_RULES } from '@/data/mockData';
import { MOCK_ACCOUNTS } from '@/data/mockData';
import { TradingAccount, RuleSet, Rule, RULE_TYPE_LABELS } from '@/types/fortify';
import { Plus, Trash2, Wallet, ChevronRight } from 'lucide-react';

// Local state store (will be replaced by DB later)
let accountsStore = [...MOCK_ACCOUNTS];

export function useAccountsStore() {
  const [accounts, setAccounts] = useState<TradingAccount[]>(accountsStore);

  const addAccount = (account: TradingAccount) => {
    accountsStore = [...accountsStore, account];
    setAccounts([...accountsStore]);
  };

  const removeAccount = (id: string) => {
    accountsStore = accountsStore.filter(a => a.id !== id);
    setAccounts([...accountsStore]);
  };

  return { accounts, addAccount, removeAccount };
}

const Accounts = () => {
  const navigate = useNavigate();
  const { accounts, addAccount, removeAccount } = useAccountsStore();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [nickname, setNickname] = useState('');
  const [broker, setBroker] = useState('');
  const [origin, setOrigin] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [startBalance, setStartBalance] = useState('');
  const [selectedRuleSetId, setSelectedRuleSetId] = useState(RULE_SET_TEMPLATES[0].id);

  const selectedRuleSet = RULE_SET_TEMPLATES.find(t => t.id === selectedRuleSetId);
  const selectedRules = TEMPLATE_RULES.filter(r => r.ruleSetId === selectedRuleSetId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(startBalance);
    if (!nickname || !broker || !startBalance || isNaN(balance)) return;

    const newAccount: TradingAccount = {
      id: `acc-${Date.now()}`,
      userId: 'u1',
      nickname,
      broker: `${broker}${origin ? ` - ${origin}` : ''}`,
      baseCurrency,
      startBalance: balance,
      currentBalance: balance,
      currentEquity: balance,
      highestEquityAllTime: balance,
      status: 'active',
      ruleSetId: selectedRuleSetId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    addAccount(newAccount);
    setShowForm(false);
    setNickname('');
    setBroker('');
    setOrigin('');
    setStartBalance('');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Minhas Contas</h1>
          <p className="text-xs text-muted-foreground">Cadastre e gerencie suas contas de trading.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Cadastrar Nova Conta</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome da Conta</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Ex.: FTMO 100k Challenge"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Corretora / Plataforma</label>
              <input
                type="text"
                value={broker}
                onChange={e => setBroker(e.target.value)}
                placeholder="Ex.: MT5, cTrader, NinjaTrader"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Origem / Mesa Proprietária</label>
              <input
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="Ex.: FTMO, Topstep, Hantec, Outra"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Moeda Base</label>
              <select
                value={baseCurrency}
                onChange={e => setBaseCurrency(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="BRL">BRL</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Saldo Inicial</label>
              <input
                type="number"
                value={startBalance}
                onChange={e => setStartBalance(e.target.value)}
                placeholder="Ex.: 100000"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Conjunto de Regras</label>
              <select
                value={selectedRuleSetId}
                onChange={e => setSelectedRuleSetId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {RULE_SET_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.firmName ? `(${t.firmName})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview selected rules */}
          {selectedRules.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Regras que serão aplicadas:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedRules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${rule.severity === 'hard' ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'}`}>
                      {rule.severity}
                    </span>
                    <span className="text-xs text-foreground">{rule.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Cadastrar Conta
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Account list */}
      <div className="space-y-3">
        {accounts.map(account => {
          const pnl = account.currentBalance - account.startBalance;
          const pnlPct = ((pnl / account.startBalance) * 100).toFixed(2);
          const isPositive = pnl >= 0;
          const ruleSet = RULE_SET_TEMPLATES.find(t => t.id === account.ruleSetId);
          const ruleCount = TEMPLATE_RULES.filter(r => r.ruleSetId === account.ruleSetId).length;

          return (
            <div
              key={account.id}
              className="rounded-xl border border-border bg-card p-5 flex items-center gap-4 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{account.nickname}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{account.broker}</span>
                  <span>•</span>
                  <span>{ruleSet?.name || 'Personalizado'}</span>
                  <span>•</span>
                  <span>{ruleCount} regras</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-mono font-bold text-foreground text-sm">
                  ${account.currentBalance.toLocaleString('pt-BR')}
                </p>
                <p className={`text-xs font-mono font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {isPositive ? '+' : ''}{pnlPct}%
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          );
        })}

        {accounts.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Conta" para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Accounts;
