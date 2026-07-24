import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';
import { gatewayJsonHeaders } from '@/lib/gateway';

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
        .eq('user_id', session!.user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).filter((connection: any) => connection.sync_status !== 'removed') as MT5Connection[];
    },
    enabled: !!session?.user?.id,
  });
}

export function useMT5ConnectionDetail(connectionId: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['mt5_connection', session?.user?.id, connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_connections')
        .select('*')
        .eq('id', connectionId!)
        .eq('user_id', session!.user!.id)
        .single();
      if (error) throw error;
      return data as MT5Connection;
    },
    enabled: !!connectionId && !!session?.user?.id,
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
        .order('created_at', { ascending: false })
        .limit(200);
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
    queryKey: ['mt5_account_snapshots', connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_account_snapshots')
        .select('*')
        .eq('connection_id', connectionId!)
        .order('date', { ascending: true })
        .limit(365);
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
      accountName: string;
      mt5Login: string;
      mt5Server: string;
      brokerName: string;
      userId: string;
      mt5Password: string;
      tradingAccountId?: string | null;
    }) => {
      if (!session?.access_token) {
        throw new Error('User session is required before connecting MT5 account');
      }
      const gatewayUrl = import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/metaapi/connect`, {
        method: 'POST',
        headers: gatewayJsonHeaders(session.access_token),
        body: JSON.stringify({
          accountName: input.accountName,
          mt5Login: input.mt5Login,
          mt5Server: input.mt5Server,
          brokerName: input.brokerName,
          mt5Password: input.mt5Password,
          tradingAccountId: input.tradingAccountId ?? null,
          userId: input.userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to connect MT5 account');
      return data?.connection as MT5Connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt5_connections'] });
    },
  });
}

export function useDeleteMT5Connection() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!session?.user?.id) throw new Error('User session is required before removing MT5 connection');
      const { error } = await supabase
        .from('mt5_connections')
        .update({ connection_status: 'disconnected', sync_status: 'removed', sync_error: null })
        .eq('id', id)
        .eq('user_id', session!.user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt5_connections'] });
    },
  });
}
