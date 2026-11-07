export function gatewayJsonHeaders(accessToken?: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export function gatewayBaseUrl(): string {
  return import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';
}

/** Marca o usuário como ativo; o gateway reimplanta contas pausadas por inatividade. */
export function sendPresenceHeartbeat(accessToken: string): Promise<void> {
  return fetch(`${gatewayBaseUrl()}/metaapi/presence`, {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: '{}',
  })
    .then(() => undefined)
    .catch(() => undefined);
}

/**
 * Pausa as contas MT5 na MetaApi antes do logout. Precisa ir antes do
 * signOut, que invalida o token; o gateway segue processando mesmo se o
 * limite de espera daqui estourar.
 */
export function notifyGatewayOffline(accessToken: string, waitMs = 2500): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), waitMs);
  return fetch(`${gatewayBaseUrl()}/metaapi/offline`, {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: '{}',
    keepalive: true,
    signal: controller.signal,
  })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => clearTimeout(timer));
}
