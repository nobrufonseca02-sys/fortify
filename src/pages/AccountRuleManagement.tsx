import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Pencil, Plus, Power, RefreshCw, Shield, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { hydrateRuleEvaluationRows, type RuleEvaluationRow } from '@/hooks/useRuleEvaluations';
import { BetaReadinessChecklist, BetaResponsibilityNotice } from '@/components/BetaReadinessChecklist';
import { buildBetaChecklist, getConnectionStatusMeta, getRulesStatusMeta, getSyncErrorMessage, getSyncStatusMeta } from '@/lib/betaReadiness';
import { gatewayJsonHeaders } from '@/lib/gateway';

type RuleStatus = 'APPROVING' | 'WARNING' | 'VIOLATED' | 'NOT_MET';

const fmtMoney = (value: number | null | undefined) =>
  `$${Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;

const maskLogin = (value: string | null | undefined) => {
  if (!value) return '--';
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const statusMeta: Record<RuleStatus, { label: string; className: string }> = {
  APPROVING: { label: 'Seguro', className: 'bg-success/15 text-success' },
  WARNING: { label: 'Atenção', className: 'bg-warning/15 text-warning' },
  VIOLATED: { label: 'Violado', className: 'bg-destructive/15 text-destructive' },
  NOT_MET: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
};

function categoryLabel(category: string | null | undefined) {
  const value = String(category ?? 'custom');
  if (['risk', 'drawdown'].includes(value)) return 'Limites de perda';
  if (['objective', 'target'].includes(value)) return 'Meta de lucro';
  if (value === 'consistency') return 'Consistência';
  if (value === 'risk_sizing') return 'Lote/risco';
  if (['activity', 'payout'].includes(value)) return 'Dias de trading/payout';
  if (value === 'restriction') return 'Restrições';
  return 'Regras customizadas';
}

function nextBestAction(rows: any[], account: any) {
  if (!account?.rule_set_id) return 'Configure regras antes de confiar nos insights da conta.';
  if (rows.some((row) => row.status === 'VIOLATED')) return 'Pare de operar e revise as regras violadas.';
  if (rows.some((row) => row.status === 'WARNING')) return 'Reduza o risco até as regras em atenção ganharem mais margem.';
  if (rows.some((row) => row.data_status === 'insufficient_data')) return 'Sincronize mais trades/histórico para concluir as checagens.';
  return 'Continue com risco controlado e sincronize após as sessões de trading.';
}

function ruleSetReviewLabel(ruleSet: any) {
  if (!ruleSet) return 'Nenhum conjunto de regras selecionado';
  if (ruleSet.review_status === 'needs_review') return 'Precisa de revisão manual';
  if (ruleSet.review_status === 'user_custom' || ruleSet.is_user_custom) return 'Regra personalizada';
  if (ruleSet.review_status === 'verified') return 'Oficial verificada';
  return ruleSet.review_status || 'Modelo sem revisão';
}

function healthLabel(value: string) {
  if (value === 'violated') return 'Violada';
  if (value === 'high risk') return 'Atenção';
  if (value === 'safe') return 'Segura';
  return 'Pendente';
}

function hasRuleKey(row: any, keys: string[]) {
  return keys.includes(String(row.rule_instances?.rule_definitions?.key ?? ''));
}

export default function AccountRuleManagement() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { user, session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [account, setAccount] = useState<any | null>(null);
  const [connection, setConnection] = useState<any | null>(null);
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [ruleSets, setRuleSets] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [customRules, setCustomRules] = useState<any[]>([]);
  const [selectedRuleSetId, setSelectedRuleSetId] = useState('');
  const [customDefinitionId, setCustomDefinitionId] = useState('');
  const [customLimit, setCustomLimit] = useState('');
  const [customMode, setCustomMode] = useState<'value' | 'percent'>('value');
  const [customSeverity, setCustomSeverity] = useState<'hard' | 'soft'>('soft');
  const [editingRuleId, setEditingRuleId] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editMode, setEditMode] = useState<'value' | 'percent'>('value');
  const [editSeverity, setEditSeverity] = useState<'hard' | 'soft'>('soft');
  const [editReviewStatus, setEditReviewStatus] = useState('user_custom');

  const loadData = async () => {
    if (!accountId || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [accountRes, connRes, ruleSetRes, defRes, evalRes, customRes] = await Promise.all([
      (supabase.from('trading_accounts').select('*').eq('id', accountId).eq('user_id', user.id).maybeSingle() as any),
      (supabase.from('mt5_connections').select('*').eq('trading_account_id', accountId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle() as any),
      (supabase
        .from('rule_set_versions')
        .select('*, programs (*, prop_firms (*))')
        .order('created_at', { ascending: false }) as any),
      (supabase.from('rule_definitions').select('*').order('category').order('name') as any),
      (supabase
        .from('rule_evaluations' as any)
        .select('*')
        .eq('trading_account_id', accountId)
        .order('computed_at', { ascending: false }) as any),
      (supabase
        .from('account_rule_overrides' as any)
        .select('*, rule_definitions (*)')
        .eq('trading_account_id', accountId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as any),
    ]);

    if (accountRes.error) toast({ title: 'Erro ao carregar conta', description: accountRes.error.message, variant: 'destructive' });
    if (connRes.error) toast({ title: 'Erro ao carregar conexão MT5', description: connRes.error.message, variant: 'destructive' });
    if (ruleSetRes.error) toast({ title: 'Erro ao carregar rule sets', description: ruleSetRes.error.message, variant: 'destructive' });
    if (defRes.error) toast({ title: 'Erro ao carregar definições', description: defRes.error.message, variant: 'destructive' });
    if (evalRes.error) toast({ title: 'Erro ao carregar avaliações', description: evalRes.error.message, variant: 'destructive' });
    if (customRes.error) toast({ title: 'Erro ao carregar regras customizadas', description: customRes.error.message, variant: 'destructive' });

    const loadedAccount = accountRes.data ?? null;
    const loadedConnection = connRes.data ?? null;
    setAccount(loadedAccount);
    setConnection(loadedConnection);
    setRuleSets(ruleSetRes.data ?? []);
    setDefinitions(defRes.data ?? []);
    setEvaluations(evalRes.error ? [] : await hydrateRuleEvaluationRows((evalRes.data ?? []) as RuleEvaluationRow[]));
    setCustomRules(customRes.data ?? []);
    setSelectedRuleSetId(loadedAccount?.rule_set_id ?? '');

    if (loadedConnection?.id) {
      const snapRes = await (supabase
        .from('mt5_account_snapshots')
        .select('*')
        .eq('connection_id', loadedConnection.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      if (!snapRes.error) setSnapshot(snapRes.data ?? null);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, user?.id]);

  const currentRuleSet = useMemo(() => ruleSets.find((ruleSet) => ruleSet.id === account?.rule_set_id), [account, ruleSets]);
  const suggestedRuleSets = useMemo(() => {
    const accountSize = Number(account?.account_size ?? account?.start_balance ?? account?.current_balance ?? 0);
    return ruleSets
      .filter((ruleSet) => {
        const firmSlug = String(ruleSet.programs?.prop_firms?.slug ?? '');
        const size = Number(ruleSet.account_size ?? 0);
        const sizeMatch = !size || !accountSize || Math.abs(size - accountSize) <= 1000;
        const brokerMatch =
          firmSlug === 'generic-mt5-broker' ||
          (String(account?.detected_broker ?? '').toLowerCase().includes('easy') && firmSlug === 'easymarkets-broker-only') ||
          (account?.detected_prop_firm && String(ruleSet.programs?.prop_firms?.name ?? '').toLowerCase().includes(String(account.detected_prop_firm).toLowerCase()));
        return sizeMatch && brokerMatch;
      })
      .slice(0, 4);
  }, [account, ruleSets]);
  const groupedEvaluations = useMemo(() => {
    return evaluations.reduce<Record<string, any[]>>((groups, row) => {
      const category = categoryLabel(row.rule_instances?.rule_definitions?.category);
      groups[category] = groups[category] || [];
      groups[category].push(row);
      return groups;
    }, {});
  }, [evaluations]);

  const plan = useMemo(() => {
    const daily = evaluations.find((row) => hasRuleKey(row, ['max_daily_loss', 'daily_loss_percent', 'daily_loss_fixed']));
    const total =
      evaluations.find((row) => hasRuleKey(row, ['max_total_loss', 'total_loss_percent', 'total_loss_fixed', 'static_drawdown'])) ||
      evaluations.find((row) => String(row.rule_instances?.rule_definitions?.key ?? '').includes('drawdown'));
    const target = evaluations.find((row) => hasRuleKey(row, ['profit_target', 'profit_target_percent', 'profit_target_fixed']));
    const dailyRemaining = Number(daily?.remaining_value ?? Math.max(0, Number(daily?.limit_value ?? 0) - Number(daily?.current_value ?? 0)));
    const totalRemaining = Number(total?.remaining_value ?? Math.max(0, Number(total?.limit_value ?? 0) - Number(total?.current_value ?? 0)));
    const profitNeeded = Number(target?.remaining_value ?? Math.max(0, Number(target?.limit_value ?? 0) - Number(target?.current_value ?? 0)));
    const safeRisk = Math.max(0, Math.min(dailyRemaining * 0.2 || 0, totalRemaining * 0.1 || Number.MAX_SAFE_INTEGER));

    return {
      dailyRemaining,
      totalRemaining,
      profitNeeded,
      safeRisk: Number.isFinite(safeRisk) ? safeRisk : 0,
      next: nextBestAction(evaluations, account),
    };
  }, [account, evaluations]);

  const saveRuleSet = async () => {
    if (!accountId || !user?.id) return;
    setSaving(true);
    const selected = ruleSets.find((ruleSet) => ruleSet.id === selectedRuleSetId);
    const { error } = await (supabase
      .from('trading_accounts')
      .update({
        rule_set_id: selectedRuleSetId || null,
        selected_program_id: selected?.program_id ?? null,
        selected_prop_firm_id: selected?.programs?.prop_firm_id ?? null,
        account_size: selected?.account_size ?? account?.account_size ?? account?.current_balance ?? null,
        phase: selected?.phase ?? account?.phase ?? null,
        rule_selection_status: selectedRuleSetId ? 'configured' : 'unconfigured',
      })
      .eq('id', accountId)
      .eq('user_id', user.id) as any);

    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar regras', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Regras configuradas', description: 'A conta foi vinculada ao rule set selecionado.' });
    if (connection?.id) {
      await runSync();
      return;
    }
    await loadData();
  };

  const startEditingRule = (rule: any) => {
    setEditingRuleId(rule.id);
    setEditLimit(String(rule.limit_value ?? ''));
    setEditMode(rule.mode === 'percent' ? 'percent' : 'value');
    setEditSeverity(rule.severity === 'hard' ? 'hard' : 'soft');
    setEditReviewStatus(rule.review_status || 'user_custom');
  };

  const saveCustomRule = async () => {
    if (!editingRuleId || !user?.id) return;
    const { error } = await (supabase
      .from('account_rule_overrides' as any)
      .update({
        limit_value: Number(editLimit),
        mode: editMode,
        severity: editSeverity,
        review_status: editReviewStatus,
      })
      .eq('id', editingRuleId)
      .eq('user_id', user.id) as any);

    if (error) {
      toast({ title: 'Erro ao editar regra', description: error.message, variant: 'destructive' });
      return;
    }

    setEditingRuleId('');
    toast({ title: 'Regra atualizada', description: 'Sincronize a conta para recalcular as avaliações.' });
    await loadData();
  };

  const toggleCustomRule = async (rule: any) => {
    if (!user?.id) return;
    const { error } = await (supabase
      .from('account_rule_overrides' as any)
      .update({ enabled: !rule.enabled })
      .eq('id', rule.id)
      .eq('user_id', user.id) as any);

    if (error) {
      toast({ title: 'Erro ao atualizar regra', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: rule.enabled ? 'Regra desativada' : 'Regra ativada', description: 'Sincronize a conta para recalcular as avaliações.' });
    await loadData();
  };

  const runSync = async () => {
    if (!connection?.id || !user?.id || !session?.access_token) return;
    setSyncing(true);
    const gatewayUrl = import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';
    const res = await fetch(`${gatewayUrl}/metaapi/sync`, {
      method: 'POST',
      headers: gatewayJsonHeaders(session.access_token),
      body: JSON.stringify({ connectionId: connection.id, userId: user.id }),
    });
    const body = await res.json().catch(() => ({}));
    setSyncing(false);
    if (!res.ok) {
      toast({ title: 'Erro no sync', description: getSyncErrorMessage(body), variant: 'destructive' });
      return;
    }
    toast({ title: 'Sync concluído', description: 'Avaliações e snapshots atualizados.' });
    await loadData();
  };

  const syncNow = async () => {
    await runSync();
  };

  const addCustomRule = async () => {
    if (!accountId || !user?.id || !customDefinitionId || !customLimit) return;
    const { error } = await (supabase.from('account_rule_overrides' as any).insert({
      user_id: user.id,
      trading_account_id: accountId,
      rule_definition_id: customDefinitionId,
      mode: customMode,
      limit_value: Number(customLimit),
      severity: customSeverity,
      enabled: true,
      review_status: 'user_custom',
      source_notes: 'Created by user for this account.',
    }) as any);

    if (error) {
      toast({ title: 'Erro ao criar regra customizada', description: error.message, variant: 'destructive' });
      return;
    }

    setCustomLimit('');
    toast({ title: 'Regra customizada adicionada', description: 'Sincronize a conta para avaliar a nova regra.' });
    await loadData();
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando regras da conta...</div>;
  }

  if (!account) {
    return <div className="p-6 text-sm text-muted-foreground">Conta não encontrada.</div>;
  }

  const health =
    evaluations.some((row) => row.status === 'VIOLATED')
      ? 'violated'
      : evaluations.some((row) => row.status === 'WARNING')
        ? 'high risk'
        : evaluations.length === 0
          ? 'attention'
          : 'safe';
  const isMissingRuleSet = !account.rule_set_id || account.rule_selection_status === 'unconfigured';
  const isAutoGeneric = account.rule_selection_status === 'auto_generic';
  const needsReview = currentRuleSet?.review_status === 'needs_review';
  const betaChecklist = buildBetaChecklist({
    account,
    connection,
    ruleSet: currentRuleSet,
    snapshot,
    evaluations,
    customRulesCount: customRules.length,
  });
  const connectionMeta = getConnectionStatusMeta(connection?.connection_status || account.mt5_connection_status);
  const syncMeta = getSyncStatusMeta(connection?.sync_status, connection?.last_sync_at || account.mt5_last_sync_at, connection?.sync_error || account.mt5_sync_error);
  const rulesMeta = getRulesStatusMeta({ account, ruleSet: currentRuleSet, customRulesCount: customRules.length });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button className="pill-btn" onClick={() => navigate(`/accounts/${accountId}`)}>
          <ArrowLeft className="w-4 h-4" />
          Conta
        </button>
        <button className="pill-btn pill-btn-primary" onClick={syncNow} disabled={syncing || !connection?.id}>
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar agora
        </button>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <p className="eyebrow mb-3">Regras da conta</p>
            <h1 className="text-2xl font-bold text-foreground">{account.nickname}</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Login {maskLogin(account.mt5_login)} · {account.mt5_server || '--'} · {account.detected_broker || account.broker || '--'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Detecção: {account.detection_confidence || 'baixa'} · {account.detection_notes || 'Ainda sem notas de detecção.'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Mesa/programa: {currentRuleSet?.programs?.prop_firms?.name || account.detected_prop_firm || 'não definido'} · fase {currentRuleSet?.phase || account.phase || 'não definida'} · tamanho {fmtMoney(currentRuleSet?.account_size ?? account.account_size ?? account.start_balance)}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Saldo</p>
              <p className="font-mono text-sm text-foreground">{fmtMoney(snapshot?.balance ?? account.current_balance)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Equity</p>
              <p className="font-mono text-sm text-foreground">{fmtMoney(snapshot?.equity ?? account.current_equity)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Saúde</p>
              <p className="font-semibold text-sm text-foreground">{healthLabel(health)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Último sync</p>
              <p className="font-mono text-xs text-foreground">
                {connection?.last_sync_at ? new Date(connection.last_sync_at).toLocaleString('pt-BR') : '--'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Conexão</p>
              <p className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${connectionMeta.className}`}>
                {connectionMeta.label}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Sync</p>
              <p className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${syncMeta.className}`}>
                {syncMeta.label}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Regras</p>
              <p className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${rulesMeta.className}`}>
                {rulesMeta.label}
              </p>
            </div>
          </div>
        </div>
      </section>

      <BetaReadinessChecklist
        items={betaChecklist}
          title="Checklist do beta"
          description="Conclua ou revise estes itens antes de confiar nesta conta para monitoramento controlado."
        compact
      />

      {(isMissingRuleSet || isAutoGeneric || needsReview) && (
        <section className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {isMissingRuleSet ? 'Conjunto de regras obrigatório' : isAutoGeneric ? 'Fallback genérico precisa de confirmação' : 'Conjunto de regras precisa de revisão'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isMissingRuleSet
                ? 'Selecione a mesa/programa ou escolha Broker genérico como fallback explícito antes de confiar nas avaliações.'
                : isAutoGeneric
                  ? 'Broker genérico é um modelo de risco, não um conjunto oficial de regras de mesa. Confirme com Salvar regras ou escolha a mesa/programa real.'
                  : 'Este modelo está marcado como needs_review. Verifique regras oficiais da mesa ou adicione regras customizadas antes de usá-lo com usuários beta.'}
            </p>
          </div>
        </section>
      )}

      <BetaResponsibilityNotice variant={isAutoGeneric ? 'broker' : needsReview ? 'rules' : customRules.length > 0 ? 'custom' : 'default'} />

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Configurar regras</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <select
              value={selectedRuleSetId}
              onChange={(event) => setSelectedRuleSetId(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Sem regras / monitoramento broker-only</option>
              {ruleSets.map((ruleSet) => (
                <option key={ruleSet.id} value={ruleSet.id}>
                  {ruleSet.programs?.prop_firms?.name || 'Biblioteca'} · {ruleSet.name}
                  {ruleSet.review_status ? ` · ${ruleSet.review_status}` : ''}
                </option>
              ))}
            </select>
            <button className="pill-btn pill-btn-primary" onClick={saveRuleSet} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar regras'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Selecionado: {currentRuleSet ? `${currentRuleSet.programs?.prop_firms?.name || 'Biblioteca'} / ${currentRuleSet.name}` : 'Nenhum conjunto de regras ativo'}
            {' · '}
            {ruleSetReviewLabel(currentRuleSet)}
          </p>
          {currentRuleSet?.source_url || currentRuleSet?.source_notes ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              {currentRuleSet?.source_url ? (
                <a href={currentRuleSet.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Fonte anexada
                </a>
              ) : (
                <span>Sem URL de fonte anexada.</span>
              )}
              {currentRuleSet?.source_notes ? <p className="mt-1">{currentRuleSet.source_notes}</p> : null}
            </div>
          ) : null}
          {suggestedRuleSets.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Modelos sugeridos</p>
              <div className="flex flex-wrap gap-2">
                {suggestedRuleSets.map((ruleSet) => (
                  <button
                    key={ruleSet.id}
                    type="button"
                    onClick={() => setSelectedRuleSetId(ruleSet.id)}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    {ruleSet.programs?.prop_firms?.name || 'Biblioteca'} · {ruleSet.review_status || 'sem revisão'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Plano de gerenciamento</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Lucro necessário</p>
              <p className="font-mono text-sm text-foreground">{fmtMoney(plan.profitNeeded)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Margem diária</p>
              <p className="font-mono text-sm text-foreground">{fmtMoney(plan.dailyRemaining)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Margem total</p>
              <p className="font-mono text-sm text-foreground">{fmtMoney(plan.totalRemaining)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Risco/trade</p>
              <p className="font-mono text-sm text-foreground">{fmtMoney(plan.safeRisk)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-primary mt-0.5" />
            <p className="text-sm text-foreground">{plan.next}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Avaliações de regras</h2>
          <span className="text-xs text-muted-foreground">{evaluations.length} checagens</span>
        </div>

        {evaluations.length === 0 ? (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Nenhuma avaliação ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Configure regras e rode o sync. Sem avaliações, o Fortify não consegue gerar um plano de risco confiável.</p>
            </div>
          </div>
        ) : (
          Object.entries(groupedEvaluations).map(([group, rows]) => (
            <div key={group} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rows.map((row) => {
                  const meta = statusMeta[row.status as RuleStatus] || statusMeta.NOT_MET;
                  const progress = Math.max(0, Math.min(100, Number(row.progress_pct ?? 0)));
                  return (
                    <div key={row.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm text-foreground">{row.rule_instances?.rule_definitions?.name || 'Regra'}</p>
                          <p className="text-xs text-muted-foreground">{row.explanation || row.message}</p>
                        </div>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Atual</p>
                          <p className="font-mono text-foreground">{Number(row.current_value ?? 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Limite</p>
                          <p className="font-mono text-foreground">{Number(row.limit_value ?? 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Restante</p>
                          <p className="font-mono text-foreground">{Number(row.remaining_value ?? 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3 flex items-start gap-2">
                        {row.data_status === 'insufficient_data' ? (
                          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                        )}
                        <p className="text-xs text-foreground">
                          {row.data_status === 'insufficient_data'
                            ? 'Dados insuficientes. Sincronize mais histórico de trades antes de confiar nesta regra.'
                            : row.recommended_action || row.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Regra customizada</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_120px_auto] gap-3">
          <select
            value={customDefinitionId}
            onChange={(event) => setCustomDefinitionId(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Selecione o tipo de regra</option>
            {definitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.category} · {definition.name}
              </option>
            ))}
          </select>
          <input
            value={customLimit}
            onChange={(event) => setCustomLimit(event.target.value)}
            type="number"
            placeholder="Limite"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <select value={customMode} onChange={(event) => setCustomMode(event.target.value as 'value' | 'percent')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="value">Valor</option>
            <option value="percent">Percentual</option>
          </select>
          <select value={customSeverity} onChange={(event) => setCustomSeverity(event.target.value as 'hard' | 'soft')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="soft">Soft</option>
            <option value="hard">Hard</option>
          </select>
          <button className="pill-btn pill-btn-primary" onClick={addCustomRule}>Adicionar</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {customRules.map((rule) => (
            <div key={rule.id} className={`rounded-lg border border-border p-3 space-y-3 ${rule.enabled ? 'bg-muted/20' : 'bg-muted/10 opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground">{rule.rule_definitions?.name || 'Regra customizada'}</p>
                  <p className="text-xs text-muted-foreground">
                    {rule.mode} · {rule.limit_value} · {rule.severity} · {rule.review_status} · {rule.enabled ? 'ativa' : 'inativa'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="pill-btn" onClick={() => startEditingRule(rule)}>
                    <Pencil className="w-3 h-3" />
                    Editar
                  </button>
                  <button className="pill-btn" onClick={() => toggleCustomRule(rule)}>
                    <Power className="w-3 h-3" />
                    {rule.enabled ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
              {editingRuleId === rule.id && (
                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_130px_150px_auto_auto] gap-2">
                  <input
                    value={editLimit}
                    onChange={(event) => setEditLimit(event.target.value)}
                    type="number"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                  <select value={editMode} onChange={(event) => setEditMode(event.target.value as 'value' | 'percent')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                    <option value="value">Valor</option>
                    <option value="percent">Percentual</option>
                  </select>
                  <select value={editSeverity} onChange={(event) => setEditSeverity(event.target.value as 'hard' | 'soft')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                    <option value="soft">Soft</option>
                    <option value="hard">Hard</option>
                  </select>
                  <select value={editReviewStatus} onChange={(event) => setEditReviewStatus(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                    <option value="user_custom">Customizada</option>
                    <option value="needs_review">Precisa de revisão</option>
                    <option value="verified">Verificada</option>
                  </select>
                  <button className="pill-btn pill-btn-primary" onClick={saveCustomRule}>Salvar</button>
                  <button className="pill-btn" onClick={() => setEditingRuleId('')}>Cancelar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
