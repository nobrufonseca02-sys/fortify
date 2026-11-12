// A MetaApi cobra por hora de conta implantada, e o Fortify só lê a conta
// quando o usuário pede uma sincronização. Conta implantada de quem não está
// na plataforma é custo sem uso: estas regras decidem o que desimplantar.

export const IDLE_TIMEOUT_MS = 30 * 60_000;

/**
 * MetaApi ligada no servidor? Desde 12/11/2026 o Fortify Guard (EA) é a fonte
 * de dados e a MetaApi fica desligada por padrão, como no site
 * (VITE_METAAPI_ENABLED). Desligada, o servidor não reimplanta conta pausada:
 * cada conta antiga ligada pela MetaApi custaria a hora de implantação sem que
 * nada no site use os dados dela. A varredura de inatividade continua
 * desimplantando, então essas contas param de gerar custo e não voltam.
 * Para religar, METAAPI_ENABLED=true no .env do gateway.
 */
export function metaApiEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return String(env.METAAPI_ENABLED ?? '').trim().toLowerCase() === 'true';
}

export type IdleConnection = {
  id: string;
  user_id: string;
  provider_account_id: string | null;
  sync_status?: string | null;
  suspended_at?: string | null;
  metaapi_suspended_at?: string | null;
  idle_undeployed_at?: string | null;
};

/** Conta que está (ou deveria estar) implantada: tem conta MetaApi, não foi
 *  removida e não está suspensa por assinatura — essa tem fluxo próprio. */
export function isDeployableConnection(connection: IdleConnection): boolean {
  const syncStatus = String(connection.sync_status || '').toLowerCase();
  return (
    Boolean(String(connection.provider_account_id || '').trim()) &&
    syncStatus !== 'removed' &&
    syncStatus !== 'suspension_pending' &&
    !connection.suspended_at &&
    !connection.metaapi_suspended_at
  );
}

export function isUserOnline(lastSeenMs: number | undefined, nowMs: number, timeoutMs = IDLE_TIMEOUT_MS): boolean {
  return lastSeenMs !== undefined && nowMs - lastSeenMs < timeoutMs;
}

export type UndeployPlan = { providerAccountId: string; connectionIds: string[] };

/**
 * Agrupa por conta MetaApi: uma conta só é desimplantada se nenhum dono de
 * linha que aponta para ela estiver online, e se ainda houver linha não
 * marcada como pausada (senão já foi desimplantada antes).
 */
export function planIdleUndeploys(
  connections: IdleConnection[],
  lastSeenByUser: Map<string, number>,
  nowMs: number,
  timeoutMs = IDLE_TIMEOUT_MS,
): UndeployPlan[] {
  const groups = new Map<string, IdleConnection[]>();
  for (const connection of connections) {
    if (!isDeployableConnection(connection)) continue;
    const providerAccountId = String(connection.provider_account_id).trim();
    const group = groups.get(providerAccountId) ?? [];
    group.push(connection);
    groups.set(providerAccountId, group);
  }

  const plans: UndeployPlan[] = [];
  for (const [providerAccountId, group] of groups) {
    const someoneOnline = group.some((c) => isUserOnline(lastSeenByUser.get(c.user_id), nowMs, timeoutMs));
    const alreadyPaused = group.every((c) => Boolean(c.idle_undeployed_at));
    if (someoneOnline || alreadyPaused) continue;
    plans.push({ providerAccountId, connectionIds: group.map((c) => c.id) });
  }
  return plans;
}
