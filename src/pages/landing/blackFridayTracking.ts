import { pushDataLayerEvent, trackGrupoVipLead } from '@/lib/analytics';

/**
 * Eventos da página /black-friday, pelo mesmo pixel e o mesmo dataLayer de
 * src/lib/analytics.ts (o pixel só existe depois do consentimento de marketing).
 */

const CHECKOUT_BLACK_FRIDAY_KEY = 'fortify_checkout_black_friday';

/** Valor da oferta em reais, como o Meta e o GA4 esperam. */
const VALOR_REAIS = 197;
const ITEM_ID = 'fortify_guard_vitalicio_black_friday';

/**
 * InitiateCheckout: clique em "Garantir acesso vitalício por R$197".
 *
 * Conta UMA vez por sessão, pelo mesmo motivo do Lead do grupo: quem toca no
 * botão do topo e depois no do fim é a mesma pessoa. O `event_id` vai no
 * dataLayer e no fbq para o Meta deduplicar se uma tag do GTM também disparar.
 */
export function trackBlackFridayCheckout(ctaLocation: string) {
  if (typeof window === 'undefined') return;

  let jaContou = false;
  try {
    jaContou = window.sessionStorage.getItem(CHECKOUT_BLACK_FRIDAY_KEY) !== null;
    if (!jaContou) window.sessionStorage.setItem(CHECKOUT_BLACK_FRIDAY_KEY, String(Date.now()));
  } catch {
    // Navegador interno sem sessionStorage: segue contando, melhor que perder o sinal.
  }
  if (jaContou) return;

  const eventId = `bf_checkout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  pushDataLayerEvent('begin_checkout', {
    source: 'meta_ads_black_friday',
    cta_location: ctaLocation,
    event_id: eventId,
    ecommerce: {
      currency: 'BRL',
      value: VALOR_REAIS,
      items: [{ item_id: ITEM_ID, item_name: 'Fortify Guard Vitalício (Black Friday)' }],
    },
  });

  if (typeof window.fbq === 'function') {
    window.fbq(
      'track',
      'InitiateCheckout',
      { value: VALOR_REAIS, currency: 'BRL', content_ids: [ITEM_ID], content_type: 'product', num_items: 1 },
      { eventID: eventId },
    );
  }
}

/** Lead: clique para entrar no grupo VIP, o mesmo evento da página /grupo-vip. */
export function trackBlackFridayLead(ctaLocation: string) {
  trackGrupoVipLead(`black_friday_${ctaLocation}`);
}
