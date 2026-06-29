import { gatewayJsonHeaders } from '@/lib/gateway';

const gatewayUrl = () => {
  const configuredUrl = String(
    import.meta.env.VITE_BILLING_API_URL ||
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_PUBLIC_BACKEND_URL ||
      '',
  ).trim();

  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (import.meta.env.DEV) return '/api';

  const legacyGatewayUrl = String(import.meta.env.VITE_METAAPI_GATEWAY_URL || '').trim();
  return legacyGatewayUrl ? legacyGatewayUrl.replace(/\/+$/, '') : '';
};

const gatewayHelpMessage = () =>
  'Gateway Fortify indisponível. Rode npm run dev para iniciar frontend e gateway juntos.';

export function isBillingEnabled() {
  return import.meta.env.VITE_BILLING_ENABLED !== 'false';
}

function assertCheckoutUrl(url: string | undefined) {
  if (!url || !url.includes('checkout.stripe.com')) {
    throw new Error('A Stripe retornou uma URL inválida para checkout.');
  }
}

function billingErrorMessage(body: any, fallback: string) {
  const code = String(body?.code || '');
  if (['missing_user_session', 'invalid_user_session', 'user_session_check_failed'].includes(code)) {
    return 'Sessão expirada. Entre novamente para continuar o checkout.';
  }
  if (code === 'stripe_price_missing') {
    return 'Plano sem Price ID válido da Stripe.';
  }
  if (code === 'invalid_billing_plan') {
    return 'Plano Fortify não encontrado ou inativo.';
  }
  return body?.details || body?.error || fallback;
}

async function billingFetch(path: string, init: RequestInit) {
  try {
    return await fetch(`${gatewayUrl()}${path}`, init);
  } catch (error: any) {
    if (error?.name === 'TypeError') {
      throw new Error(gatewayHelpMessage());
    }
    throw error;
  }
}

async function assertBillingGatewayAvailable() {
  try {
    const response = await fetch(`${gatewayUrl()}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`gateway_health_${response.status}`);
  } catch {
    throw new Error(gatewayHelpMessage());
  }
}

export async function createCheckoutSession(planSlug: string, accessToken: string) {
  await assertBillingGatewayAvailable();

  const response = await billingFetch('/billing/create-checkout-session', {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: JSON.stringify({ planSlug }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(billingErrorMessage(body, 'Falha ao criar checkout Stripe.'));
  }

  assertCheckoutUrl(body?.checkout_url);
  return body as { checkout_url: string; session_id: string };
}

export async function confirmCheckoutSession(sessionId: string, accessToken: string) {
  const response = await billingFetch('/billing/confirm-checkout-session', {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: JSON.stringify({ sessionId }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(billingErrorMessage(body, 'Falha ao confirmar pagamento Stripe.'));
  }

  return body;
}

export async function getSubscriptionStatus(accessToken: string) {
  const response = await billingFetch('/billing/subscription-status', {
    method: 'GET',
    headers: gatewayJsonHeaders(accessToken),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(billingErrorMessage(body, 'Falha ao carregar assinatura.'));
  }

  return body;
}

export async function createPortalSession(accessToken: string) {
  const response = await billingFetch('/billing/create-portal-session', {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: JSON.stringify({}),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(billingErrorMessage(body, 'Falha ao abrir portal de cobrança.'));
  }

  return body as { portal_url: string };
}

export async function createAddonCheckoutSession(addonSlug: string, accessToken: string) {
  await assertBillingGatewayAvailable();

  const response = await billingFetch('/billing/create-addon-checkout-session', {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: JSON.stringify({ addonSlug }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(billingErrorMessage(body, 'Falha ao criar checkout da conta extra.'));
  }

  assertCheckoutUrl(body?.checkout_url);
  return body as { checkout_url: string; session_id: string };
}
