import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TradingAccount } from '@/types/fortify';

export interface DeletedAccount {
  account: TradingAccount;
  deletedAt: string;
  reason?: string;
}

// Local soft-delete state (no DB delete for safety)
let deletedAccounts: DeletedAccount[] = [];
let deletedListeners: Set<() => void> = new Set();

function emitDeletedChange() {
  deletedListeners.forEach(l => l());
}

function subscribeDeleted(listener: () => void) {
  deletedListeners.add(listener);
  return () => deletedListeners.delete(listener);
}

function getDeletedSnapshot() {
  return deletedAccounts;
}

// Map Supabase snake_case to TradingAccount camelCase
function mapSupabaseToTradingAccount(row: any): TradingAccount {
  return {
    id: row.id || '',
    userId: row.user_id || '',
    nickname: row.nickname || '',
    broker: row.broker || '',
    baseCurrency: row.base_currency || 'USD',
    startBalance: typeof row.start_balance === 'number' ? row.start_balance : 0,
    currentBalance: typeof row.current_balance === 'number' ? row.current_balance : 0,
    currentEquity: typeof row.current_equity === 'number' ? row.current_equity : 0,
    highestEquityAllTime: typeof row.highest_equity === 'number' ? row.highest_equity : 0,
    status: row.status || 'active',
    ruleSetId: row.rule_set_id || '',
    createdAt: row.created_at || new Date().toISOString(),
    // MT5 fields
    mt5Server: row.mt5_server || undefined,
    mt5Login: row.mt5_login || undefined,
    mt5ConnectionStatus: row.mt5_connection_status || undefined,
    mt5LastSyncAt: row.mt5_last_sync_at || undefined,
    mt5SyncError: row.mt5_sync_error || undefined,
    // TODO: Map account_type and prop_firm fields if needed
  };
}

export function useAccountsStore() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [, forceUpdate] = useState(0);

  // Subscribe to deleted accounts changes
  const setupDeletedSubscription = useCallback(() => {
    const unsubscribe = subscribeDeleted(() => {
      forceUpdate(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Query trading accounts from Supabase
  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['trading_accounts', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', session?.user?.id!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(mapSupabaseToTradingAccount);
    },
    enabled: !!session?.user?.id,
  });

  // Filter out soft-deleted accounts
  const deletedIds = new Set(deletedAccounts.map(d => d.account.id));
  const activeAccounts = accounts.filter(a => !deletedIds.has(a.id));

  // Mutation to add account to Supabase
  const addAccountMutation = useMutation({
    mutationFn: async (account: Omit<TradingAccount, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('trading_accounts')
        .insert({
          user_id: account.userId,
          nickname: account.nickname,
          broker: account.broker,
          base_currency: account.baseCurrency,
          start_balance: account.startBalance,
          current_balance: account.currentBalance,
          current_equity: account.currentEquity,
          highest_equity: account.highestEquityAllTime,
          status: account.status,
          rule_set_id: account.ruleSetId,
          mt5_server: account.mt5Server,
          mt5_login: account.mt5Login,
          mt5_connection_status: account.mt5ConnectionStatus,
          mt5_last_sync_at: account.mt5LastSyncAt,
          mt5_sync_error: account.mt5SyncError,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading_accounts'] });
    },
  });

  const addAccount = useCallback((account: TradingAccount) => {
    addAccountMutation.mutate(account);
  }, [addAccountMutation]);

  const removeAccount = useCallback((id: string, reason?: string) => {
    const account = activeAccounts.find(a => a.id === id);
    if (account) {
      deletedAccounts = [...deletedAccounts, {
        account,
        deletedAt: new Date().toISOString(),
        reason,
      }];
      emitDeletedChange();
    }
  }, [activeAccounts]);

  const restoreAccount = useCallback((id: string) => {
    const entry = deletedAccounts.find(d => d.account.id === id);
    if (entry) {
      deletedAccounts = deletedAccounts.filter(d => d.account.id !== id);
      emitDeletedChange();
    }
  }, []);

  const permanentlyDelete = useCallback((id: string) => {
    deletedAccounts = deletedAccounts.filter(d => d.account.id !== id);
    emitDeletedChange();
  }, []);

  // Initialize subscription on mount
  useState(() => {
    return setupDeletedSubscription();
  });

  return {
    accounts: activeAccounts,
    deletedAccounts: getDeletedSnapshot(),
    addAccount,
    removeAccount,
    restoreAccount,
    permanentlyDelete,
    isLoading,
    error,
  };
}
