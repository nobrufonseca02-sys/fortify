import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MT5Connection {
  id: string;
  user_id: string;
  account_name: string;
  mt5_login: string;
  mt5_server: string;
  broker_name: string;
  account_type: string;
  prop_firm: string | null;
  connection_status: 'disconnected' | 'connecting' | 'connected' | 'auth_error' | 'syncing';
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export function useMT5Connections() {
  return useQuery({
    queryKey: ['mt5-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_connections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MT5Connection[];
    },
  });
}

export function useCreateMT5Connection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      account_name: string;
      mt5_login: string;
      mt5_server: string;
      broker_name: string;
      account_type: string;
      prop_firm?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('mt5_connections')
        .insert({
          ...input,
          user_id: user.id,
          prop_firm: input.prop_firm || null,
          connection_status: 'disconnected' as const,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MT5Connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt5-connections'] });
      toast({
        title: 'Conta MT5 adicionada',
        description: 'A conta foi registrada e está aguardando conexão do backend externo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar conta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMT5Connection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt5_connections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt5-connections'] });
      toast({ title: 'Conta MT5 removida' });
    },
  });
}

export function useMT5Trades(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['mt5-trades', connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_trades')
        .select('*')
        .eq('connection_id', connectionId!)
        .order('close_time', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMT5Positions(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['mt5-positions', connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_positions')
        .select('*')
        .eq('connection_id', connectionId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMT5Snapshots(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['mt5-snapshots', connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt5_account_snapshots')
        .select('*')
        .eq('connection_id', connectionId!)
        .order('date', { ascending: false })
        .limit(90);
      if (error) throw error;
      return data ?? [];
    },
  });
}
