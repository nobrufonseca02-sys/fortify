import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { gatewayJsonHeaders } from '@/lib/gateway';

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
  remaining_value?: number | null;
  explanation?: string | null;
  recommended_action?: string | null;
  severity?: string | null;
  next_best_action?: string | null;
  data_status?: string | null;
  computation_window: 'daily' | 'total' | 'phase' | 'payoutWindow';
  reference_date: string | null;
  computed_at: string;
  rule_instances: any;
}

export async function hydrateRuleEvaluationRows(rows: RuleEvaluationRow[]): Promise<RuleEvaluationRow[]> {
  const ruleInstanceIds = Array.from(new Set(rows.map((row) => row.rule_instance_id).filter(Boolean)));
  if (ruleInstanceIds.length === 0) return rows;

  const { data: instances, error: instanceError } = await (supabase
    .from('rule_instances' as any)
    .select('*')
    .in('id', ruleInstanceIds) as any);

  if (instanceError) throw instanceError;

  const definitionIds: string[] = Array.from(
    new Set(
      (instances || [])
        .map((instance: any) => instance.rule_definition_id as string | undefined)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const { data: definitions, error: definitionError } = definitionIds.length > 0
    ? await (supabase
      .from('rule_definitions')
      .select('*')
      .in('id', definitionIds) as any)
    : { data: [], error: null };

  if (definitionError) throw definitionError;

  const definitionsById = new Map((definitions || []).map((definition: any) => [definition.id, definition]));
  const instancesById = new Map((instances || []).map((instance: any) => [
    instance.id,
    {
      ...instance,
      rule_definitions: definitionsById.get(instance.rule_definition_id) || null,
    },
  ]));

  return rows.map((row) => ({
    ...row,
    rule_instances: instancesById.get(row.rule_instance_id) || null,
  }));
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
        .select('*')
        .eq('trading_account_id', tradingAccountId!)
        .order('computed_at', { ascending: false }) as any);

      if (error) throw error;
      const rows = await hydrateRuleEvaluationRows(data as RuleEvaluationRow[]);

      // Deduplicate: keep only the most recent entry per (rule_instance_id + reference_date)
      const deduplicated = new Map<string, RuleEvaluationRow>();
      rows.forEach((row) => {
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

export function useAllRuleEvaluations() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['rule_evaluations', session?.user?.id, 'all'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('rule_evaluations' as any)
        .select('*')
        .order('computed_at', { ascending: false }) as any);

      if (error) throw error;
      const rows = await hydrateRuleEvaluationRows(data as RuleEvaluationRow[]);

      const deduplicated = new Map<string, RuleEvaluationRow>();
      rows.forEach((row) => {
        const key = `${row.trading_account_id}-${row.rule_instance_id}-${row.reference_date || 'null'}`;
        if (!deduplicated.has(key)) {
          deduplicated.set(key, row);
        }
      });

      return Array.from(deduplicated.values());
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!session?.user?.id,
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
      const userId = session?.user?.id;
      if (!userId) throw new Error('User session is required');

      const gatewayUrl = import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';
      const response = await fetch(`${gatewayUrl}/metaapi/sync`, {
        method: 'POST',
        headers: gatewayJsonHeaders(session.access_token),
        body: JSON.stringify({ connectionId, userId }),
      });

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
      queryClient.invalidateQueries({ queryKey: ['account_daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['trading_accounts'] });
    },
  });
}
