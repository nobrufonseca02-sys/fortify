import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AccountRow {
  id: string;
  user_id: string;
  nickname: string;
  prop_firm: string | null;
  program: string | null;
  phase: string | null;
  broker: string | null;
  account_type: string | null;
  base_currency: string;
  start_balance: number;
  current_balance: number;
  current_equity: number;
  highest_equity: number;
  status: string;
  daily_loss_limit: number;
  total_loss_limit: number;
  profit_target: number;
  min_trading_days: number;
  daily_loss_used: number;
  total_loss_used: number;
  trading_days_count: number;
  last_trading_date: string | null;
  daily_loss_reset_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewAccountInput {
  nickname: string;
  prop_firm: string;
  program: string;
  phase: string;
  base_currency: string;
  start_balance: number;
  current_equity: number;
  daily_loss_limit: number;
  total_loss_limit: number;
  profit_target: number;
  min_trading_days: number;
}

export function useAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trading_accounts', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AccountRow[]> => {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AccountRow[];
    },
  });
}

export function useAccount(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trading_accounts', user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async (): Promise<AccountRow | null> => {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as AccountRow | null) ?? null;
    },
  });
}

export function useCreateAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewAccountInput) => {
      if (!user?.id) throw new Error('Não autenticado');
      const payload = {
        user_id: user.id,
        nickname: input.nickname,
        prop_firm: input.prop_firm,
        program: input.program,
        phase: input.phase,
        base_currency: input.base_currency,
        start_balance: input.start_balance,
        current_balance: input.current_equity,
        current_equity: input.current_equity,
        highest_equity: Math.max(input.start_balance, input.current_equity),
        daily_loss_limit: input.daily_loss_limit,
        total_loss_limit: input.total_loss_limit,
        profit_target: input.profit_target,
        min_trading_days: input.min_trading_days,
        status: 'active',
      };
      const { data, error } = await supabase
        .from('trading_accounts')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as AccountRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading_accounts'] });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AccountRow> }) => {
      const { data, error } = await supabase
        .from('trading_accounts')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as AccountRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading_accounts'] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trading_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading_accounts'] });
    },
  });
}

// Derived helpers
export function computeAccountMetrics(a: AccountRow) {
  const dailyRemaining = Math.max(0, a.daily_loss_limit - a.daily_loss_used);
  const totalRemaining = Math.max(0, a.total_loss_limit - a.total_loss_used);
  const profit = a.current_equity - a.start_balance;
  const profitPct = a.profit_target > 0 ? Math.min(100, Math.max(0, (profit / a.profit_target) * 100)) : 0;
  const dailyPct = a.daily_loss_limit > 0 ? Math.min(100, (a.daily_loss_used / a.daily_loss_limit) * 100) : 0;
  const totalPct = a.total_loss_limit > 0 ? Math.min(100, (a.total_loss_used / a.total_loss_limit) * 100) : 0;
  const daysPct = a.min_trading_days > 0 ? Math.min(100, (a.trading_days_count / a.min_trading_days) * 100) : 0;

  let status: 'SAFE' | 'WARNING' | 'DANGER' = 'SAFE';
  const worst = Math.max(dailyPct, totalPct);
  if (worst >= 80) status = 'DANGER';
  else if (worst >= 50) status = 'WARNING';

  return { dailyRemaining, totalRemaining, profit, profitPct, dailyPct, totalPct, daysPct, status };
}
