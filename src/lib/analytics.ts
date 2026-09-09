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

/**
 * GA4 e Meta esperam a moeda em ISO 4217 MAIÚSCULO. A coluna `currency` da
 * tabela `plans` guarda no padrão da Stripe, que é minúsculo ("brl") — e o
 * valor ia cru para o dataLayer.
 */
function moedaNormalizada(moeda?: string | null) {
  return (moeda || 'BRL').toUpperCase();
}

/**
 * Janela de atribuição do primeiro toque, em dias.
 *
 * O primeiro toque vence — esse é o modelo. Mas ele não pode valer para
 * sempre: sem janela, quem chegou por uma campanha uma vez teria toda compra
 * futura atribuída a ela, e a medição de qualquer campanha nova nasceria
 * envenenada por tráfego antigo. 90 dias cobre com folga as janelas de
 * conversão do Meta (7 dias de clique) e do Google Ads (30 dias).
 */
const UTM_JANELA_DIAS = 90;

type AtribuicaoGuardada = { params: Record<string, string>; capturadoEm: number };

function lerAtribuicao(): AtribuicaoGuardada | null {
  if (typeof window === 'undefined') return null;
  try {
    const bruto = window.localStorage.getItem(UTM_STORAGE_KEY);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    // Registro antigo, sem data: não há como saber se ainda está na janela,
    // então trata como vencido e deixa o próximo toque recapturar.
    if (!dados || typeof dados.capturadoEm !== 'number' || !dados.params) return null;
    const idadeEmDias = (Date.now() - dados.capturadoEm) / 86_400_000;
    return idadeEmDias <= UTM_JANELA_DIAS ? (dados as AtribuicaoGuardada) : null;
  } catch {
    return null;
  }
}

/** Guarda os UTMs e ids de clique do primeiro toque, para atribuir os eventos de cadastro e compra. */
export function captureUtmParams() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) found[key] = value;
  }
  if (Object.keys(found).length === 0) return;
  // Primeiro toque vence, mas só dentro da janela: atribuição vencida é
  // substituída pelo toque atual.
  if (lerAtribuicao()) return;
  const registro: AtribuicaoGuardada = { params: found, capturadoEm: Date.now() };
  window.localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(registro));
}

function getStoredUtmParams(): Record<string, string> {
  return lerAtribuicao()?.params ?? {};
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

/**
 * Plano escolhido — o sinal de meio de funil.
 *
 * Existe porque o clique em "Assinar" de quem ainda não tem conta não gerava
 * evento nenhum: a pessoa era mandada para o cadastro e o funil ficava só com
 * PageView e, muito depois, Purchase. No começo de uma campanha a compra é
 * rara, então sem um evento no meio o pixel não tem em que otimizar.
 *
 * É um evento SEPARADO de `begin_checkout` de propósito. O begin_checkout
 * dispara quando a sessão da Stripe é criada de fato; reaproveitá-lo aqui
 * contaria duas vezes o mesmo passo e estragaria a taxa de conversão entre
 * as etapas. O funil fica: select_plan -> begin_checkout -> purchase.
 */
export function trackSelectPlan(params: {
  slug: string;
  name?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  /** Se a pessoa já tinha sessão no momento do clique. Separa quem vai para o
   *  cadastro de quem segue direto para o checkout. */
  autenticado: boolean;
}) {
  pushDataLayerEvent('select_plan', {
    autenticado: params.autenticado,
    ecommerce: {
      currency: moedaNormalizada(params.currency),
      value: centavosParaReais(params.priceCents),
      items: [{ item_id: params.slug, item_name: params.name || params.slug }],
    },
    ...getStoredUtmParams(),
  });
}

export function trackBeginCheckout(params: {
  slug: string;
  name?: string | null;
  priceCents?: number | null;
  currency?: string | null;
}) {
  pushDataLayerEvent('begin_checkout', {
    ecommerce: {
      currency: moedaNormalizada(params.currency),
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
      currency: moedaNormalizada(params.currency),
      value: centavosParaReais(params.valueCents),
      items: [{ item_id: params.planSlug, item_name: params.planSlug }],
    },
    ...getStoredUtmParams(),
  });
}
