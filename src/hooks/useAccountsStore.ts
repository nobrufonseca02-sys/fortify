import { useState, useCallback, useSyncExternalStore } from 'react';
import { MOCK_ACCOUNTS } from '@/data/mockData';
import { TradingAccount } from '@/types/fortify';

// Shared module-level store
let accounts: TradingAccount[] = [...MOCK_ACCOUNTS];
let listeners: Set<() => void> = new Set();

function emitChange() {
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return accounts;
}

export function addAccountToStore(account: TradingAccount) {
  accounts = [...accounts, account];
  emitChange();
}

export function removeAccountFromStore(id: string) {
  accounts = accounts.filter(a => a.id !== id);
  emitChange();
}

export function useAccountsStore() {
  const accs = useSyncExternalStore(subscribe, getSnapshot);

  const addAccount = useCallback((account: TradingAccount) => {
    addAccountToStore(account);
  }, []);

  const removeAccount = useCallback((id: string) => {
    removeAccountFromStore(id);
  }, []);

  return { accounts: accs, addAccount, removeAccount };
}
