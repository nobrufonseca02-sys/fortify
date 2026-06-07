import type { RuleEvaluationRow } from '@/hooks/useRuleEvaluations';
import type { TradingAccount } from '@/types/fortify';

export type BetaChecklistStatus = 'complete' | 'pending' | 'warning';

export interface BetaChecklistItem {
  id: string;
  label: string;
  status: BetaChecklistStatus;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}

type ConnectionLike = {
  id?: string | null;
  trading_account_id?: string | null;
  mt5_login?: string | null;
  mt5_server?: string | null;
  broker_name?: string | null;
  connection_status?: string | null;
  sync_status?: string | null;
  sync_error?: string | null;
  last_sync_at?: string | null;
};

type RuleSetLike = {
  review_status?: string | null;
  is_user_custom?: boolean | null;
  name?: string | null;
  programs?: {
    prop_firms?: {
      name?: string | null;
      slug?: string | null;
    } | null;
  } | null;
} | null;

export function maskLogin(value: string | null | undefined) {
  if (!value) return '--';
  const clean = String(value);
  if (clean.length <= 4) return '*'.repeat(clean.length);
  return `${clean.slice(0, 2)}***${clean.slice(-2)}`;
}

export function isSyncStale(lastSyncAt?: string | null) {
  if (!lastSyncAt) return false;
  const time = Date.parse(lastSyncAt);
  if (!Number.isFinite(time)) return false;
  return Date.now() - time > 24 * 60 * 60 * 1000;
}

export function getConnectionStatusMeta(status?: string | null) {
  const normalized = String(status || 'disconnected').toLowerCase();
  if (normalized === 'connected') {
    return {
      label: 'Conectada',
      shortLabel: 'connected',
      className: 'bg-success/15 text-success',
      description: 'A conta MT5 está vinculada ao Fortify.',
    };
  }
  if (['connecting', 'queued', 'deploying', 'pending'].includes(normalized)) {
    return {
      label: 'Pendente',
      shortLabel: 'pending',
      className: 'bg-warning/15 text-warning',
      description: 'A conexão ainda está sendo preparada pela MetaApi.',
    };
  }
  if (['auth_error', 'failed', 'error'].includes(normalized)) {
    return {
      label: 'Falhou',
      shortLabel: 'failed',
      className: 'bg-destructive/15 text-destructive',
      description: 'Revise login, senha, servidor MT5 e configuração local.',
    };
  }
  return {
    label: 'Desconectada',
    shortLabel: 'disconnected',
    className: 'bg-muted text-muted-foreground',
    description: 'Conecte o MT5 para iniciar monitoramento real.',
  };
}

export function getSyncStatusMeta(status?: string | null, lastSyncAt?: string | null, syncError?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (syncError || ['error', 'failed'].includes(normalized)) {
    return {
      label: 'Sync falhou',
      shortLabel: 'failed',
      className: 'bg-destructive/15 text-destructive',
      description: 'Tente sincronizar novamente e revise a mensagem de erro.',
    };
  }
  if (['running', 'syncing', 'queued'].includes(normalized)) {
    return {
      label: 'Sincronizando',
      shortLabel: 'syncing',
      className: 'bg-primary/15 text-primary',
      description: 'O Fortify está buscando snapshots, posições e trades.',
    };
  }
  if (['disconnected', 'removed', 'inactive'].includes(normalized)) {
    return {
      label: normalized === 'removed' ? 'Removida' : 'Desconectada',
      shortLabel: normalized === 'removed' ? 'removed' : 'disconnected',
      className: 'bg-muted text-muted-foreground',
      description: 'A conta foi desconectada do monitoramento. O histórico permanece preservado.',
    };
  }
  if (!lastSyncAt) {
    return {
      label: 'Nunca sincronizada',
      shortLabel: 'never synced',
      className: 'bg-muted text-muted-foreground',
      description: 'Execute o primeiro sync para liberar dados reais.',
    };
  }
  if (isSyncStale(lastSyncAt)) {
    return {
      label: 'Dados antigos',
      shortLabel: 'stale data',
      className: 'bg-warning/15 text-warning',
      description: 'Sincronize para atualizar o risco antes de operar.',
    };
  }
  return {
    label: 'Sync ok',
    shortLabel: 'success',
    className: 'bg-success/15 text-success',
    description: 'Dados recentes disponíveis para análise.',
  };
}

export function getRulesStatusMeta(input: {
  account?: Partial<TradingAccount> & Record<string, unknown> | null;
  ruleSet?: RuleSetLike;
  customRulesCount?: number;
}) {
  const account = input.account;
  const ruleSet = input.ruleSet;
  const selection = String(account?.rule_selection_status || '');
  const reviewStatus = String(ruleSet?.review_status || '');
  const firmSlug = String(ruleSet?.programs?.prop_firms?.slug || '');
  const hasRuleSet = Boolean(account?.ruleSetId || account?.rule_set_id);

  if (!hasRuleSet || selection === 'unconfigured') {
    return {
      label: 'Regras ausentes',
      shortLabel: 'rules missing',
      className: 'bg-muted text-muted-foreground',
      description: 'Escolha a mesa, programa ou fallback broker-only antes de confiar no painel.',
    };
  }
  if (selection === 'auto_generic' || firmSlug.includes('broker-only') || firmSlug.includes('generic')) {
    return {
      label: 'Broker-only genérico',
      shortLabel: 'generic broker-only',
      className: 'bg-warning/15 text-warning',
      description: 'Template de risco do broker. Não é regra oficial de prop firm.',
    };
  }
  if (reviewStatus === 'needs_review') {
    return {
      label: 'Precisa revisão',
      shortLabel: 'needs review',
      className: 'bg-warning/15 text-warning',
      description: 'Valide estas regras com o contrato/dashboard oficial antes de depender delas.',
    };
  }
  if (reviewStatus === 'user_custom' || ruleSet?.is_user_custom) {
    return {
      label: 'Custom do usuário',
      shortLabel: 'user custom',
      className: 'bg-info/15 text-info',
      description: 'Regras controladas pelo usuário. Revise limites antes de operar.',
    };
  }
  if ((input.customRulesCount ?? 0) > 0) {
    return {
      label: 'Override ativo',
      shortLabel: 'account override active',
      className: 'bg-info/15 text-info',
      description: 'Esta conta tem ajustes próprios além do template.',
    };
  }
  if (reviewStatus === 'verified') {
    return {
      label: 'Oficial verificado',
      shortLabel: 'official verified',
      className: 'bg-success/15 text-success',
      description: 'Template marcado como verificado na biblioteca.',
    };
  }
  return {
    label: 'Regras configuradas',
    shortLabel: 'rules configured',
    className: 'bg-success/15 text-success',
    description: 'A conta possui regras ativas para avaliação.',
  };
}

export function getRiskStatusMeta(evaluations: RuleEvaluationRow[] = []) {
  if (evaluations.some((row) => row.status === 'VIOLATED')) {
    return {
      label: 'Violado',
      shortLabel: 'violated',
      className: 'bg-destructive/15 text-destructive',
      description: 'Uma ou mais regras foram violadas. Pare e revise a conta.',
    };
  }
  if (evaluations.some((row) => row.data_status === 'insufficient_data')) {
    return {
      label: 'Dados insuficientes',
      shortLabel: 'insufficient data',
      className: 'bg-warning/15 text-warning',
      description: 'O Fortify precisa de mais histórico para avaliar todas as regras.',
    };
  }
  if (evaluations.some((row) => row.status === 'WARNING')) {
    return {
      label: 'Alto risco',
      shortLabel: 'high risk',
      className: 'bg-warning/15 text-warning',
      description: 'A conta está perto de um limite. Reduza o risco.',
    };
  }
  if (evaluations.length === 0) {
    return {
      label: 'Atenção',
      shortLabel: 'attention',
      className: 'bg-muted text-muted-foreground',
      description: 'Ainda não há avaliações. Configure regras e rode sync.',
    };
  }
  return {
    label: 'Seguro',
    shortLabel: 'safe',
    className: 'bg-success/15 text-success',
    description: 'As regras avaliadas estão dentro dos limites.',
  };
}

export function getConnectErrorMessage(data: any) {
  const fallback = data?.error || data?.details || 'Erro ao conectar com MetaApi.';
  const messages: Record<string, string> = {
    wrong_mt5_server: 'Servidor MT5 não encontrado. Copie o nome exato do servidor no e-mail da corretora ou no terminal MT5.',
    wrong_mt5_credentials: 'Login ou senha MT5 inválidos. Tente a senha principal ou a senha investidor e confirme o servidor.',
    mt5_password_required: 'Informe a senha MT5 para provisionar a conta na MetaApi.',
    metaapi_provisioning_pending: 'Conta criada na MetaApi, mas ainda em implantação. Aguarde alguns minutos e rode o sync.',
    metaapi_provisioning_failed: 'A MetaApi recusou o provisionamento. Revise servidor, login, senha e permissões da conta.',
    metaapi_provisioning_fetch_failed: 'Não foi possível alcançar a MetaApi. Verifique internet local e tente novamente.',
    invalid_metaapi_token: 'Configuração MetaApi inválida no gateway local. Atualize o token antes de conectar contas.',
    missing_user_session: 'Sessão Fortify ausente. Faça login novamente antes de conectar o MT5.',
    invalid_user_session: 'Sessão Fortify inválida ou expirada. Faça login novamente e tente conectar.',
    user_mismatch: 'A sessão Fortify não corresponde ao usuário da requisição. Recarregue o app e tente novamente.',
    ownership_mismatch: 'Esta conta não pertence ao usuário autenticado. Abra a conta correta ou faça login novamente.',
    plan_required: 'Escolha um plano Fortify ou solicite acesso beta antes de conectar uma nova conta MT5.',
    account_limit_exceeded: 'Você atingiu o limite de contas do seu plano. Remova uma conta do monitoramento ou faça upgrade.',
    duplicate_mt5_account: 'Este login/servidor MT5 já está conectado por outro usuário Fortify. Use uma conta MT5 própria.',
    subscription_lookup_failed: 'Não foi possível validar seu plano Fortify. Recarregue a sessão e tente novamente.',
    supabase_insert_failed: 'Conta conectada, mas o Fortify não conseguiu gravar no Supabase. Verifique permissões e schema.',
    supabase_update_failed: 'Conta conectada, mas o Fortify não conseguiu atualizar o Supabase. Verifique permissões e schema.',
    supabase_lookup_failed: 'O Fortify não conseguiu localizar registros no Supabase. Recarregue a sessão e tente novamente.',
  };
  return messages[data?.code] || fallback;
}

export function getSyncErrorMessage(data: any) {
  const fallback = data?.error || data?.details || 'Erro ao sincronizar com MetaApi.';
  const messages: Record<string, string> = {
    missing_user_session: 'Sessão do usuário não encontrada. Faça login novamente e tente o sync.',
    invalid_user_session: 'Sessão Fortify inválida ou expirada. Faça login novamente e tente o sync.',
    user_mismatch: 'A sessão Fortify não corresponde ao usuário da requisição. Recarregue o app e tente novamente.',
    ownership_mismatch: 'Esta conexão MT5 não pertence ao usuário autenticado. Abra sua própria conta e tente novamente.',
    connection_not_found: 'Conexão MT5 não encontrada para esta conta. Revise a integração em MT5.',
    metaapi_account_pending: 'A conta ainda está em implantação na MetaApi. Aguarde alguns minutos e tente novamente.',
    metaapi_region_mismatch: 'A região da conta MetaApi não bate com o gateway local. Confirme METAAPI_REGION no backend.',
    supabase_update_failed: 'Sync recebido, mas falhou ao atualizar status no Supabase. Verifique permissões.',
    supabase_upsert_failed: 'Sync recebido, mas falhou ao gravar snapshots. Verifique schema e permissões.',
    supabase_insert_failed: 'Sync recebido, mas falhou ao gravar trades ou posições. Verifique schema.',
    supabase_delete_failed: 'Sync recebido, mas falhou ao atualizar posições abertas. Tente novamente.',
    rule_evaluation_failed: 'Dados sincronizados, mas as regras não recalcularam. Abra Rules e revise o rule set.',
    missing_rule_set: 'Conta sincronizada, mas ainda sem regras. Configure a mesa/modalidade para liberar o painel de risco.',
    insufficient_trade_history: 'Histórico insuficiente para avaliar todas as regras. Sincronize mais trades ou aguarde novas operações.',
  };
  return messages[data?.code] || fallback;
}

export function buildBetaChecklist(input: {
  account?: (Partial<TradingAccount> & Record<string, any>) | null;
  connection?: ConnectionLike | null;
  ruleSet?: RuleSetLike;
  evaluations?: RuleEvaluationRow[];
  snapshot?: unknown;
  customRulesCount?: number;
}) {
  const accountId = input.account?.id || input.connection?.trading_account_id;
  const connection = input.connection;
  const evaluations = input.evaluations ?? [];
  const connectionMeta = getConnectionStatusMeta(connection?.connection_status || input.account?.mt5ConnectionStatus);
  const syncMeta = getSyncStatusMeta(connection?.sync_status, connection?.last_sync_at || input.account?.mt5LastSyncAt, connection?.sync_error || input.account?.mt5SyncError);
  const rulesMeta = getRulesStatusMeta({ account: input.account, ruleSet: input.ruleSet, customRulesCount: input.customRulesCount });
  const riskMeta = getRiskStatusMeta(evaluations);
  const hasBrokerServer = Boolean(connection?.mt5_server || input.account?.mt5Server) && Boolean(connection?.broker_name || input.account?.broker || input.account?.detected_broker);
  const hasSnapshot = Boolean(input.snapshot || connection?.last_sync_at || input.account?.mt5LastSyncAt);
  const rulesWarning = ['generic broker-only', 'needs review', 'user custom', 'account override active'].includes(rulesMeta.shortLabel);
  const rulesMissing = rulesMeta.shortLabel === 'rules missing';
  const riskReady = evaluations.length > 0 && riskMeta.shortLabel !== 'insufficient data';

  const items: BetaChecklistItem[] = [
    {
      id: 'mt5-connected',
      label: 'MT5 connected',
      status: connectionMeta.shortLabel === 'connected' ? 'complete' : connectionMeta.shortLabel === 'failed' ? 'warning' : 'pending',
      description: connectionMeta.shortLabel === 'connected'
        ? 'MetaTrader is linked and ready for sync.'
        : connectionMeta.description,
      actionLabel: connectionMeta.shortLabel === 'connected' ? undefined : 'Connect MT5',
      actionTo: '/mt5',
    },
    {
      id: 'broker-detected',
      label: 'Broker/server detected',
      status: hasBrokerServer ? 'complete' : 'pending',
      description: hasBrokerServer
        ? 'Broker and server are recorded for this account.'
        : 'Connect MT5 or enter the exact server name so Fortify can identify the account.',
      actionLabel: hasBrokerServer ? undefined : 'Review MT5',
      actionTo: '/mt5',
    },
    {
      id: 'rules-configured',
      label: 'Rules configured',
      status: rulesMissing ? 'pending' : rulesWarning ? 'warning' : 'complete',
      description: rulesMeta.description,
      actionLabel: rulesMissing || rulesWarning ? 'Configure rules' : 'View rules',
      actionTo: accountId ? `/accounts/${accountId}/rules` : '/accounts',
    },
    {
      id: 'first-sync',
      label: 'First sync completed',
      status: syncMeta.shortLabel === 'success' || syncMeta.shortLabel === 'stale data' ? (syncMeta.shortLabel === 'stale data' ? 'warning' : 'complete') : syncMeta.shortLabel === 'failed' ? 'warning' : 'pending',
      description: hasSnapshot ? syncMeta.description : 'Run sync to fetch balance, equity, positions and trades.',
      actionLabel: hasSnapshot ? undefined : 'Run first sync',
      actionTo: accountId ? `/accounts/${accountId}` : '/mt5',
    },
    {
      id: 'risk-plan',
      label: 'Risk plan generated',
      status: riskReady ? 'complete' : riskMeta.shortLabel === 'insufficient data' ? 'warning' : 'pending',
      description: riskReady
        ? 'Risk plan and next best action are available.'
        : riskMeta.description,
      actionLabel: 'View risk plan',
      actionTo: accountId ? `/accounts/${accountId}/rules` : '/calculator',
    },
    {
      id: 'rule-evaluations',
      label: 'Rule evaluations available',
      status: evaluations.length > 0 ? (riskMeta.shortLabel === 'insufficient data' ? 'warning' : 'complete') : 'pending',
      description: evaluations.length > 0
        ? `${evaluations.length} rule checks are available.`
        : 'Configure rules and sync before using evaluation results.',
      actionLabel: evaluations.length > 0 ? 'View evaluations' : 'Configure rules',
      actionTo: accountId ? `/accounts/${accountId}/rules` : '/accounts',
    },
  ];

  const blocking = items.some((item) => item.status === 'pending');
  const warnings = items.some((item) => item.status === 'warning');
  items.push({
    id: 'ready-monitoring',
    label: 'Account ready for monitoring',
    status: blocking ? 'pending' : warnings ? 'warning' : 'complete',
    description: blocking
      ? 'Complete the pending steps before treating this account as beta-ready.'
      : warnings
        ? 'Monitoring is available, but review the warning items before relying on it.'
        : 'This account is ready for controlled monitoring.',
    actionLabel: accountId ? 'Open account' : 'Open accounts',
    actionTo: accountId ? `/accounts/${accountId}` : '/accounts',
  });

  return items;
}
