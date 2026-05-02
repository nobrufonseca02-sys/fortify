import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PropFirm {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  category: string;
  status: string;
  color: string | null;
}

export interface Program {
  id: string;
  prop_firm_id: string;
  name: string;
  account_type: string;
  market_type: string;
  notes: string | null;
}

export interface RuleSetVersion {
  id: string;
  program_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  source_url: string | null;
  status: string;
}

export interface RuleDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
}

export interface RuleInstance {
  id: string;
  rule_set_version_id: string;
  rule_definition_id: string;
  mode: string;
  base_calculation: string | null;
  includes_floating: boolean;
  daily_reset: boolean;
  limit_value: number;
  severity: string;
  enabled: boolean;
  params: Record<string, unknown>;
  rule_definition?: RuleDefinition;
}

export function usePropFirms() {
  return useQuery({
    queryKey: ['prop-firms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prop_firms')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as PropFirm[];
    },
  });
}

export function usePrograms(propFirmId: string | null) {
  return useQuery({
    queryKey: ['programs', propFirmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('prop_firm_id', propFirmId!)
        .order('name');
      if (error) throw error;
      return data as Program[];
    },
    enabled: !!propFirmId,
  });
}

export function useRuleSetVersions(programId: string | null) {
  return useQuery({
    queryKey: ['rule-set-versions', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_set_versions')
        .select('*')
        .eq('program_id', programId!)
        .eq('status', 'active')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as RuleSetVersion[];
    },
    enabled: !!programId,
  });
}

export function useRuleInstances(ruleSetVersionId: string | null) {
  return useQuery({
    queryKey: ['rule-instances', ruleSetVersionId],
    queryFn: async () => {
      const { data: instances, error: instError } = await supabase
        .from('rule_instances')
        .select('*')
        .eq('rule_set_version_id', ruleSetVersionId!)
        .order('severity', { ascending: true });
      if (instError) throw instError;

      // Fetch rule definitions for these instances
      const defIds = [...new Set((instances as RuleInstance[]).map(i => i.rule_definition_id))];
      const { data: defs, error: defError } = await supabase
        .from('rule_definitions')
        .select('*')
        .in('id', defIds);
      if (defError) throw defError;

      const defMap = new Map((defs as RuleDefinition[]).map(d => [d.id, d]));
      return (instances as RuleInstance[]).map(inst => ({
        ...inst,
        rule_definition: defMap.get(inst.rule_definition_id),
      }));
    },
    enabled: !!ruleSetVersionId,
  });
}

export function useProgramRules(programId: string | null) {
  return useQuery({
    queryKey: ['program-rules', programId],
    queryFn: async () => {
      // 1. Find the active version for this program
      const { data: versions, error: verError } = await supabase
        .from('rule_set_versions')
        .select('*')
        .eq('program_id', programId!)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1);
      if (verError) throw verError;
      if (!versions || versions.length === 0) return { version: null, rules: [] };

      const version = versions[0] as RuleSetVersion;

      // 2. Fetch rule instances for this version
      const { data: instances, error: instError } = await supabase
        .from('rule_instances')
        .select('*')
        .eq('rule_set_version_id', version.id)
        .order('severity', { ascending: true });
      if (instError) throw instError;

      // 3. Fetch rule definitions
      const defIds = [...new Set((instances as RuleInstance[]).map(i => i.rule_definition_id))];
      if (defIds.length === 0) return { version, rules: [] };

      const { data: defs, error: defError } = await supabase
        .from('rule_definitions')
        .select('*')
        .in('id', defIds);
      if (defError) throw defError;

      const defMap = new Map((defs as RuleDefinition[]).map(d => [d.id, d]));
      const rules = (instances as RuleInstance[]).map(inst => ({
        ...inst,
        rule_definition: defMap.get(inst.rule_definition_id),
      }));

      return { version, rules };
    },
    enabled: !!programId,
  });
}

export function useRuleDefinitions() {
  return useQuery({
    queryKey: ['rule-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_definitions')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return data as RuleDefinition[];
    },
  });
}
