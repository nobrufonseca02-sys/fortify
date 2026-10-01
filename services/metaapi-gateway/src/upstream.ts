// Chamadas a serviços externos (MetaApi, Stripe): sempre com timeout e com a
// falha classificada, para não tratar tudo como erro de autenticação.

export const DEFAULT_UPSTREAM_TIMEOUT_MS = 15_000;

export class UpstreamTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Upstream request timed out after ${timeoutMs}ms`);
    this.name = 'UpstreamTimeoutError';
  }
}

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Respeita um signal que o chamador já tenha passado.
  const external = init.signal;
  const onExternalAbort = () => controller.abort();
  external?.addEventListener('abort', onExternalAbort, { once: true });
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !external?.aborted) throw new UpstreamTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', onExternalAbort);
  }
}

export type UpstreamFailureKind =
  | 'auth'
  | 'not_found'
  | 'rate_limited'
  | 'temporary'
  | 'timeout'
  | 'network'
  | 'client_error';

export function classifyHttpStatus(status: number): UpstreamFailureKind | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status === 408 || status >= 500) return 'temporary';
  return 'client_error';
}

export function classifyFetchError(error: unknown): UpstreamFailureKind {
  if (error instanceof UpstreamTimeoutError) return 'timeout';
  return 'network';
}

// Quando várias chamadas falham, a causa mais acionável vence: credencial
// inválida importa mais que uma falha temporária.
const KIND_PRIORITY: UpstreamFailureKind[] = [
  'auth',
  'not_found',
  'client_error',
  'rate_limited',
  'timeout',
  'temporary',
  'network',
];

export function worstFailureKind(kinds: Array<UpstreamFailureKind | null>): UpstreamFailureKind | null {
  const present = kinds.filter((kind): kind is UpstreamFailureKind => kind !== null);
  if (present.length === 0) return null;
  return KIND_PRIORITY.find((kind) => present.includes(kind)) ?? present[0];
}

export interface SyncFailureState {
  /** Valor gravado em mt5_connections.connection_status. */
  connectionStatus: 'auth_error' | 'connected' | 'disconnected';
  syncStatus: 'error';
  /** Mensagem segura para o usuário (sem corpo da resposta nem token). */
  userMessage: string;
  httpStatus: number;
  retryable: boolean;
}

export function syncFailureState(kind: UpstreamFailureKind): SyncFailureState {
  switch (kind) {
    case 'auth':
      return {
        connectionStatus: 'auth_error',
        syncStatus: 'error',
        userMessage: 'A MetaApi recusou as credenciais desta conta MT5. Atualize a senha para reconectar.',
        httpStatus: 502,
        retryable: false,
      };
    case 'not_found':
      return {
        connectionStatus: 'disconnected',
        syncStatus: 'error',
        userMessage: 'A conta MT5 não foi encontrada na MetaApi. Reconecte a conta.',
        httpStatus: 502,
        retryable: false,
      };
    case 'rate_limited':
      return {
        connectionStatus: 'connected',
        syncStatus: 'error',
        userMessage: 'Limite de requisições da MetaApi atingido. Tente sincronizar novamente em alguns minutos.',
        httpStatus: 503,
        retryable: true,
      };
    case 'timeout':
      return {
        connectionStatus: 'connected',
        syncStatus: 'error',
        userMessage: 'A MetaApi demorou demais para responder. Tente sincronizar novamente.',
        httpStatus: 504,
        retryable: true,
      };
    case 'network':
      return {
        connectionStatus: 'connected',
        syncStatus: 'error',
        userMessage: 'Não foi possível falar com a MetaApi agora. Tente sincronizar novamente.',
        httpStatus: 502,
        retryable: true,
      };
    case 'temporary':
      return {
        connectionStatus: 'connected',
        syncStatus: 'error',
        userMessage: 'A MetaApi está instável no momento. Tente sincronizar novamente em alguns minutos.',
        httpStatus: 503,
        retryable: true,
      };
    default:
      return {
        connectionStatus: 'connected',
        syncStatus: 'error',
        userMessage: 'A MetaApi rejeitou a solicitação de sincronização.',
        httpStatus: 502,
        retryable: false,
      };
  }
}
