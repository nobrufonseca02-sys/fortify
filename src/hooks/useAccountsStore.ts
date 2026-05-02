import { useCallback, useSyncExternalStore } from 'react';
import { MOCK_ACCOUNTS } from '@/data/mockData';
import { TradingAccount } from '@/types/fortify';

export interface DeletedAccount {
  account: TradingAccount;
  deletedAt: string;
  reason?: string;
}

// Shared module-level store
let accounts: TradingAccount[] = [...MOCK_ACCOUNTS];
let deletedAccounts: DeletedAccount[] = [];
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

function getDeletedSnapshot() {
  return deletedAccounts;
}

export function addAccountToStore(account: TradingAccount) {
  accounts = [...accounts, account];
  emitChange();
}

export function removeAccountFromStore(id: string, reason?: string) {
  const account = accounts.find(a => a.id === id);
  if (account) {
    deletedAccounts = [...deletedAccounts, {
      account,
      deletedAt: new Date().toISOString(),
      reason,
    }];
  }
  accounts = accounts.filter(a => a.id !== id);
  emitChange();
}

export function restoreAccountToStore(id: string) {
  const entry = deletedAccounts.find(d => d.account.id === id);
  if (entry) {
    accounts = [...accounts, entry.account];
    deletedAccounts = deletedAccounts.filter(d => d.account.id !== id);
    emitChange();
  }
}

export function permanentlyDeleteAccount(id: string) {
  deletedAccounts = deletedAccounts.filter(d => d.account.id !== id);
  emitChange();
}

export function useAccountsStore() {
  const accs = useSyncExternalStore(subscribe, getSnapshot);
  const deleted = useSyncExternalStore(subscribe, getDeletedSnapshot);

  const addAccount = useCallback((account: TradingAccount) => {
    addAccountToStore(account);
  }, []);

  const removeAccount = useCallback((id: string, reason?: string) => {
    removeAccountFromStore(id, reason);
  }, []);

  const restoreAccount = useCallback((id: string) => {
    restoreAccountToStore(id);
  }, []);

  const permanentlyDelete = useCallback((id: string) => {
    permanentlyDeleteAccount(id);
  }, []);

  return { accounts: accs, deletedAccounts: deleted, addAccount, removeAccount, restoreAccount, permanentlyDelete };
}
