import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { sendCoachMessage } from '@/lib/coach';

export interface CoachMessageRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function useCoachMessages(tradingAccountId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coach_messages', tradingAccountId, user?.id],
    queryFn: async (): Promise<CoachMessageRow[]> => {
      const { data: conversation, error: conversationError } = await (supabase
        .from('coach_conversations' as any)
        .select('id')
        .eq('trading_account_id', tradingAccountId!)
        .maybeSingle() as any);

      if (conversationError) throw conversationError;
      if (!conversation) return [];

      const { data, error } = await (supabase
        .from('coach_messages' as any)
        .select('id, role, content, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true }) as any);

      if (error) throw error;
      return (data ?? []) as CoachMessageRow[];
    },
    enabled: !!tradingAccountId && !!user?.id,
  });
}

export function useSendCoachMessage(tradingAccountId: string | undefined) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      if (!tradingAccountId) throw new Error('Conta de trading é obrigatória.');
      if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente para continuar a conversa.');

      return sendCoachMessage({
        accessToken: session.access_token,
        tradingAccountId,
        message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach_messages', tradingAccountId] });
    },
  });
}
