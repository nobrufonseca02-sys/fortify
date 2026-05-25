import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface RuleEvaluationRow {
  id: string;
  trading_account_id: string;
  rule_instance_id: string;
  connection_id: string | null;
  status: 'APPROVING' | 'WARNING' | 'VIOLATED' | 'NOT_MET';
  current_value: number | null;
  limit_value: number | null;
  progress_pct: number | null;
  message: string | null;
  computation_window: 'daily' | 'total' | 'phase' | 'payoutWindow';
  reference_date: string | null;
  computed_at: string;
  rule_instances: any;
}

export interface RuleStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export function getRuleStatusConfig(status: string): RuleStatusConfig {
  const configs: Record<string, RuleStatusConfig> = {
    APPROVING: {
      label: 'Aprovando',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: '✓',
    },
    WARNING: {
      label: 'Atenção',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      icon: '⚠',
    },
    VIOLATED: {
      label: 'Violado',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '✕',
    },
    NOT_MET: {
      label: 'Não atendido',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      icon: '○',
    },
  };

  return configs[status] || configs.NOT_MET;
}

export function useRuleEvaluations(tradingAccountId: string | undefined) {
  return useQuery({
    queryKey: ['rule_evaluations', tradingAccountId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('rule_evaluations' as any)
        .select(`
          *,
          rule_instances (
            *,
            rule_definitions (*)
          )
        `)
        .eq('trading_account_id', tradingAccountId!)
        .order('computed_at', { ascending: false }) as any);

      if (error) throw error;

      // Deduplicate: keep only the most recent entry per (rule_instance_id + reference_date)
      const deduplicated = new Map<string, RuleEvaluationRow>();
      (data as RuleEvaluationRow[]).forEach((row) => {
        const key = `${row.rule_instance_id}-${row.reference_date || 'null'}`;
        if (!deduplicated.has(key)) {
          deduplicated.set(key, row);
        }
      });

      return Array.from(deduplicated.values());
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!tradingAccountId,
  });
}

export interface AccountRulesSummary {
  total: number;
  violated: number;
  warning: number;
  approving: number;
  notMet: number;
  hasHardViolation: boolean;
  lastComputedAt: string | null;
}

export function useAccountRulesSummary(tradingAccountId: string | undefined) {
  const { data: evaluations, isLoading } = useRuleEvaluations(tradingAccountId);

  const summary: AccountRulesSummary = {
    total: 0,
    violated: 0,
    warning: 0,
    approving: 0,
    notMet: 0,
    hasHardViolation: false,
    lastComputedAt: null,
  };

  if (evaluations && evaluations.length > 0) {
    summary.total = evaluations.length;
    summary.lastComputedAt = evaluations[0]?.computed_at || null;

    evaluations.forEach((evaluation) => {
      switch (evaluation.status) {
        case 'VIOLATED':
          summary.violated++;
          // Check if it's a hard violation (severity from rule_instances)
          if (evaluation.rule_instances?.severity === 'hard') {
            summary.hasHardViolation = true;
          }
          break;
        case 'WARNING':
          summary.warning++;
          break;
        case 'APPROVING':
          summary.approving++;
          break;
        case 'NOT_MET':
          summary.notMet++;
          break;
      }
    });
  }

  return { summary, isLoading };
}

export function useSyncAndEvaluate() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-and-evaluate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ connectionId }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Sync failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['rule_evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['mt5_account_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['mt5_trades'] });
      queryClient.invalidateQueries({ queryKey: ['mt5_positions'] });
      queryClient.invalidateQueries({ queryKey: ['trading_accounts'] });
    },
  });
}
