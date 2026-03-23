import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type MT5Connection = Tables<'mt5_connections'>;
export type MT5Trade = Tables<'trades'>;
export type MT5Position = Tables<'open_positions'>;
export type MT5Snapshot = Tables<'account_snapshots'>;

export function useMT5Connections() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['mt5_connections', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_connections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MT5Connection[];
    },
    enabled: !!session?.user?.id,
  });
}

export function useMT5ConnectionDetail(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['mt5_connection', connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_connections')
        .select('*')
        .eq('id', connectionId!)
        .single();
      if (error) throw error;
      return data as MT5Connection;
    },
    enabled: !!connectionId,
  });
}

export function useMT5Trades(tradingAccountId: string | undefined) {
  return useQuery({
    queryKey: ['trades', tradingAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('trading_account_id', tradingAccountId!)
        .order('close_time', { ascending: false, nullsFirst: false })
        .order('open_time', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as MT5Trade[];
    },
    enabled: !!tradingAccountId,
  });
}

export function useMT5Positions(tradingAccountId: string | undefined) {
  return useQuery({
    queryKey: ['open_positions', tradingAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('open_positions')
        .select('*')
        .eq('trading_account_id', tradingAccountId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as MT5Position[];
    },
    enabled: !!tradingAccountId,
  });
}

export function useMT5Snapshots(tradingAccountId: string | undefined) {
  return useQuery({
    queryKey: ['account_snapshots', tradingAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_snapshots')
        .select('*')
        .eq('trading_account_id', tradingAccountId!)
        .order('date', { ascending: true })
        .limit(365);
      if (error) throw error;
      return data as MT5Snapshot[];
    },
    enabled: !!tradingAccountId,
  });
}

export function useCreateMT5Connection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      tradingAccountId: string;
      mt5Login: string;
      mt5Server: string;
      brokerName: string;
      provider: string;
    }) => {
      const row: TablesInsert<'mt5_connections'> = {
        trading_account_id: input.tradingAccountId,
        mt5_login: input.mt5Login,
        mt5_server: input.mt5Server,
        broker_name: input.brokerName,
        provider: input.provider,
      } as any;

      const { data, error } = await supabase
        .from('mt5_connections')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mt5_connections'] });
      queryClient.invalidateQueries({ queryKey: ['mt5_connection'] });
      queryClient.invalidateQueries({ queryKey: ['trades', vars.tradingAccountId] });
      queryClient.invalidateQueries({ queryKey: ['open_positions', vars.tradingAccountId] });
      queryClient.invalidateQueries({ queryKey: ['account_snapshots', vars.tradingAccountId] });
    },
  });
}

export function useDeleteMT5Connection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mt5_connections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt5_connections'] });
    },
  });
}
