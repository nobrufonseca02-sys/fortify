import { gatewayJsonHeaders } from '@/lib/gateway';

const gatewayUrl = () => import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';

export function isBillingEnabled() {
  return import.meta.env.VITE_BILLING_ENABLED !== 'false';
}

export async function createCheckoutSession(planSlug: string, accessToken: string) {
  const response = await fetch(`${gatewayUrl()}/billing/create-checkout-session`, {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: JSON.stringify({ planSlug }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.details || body?.error || 'Falha ao criar checkout Stripe.');
  }

  return body as { checkout_url: string; session_id: string };
}

export async function confirmCheckoutSession(sessionId: string, accessToken: string) {
  const response = await fetch(`${gatewayUrl()}/billing/confirm-checkout-session`, {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: JSON.stringify({ sessionId }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.details || body?.error || 'Falha ao confirmar pagamento Stripe.');
  }

  return body;
}

export async function getSubscriptionStatus(accessToken: string) {
  const response = await fetch(`${gatewayUrl()}/billing/subscription-status`, {
    method: 'GET',
    headers: gatewayJsonHeaders(accessToken),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.details || body?.error || 'Falha ao carregar assinatura.');
  }

  return body;
}

export async function createPortalSession(accessToken: string) {
  const response = await fetch(`${gatewayUrl()}/billing/create-portal-session`, {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: JSON.stringify({}),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.details || body?.error || 'Falha ao abrir portal de cobrança.');
  }

  return body as { portal_url: string };
}

export async function createAddonCheckoutSession(addonSlug: string, accessToken: string) {
  const response = await fetch(`${gatewayUrl()}/billing/create-addon-checkout-session`, {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: JSON.stringify({ addonSlug }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.details || body?.error || 'Falha ao criar checkout da conta extra.');
  }

  return body as { checkout_url: string; session_id: string };
}
