import type { RuleEvaluationStatus } from '@/lib/ruleEngine/ruleEngineTypes';

// Sem sincronização bem-sucedida há mais que isto, o dado é tratado como atrasado.
export const STALE_SYNC_MS = 6 * 60 * 60 * 1000;
// Sync em andamento há mais que isto é tratado como travado (falha que não
// restaurou o estado, processo interrompido etc.).
export const STUCK_SYNC_MS = 15 * 60 * 1000;

export interface ConnectionHealthInput {
  connection_status?: string | null;
  sync_status?: string | null;
  sync_error?: string | null;
  last_sync_at?: string | null;
  updated_at?: string | null;
}

export type ConnectionHealthState =
  | 'no_connection'
  | 'connection_error'
  | 'sync_stuck'
  | 'syncing'
  | 'no_data'
  | 'stale'
  | 'healthy';

export interface ConnectionHealth {
  state: ConnectionHealthState;
  lastSyncAt: string | null;
}

const ERROR_STATES = ['auth_error', 'error', 'failed', 'sync_failed', 'suspension_pending', 'disconnected', 'removed'];
const RUNNING_STATES = ['running', 'syncing'];

function timestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function assessConnectionHealth(
  connection: ConnectionHealthInput | null | undefined,
  options: { now?: number; fallbackLastSyncAt?: string | null } = {},
): ConnectionHealth {
  const now = options.now ?? Date.now();
  const lastSyncAt = connection?.last_sync_at ?? options.fallbackLastSyncAt ?? null;
  if (!connection) return { state: 'no_connection', lastSyncAt };

  const connectionStatus = String(connection.connection_status ?? '').toLowerCase();
  const syncStatus = String(connection.sync_status ?? '').toLowerCase();

  if (ERROR_STATES.includes(connectionStatus) || ERROR_STATES.includes(syncStatus)) {
    return { state: 'connection_error', lastSyncAt };
  }

  const lastSync = timestamp(lastSyncAt);
  if (RUNNING_STATES.includes(syncStatus) || RUNNING_STATES.includes(connectionStatus)) {
    const startedAt = timestamp(connection.updated_at);
    if (startedAt !== null && now - startedAt > STUCK_SYNC_MS) {
      return { state: 'sync_stuck', lastSyncAt };
    }
    if (lastSync === null) return { state: 'syncing', lastSyncAt };
  }

  if (connection.sync_error) return { state: 'connection_error', lastSyncAt };
  if (lastSync === null) return { state: 'no_data', lastSyncAt };
  if (now - lastSync > STALE_SYNC_MS) return { state: 'stale', lastSyncAt };
  return { state: 'healthy', lastSyncAt };
}

export type AccountDisplayStatus =
  | 'safe'
  | 'partial'
  | 'warning'
  | 'critical'
  | 'breached'
  | 'not_monitorable'
  | 'unbound'
  | 'no_data'
  | 'no_connection'
  | 'connection_error'
  | 'sync_stuck'
  | 'syncing'
  | 'stale';

export type AccountStatusTone = 'success' | 'info' | 'warning' | 'danger' | 'muted';

export interface AccountStatusView {
  status: AccountDisplayStatus;
  label: string;
  tone: AccountStatusTone;
  detail: string;
  // Ação que resolve o estado atual, quando houver uma.
  action: 'fix_connection' | 'bind_rule' | 'sync' | null;
  // Problema de conexão/sincronização que acompanha um alerta de regra.
  healthNote: string | null;
}

const STATUS_VIEW: Record<AccountDisplayStatus, Omit<AccountStatusView, 'status' | 'healthNote'>> = {
  safe: { label: 'Seguro', tone: 'success', detail: 'Regras monitoradas dentro dos limites.', action: null },
  partial: {
    label: 'Verificação parcial',
    tone: 'info',
    detail: 'Valores abaixo dos limites, mas com premissas não confirmadas. Não confirma conta segura.',
    action: null,
  },
  warning: { label: 'Atenção', tone: 'warning', detail: 'Uma regra está em zona de atenção.', action: null },
  critical: { label: 'Crítico', tone: 'danger', detail: 'Uma regra está próxima do limite.', action: null },
  breached: { label: 'Violado', tone: 'danger', detail: 'Um limite operacional foi atingido.', action: null },
  not_monitorable: {
    label: 'Não monitorável',
    tone: 'muted',
    detail: 'As regras críticas desta conta não podem ser calculadas automaticamente.',
    action: null,
  },
  unbound: {
    label: 'Regra não vinculada',
    tone: 'warning',
    detail: 'Vincule a versão oficial da regra da mesa para ativar o monitoramento.',
    action: 'bind_rule',
  },
  no_data: {
    label: 'Sem dados',
    tone: 'muted',
    detail: 'Ainda não há sincronização concluída para avaliar esta conta.',
    action: 'sync',
  },
  no_connection: {
    label: 'Sem conexão MT5',
    tone: 'muted',
    detail: 'A conta não tem conexão MT5 ativa.',
    action: 'fix_connection',
  },
  connection_error: {
    label: 'Conexão com erro',
    tone: 'danger',
    detail: 'A última tentativa de conexão ou sincronização falhou. Os dados exibidos podem estar desatualizados.',
    action: 'fix_connection',
  },
  sync_stuck: {
    label: 'Sincronização travada',
    tone: 'danger',
    detail: 'A sincronização começou e não terminou. Os dados exibidos podem estar desatualizados.',
    action: 'sync',
  },
  syncing: {
    label: 'Sincronizando',
    tone: 'warning',
    detail: 'A primeira sincronização está em andamento.',
    action: null,
  },
  stale: {
    label: 'Sync atrasado',
    tone: 'warning',
    detail: 'A última sincronização tem mais de 6 horas. Sincronize antes de confiar nos valores.',
    action: 'sync',
  },
};

/** Rótulo/tom de um problema de conexão isolado; `null` quando saudável. */
export function connectionHealthView(health: ConnectionHealth) {
  if (health.state === 'healthy') return null;
  return { status: health.state as AccountDisplayStatus, ...STATUS_VIEW[health.state as AccountDisplayStatus] };
}

const RULE_ALARMS: RuleEvaluationStatus[] = ['warning', 'critical', 'breached'];

/**
 * Status único exibido para uma conta. Precedência:
 * 1. alerta de regra (atenção/crítico/violado) sempre aparece — um alarme vindo de
 *    dados antigos continua sendo alarme;
 * 2. problema de conexão/sincronização vence qualquer conclusão tranquila;
 * 3. sem vínculo de regra, a conta não é monitorada;
 * 4. só então vale o resultado das regras. Sem avaliação, "Sem dados".
 */
export function resolveAccountStatus(input: {
  health: ConnectionHealth;
  hasRuleBinding: boolean;
  ruleStatus: RuleEvaluationStatus | null;
}): AccountStatusView {
  const view = (status: AccountDisplayStatus, healthNote: string | null = null): AccountStatusView => ({
    status,
    healthNote,
    ...STATUS_VIEW[status],
  });
  const healthIssue = input.health.state === 'healthy' ? null : (input.health.state as AccountDisplayStatus);

  if (input.ruleStatus && RULE_ALARMS.includes(input.ruleStatus)) {
    return view(input.ruleStatus as AccountDisplayStatus, healthIssue ? STATUS_VIEW[healthIssue].label : null);
  }
  if (healthIssue) return view(healthIssue);
  if (!input.hasRuleBinding) return view('unbound');
  if (!input.ruleStatus) return view('no_data');
  if (input.ruleStatus === 'pending_binding') return view('unbound');
  return view(input.ruleStatus as AccountDisplayStatus);
}

export function accountStatusIsSafe(view: AccountStatusView) {
  return view.status === 'safe';
}

/**
 * Leitura das avaliações do catálogo antigo (`rule_evaluations`), usada só como
 * fallback explícito para contas sem vínculo versionado. Status desconhecido
 * vira "parcial", nunca "seguro".
 */
export function ruleStatusFromLegacyEvaluations(
  evaluations: Array<{ status?: string | null }>,
): RuleEvaluationStatus | null {
  if (evaluations.length === 0) return null;
  const statuses = evaluations.map((evaluation) => String(evaluation.status ?? '').toUpperCase());
  if (statuses.some((status) => status === 'VIOLATED' || status === 'BREACHED')) return 'breached';
  if (statuses.some((status) => status === 'CRITICAL')) return 'critical';
  if (statuses.some((status) => status === 'WARNING')) return 'warning';
  // NOT_MET no catálogo antigo é "meta de lucro ainda não atingida", não falha.
  if (statuses.every((status) => ['SAFE', 'APPROVING', 'MET', 'NOT_MET'].includes(status))) return 'safe';
  return 'partial';
}

export const STATUS_TONE_CLASS: Record<AccountStatusTone, string> = {
  success: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/15 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};
