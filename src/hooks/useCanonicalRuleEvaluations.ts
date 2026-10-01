import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CanonicalRuleEvaluationRow } from '@/lib/canonicalEvaluationView';

// Uma linha por conta (a view já faz o distinct on); o limite só protege contra
// um usuário com muitas contas históricas.
const CANONICAL_QUERY_LIMIT = 200;

/**
 * Última avaliação canônica de cada conta do usuário, gravada pelo gateway a
 * partir do snapshot ativo em account_rule_bindings. RLS restringe ao dono.
 */
export function useLatestCanonicalEvaluations() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['account_rule_evaluations', session?.user?.id, 'latest'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('latest_account_rule_evaluations' as any)
        .select('*')
        .limit(CANONICAL_QUERY_LIMIT) as any);
      if (error) throw error;
      const byAccount: Record<string, CanonicalRuleEvaluationRow> = {};
      for (const row of (data ?? []) as CanonicalRuleEvaluationRow[]) {
        byAccount[row.trading_account_id] = row;
      }
      return byAccount;
    },
    staleTime: 60 * 1000,
    enabled: !!session?.user?.id,
  });
}
