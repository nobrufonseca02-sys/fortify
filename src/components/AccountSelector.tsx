import { TradingAccount } from '@/types/fortify';
import { ChevronDown, Plus, Wallet } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccountSelectorProps {
  accounts: TradingAccount[];
  selected: TradingAccount;
  onSelect: (account: TradingAccount) => void;
}

export function AccountSelector({ accounts, selected, onSelect }: AccountSelectorProps) {
  const [open, setOpen] = useState(false);

  const pnl = selected.currentBalance - selected.startBalance;
  const pnlPct = ((pnl / selected.startBalance) * 100).toFixed(2);
  const isPositive = pnl >= 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <h3 className="font-semibold text-foreground truncate">{selected.nickname}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{selected.broker}</span>
            <span>•</span>
            <span className="font-mono">{selected.baseCurrency}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono font-bold text-foreground text-sm">
            ${selected.currentBalance.toLocaleString()}
          </p>
          <p className={`text-xs font-mono font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{pnlPct}%
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          >
            {accounts.map((account) => {
              const accPnl = account.currentBalance - account.startBalance;
              const accPnlPct = ((accPnl / account.startBalance) * 100).toFixed(2);
              const accPositive = accPnl >= 0;
              const isActive = account.id === selected.id;

              return (
                <button
                  key={account.id}
                  onClick={() => { onSelect(account); setOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors ${isActive ? 'bg-accent' : ''}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{account.nickname}</p>
                    <p className="text-xs text-muted-foreground">{account.broker}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-foreground">${account.currentBalance.toLocaleString()}</p>
                    <p className={`text-xs font-mono ${accPositive ? 'text-success' : 'text-destructive'}`}>
                      {accPositive ? '+' : ''}{accPnlPct}%
                    </p>
                  </div>
                </button>
              );
            })}
            <button className="w-full flex items-center gap-2 p-3 text-sm text-primary hover:bg-accent transition-colors border-t border-border">
              <Plus className="w-4 h-4" />
              Nova Conta
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
