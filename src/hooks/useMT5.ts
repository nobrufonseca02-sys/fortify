import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type MT5Connection = Tables<'mt5_connections'>;
export type MT5Trade = Tables<'mt5_trades'>;
export type MT5Position = Tables<'mt5_positions'>;
export type MT5Snapshot = Tables<'mt5_account_snapshots'>;

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

export function useMT5Trades(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['mt5_trades', connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_trades')
        .select('*')
        .eq('connection_id', connectionId!)
        .order('open_time', { ascending: false });
      if (error) throw error;
      return data as MT5Trade[];
    },
    enabled: !!connectionId,
  });
}

export function useMT5Positions(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['mt5_positions', connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_positions')
        .select('*')
        .eq('connection_id', connectionId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as MT5Position[];
    },
    enabled: !!connectionId,
  });
}

export function useMT5Snapshots(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['mt5_snapshots', connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_account_snapshots')
        .select('*')
        .eq('connection_id', connectionId!)
        .order('date', { ascending: true });
      if (error) throw error;
      return data as MT5Snapshot[];
    },
    enabled: !!connectionId,
  });
}

export function useCreateMT5Connection() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      account_name: string;
      mt5_login: string;
      mt5_server: string;
      broker_name: string;
      account_type: string;
      prop_firm?: string;
    }) => {
      if (!session?.user?.id) throw new Error('Usuário não autenticado');
      const row: TablesInsert<'mt5_connections'> = {
        ...input,
        user_id: session.user.id,
        prop_firm: input.prop_firm || null,
      };
      const { data, error } = await supabase
        .from('mt5_connections')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt5_connections'] });
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
