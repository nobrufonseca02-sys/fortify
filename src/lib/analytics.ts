const CONSENT_STORAGE_KEY = 'fortify_marketing_consent';
const UTM_STORAGE_KEY = 'fortify_utm_params';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function hasMarketingConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted';
}

export function hasStoredConsentChoice(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(CONSENT_STORAGE_KEY) !== null;
}

export function setMarketingConsent(granted: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, granted ? 'granted' : 'denied');
  const state = granted ? 'granted' : 'denied';
  gtag('consent', 'update', {
    ad_storage: state,
    analytics_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  });
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'] as const;

/** Captures first-touch UTM/click params on landing and persists them for later attribution on sign_up/purchase events. */
export function captureUtmParams() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) found[key] = value;
  }
  if (Object.keys(found).length === 0) return;
  // First touch wins -- don't overwrite an existing stored attribution.
  if (window.localStorage.getItem(UTM_STORAGE_KEY)) return;
  window.localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(found));
}

function getStoredUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function pushDataLayerEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

export function trackSignUp() {
  pushDataLayerEvent('sign_up', { ...getStoredUtmParams() });
}

/**
 * O valor vai em CENTAVOS e é convertido aqui, uma vez só.
 *
 * A tabela `plans` guarda preço em centavos (R$97 = 9700). Antes estes
 * eventos repassavam o número cru, então o GA4 e o Meta recebiam 9700 como
 * se fossem reais — ROAS inflado em 100x no primeiro dia de otimização por
 * valor, e toda decisão de escala tomada em cima de um número errado. O
 * lado servidor (webhook da Stripe) já dividia certo; só o cliente não.
 *
 * O parâmetro se chama `priceCents` de propósito: a ambiguidade do nome
 * antigo (`price`) foi o que deixou o erro passar.
 */
function centavosParaReais(centavos?: number | null) {
  return typeof centavos === 'number' ? centavos / 100 : undefined;
}

export function trackBeginCheckout(params: {
  slug: string;
  name?: string | null;
  priceCents?: number | null;
  currency?: string | null;
}) {
  pushDataLayerEvent('begin_checkout', {
    ecommerce: {
      currency: params.currency || 'BRL',
      value: centavosParaReais(params.priceCents),
      items: [{ item_id: params.slug, item_name: params.name || params.slug }],
    },
    ...getStoredUtmParams(),
  });
}

export function trackPurchase(params: {
  transactionId: string;
  /** Em centavos, como vem da tabela `plans`. Convertido para reais aqui. */
  valueCents?: number | null;
  currency?: string | null;
  planSlug: string;
}) {
  pushDataLayerEvent('purchase', {
    ecommerce: {
      transaction_id: params.transactionId,
      currency: params.currency || 'BRL',
      value: centavosParaReais(params.valueCents),
      items: [{ item_id: params.planSlug, item_name: params.planSlug }],
    },
    ...getStoredUtmParams(),
  });
}
