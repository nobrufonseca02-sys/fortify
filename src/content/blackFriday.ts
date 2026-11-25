/**
 * Configuração da página /black-friday (campanha Meta Ads da Black Friday:
 * Fortify Guard vitalício por R$ 197, pagamento único).
 *
 * A página /grupo-vip continua no ar com a condição dela (OFERTA_FIM em
 * grupoVip.ts) e nada daqui mexe nela. O link do grupo é o mesmo
 * WHATSAPP_VIP_GROUP_URL, importado de grupoVip.ts pela página.
 */

/** Fim real da oferta: 27/11/2026 às 23h59 no horário de Brasília. */
export const BF_FIM = new Date('2026-11-27T23:59:59-03:00');

export function bfAtiva(agora: number = Date.now()) {
  return agora <= BF_FIM.getTime();
}

/**
 * Link de pagamento da Stripe: R$ 197,00, pagamento único, cartão ou Pix.
 * A Stripe NÃO desliga o link sozinha no fim da oferta. A página esconde o
 * botão depois do prazo, mas o link continua aceitando pagamento até ser
 * desativado no painel da Stripe.
 */
export const BF_CHECKOUT_URL = 'https://buy.stripe.com/14A5kwcQvbti5LjgTcaMU04';

/** Vídeo e capa do anúncio, servidos de public/videos. */
export const BF_VIDEO_URL = '/videos/FORTIFY_BlackFriday_web.mp4';
export const BF_POSTER = '/videos/FORTIFY_BlackFriday_poster.jpg';

export const BF_OFERTA = {
  preco: 'R$ 197',
  prazoTexto: '27/11 às 23h59',
  /** Versão curta para a barra do topo caber em uma linha no celular. */
  prazoCurto: '27/11, 23h59',
} as const;

/** O que a oferta inclui. Só fatos do produto e do pagamento, sem promessa de resultado. */
export const BF_INCLUI = [
  'Plano Beginner',
  '1 conta MT5',
  'Fortify Guard no MT5',
  'Pagamento único',
  'Acesso vitalício',
  'Cartão ou Pix',
  'Acesso liberado em até 12 h no mesmo e-mail do pagamento',
] as const;

/**
 * UTMs que a Stripe aceita no link de pagamento (docs.stripe.com/payment-links/url-parameters).
 * gclid, fbclid e qualquer outro parâmetro ficam de fora.
 */
const UTM_ACEITOS_PELA_STRIPE = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/** A Stripe descarta valores fora deste formato; aqui eles nem chegam a ser enviados. */
const VALOR_UTM_ACEITO = /^[A-Za-z0-9_-]{1,150}$/;

/** Link de pagamento com os utm_* da URL da página repassados. */
export function bfCheckoutUrl(search = '') {
  const origem = new URLSearchParams(search);
  const destino = new URL(BF_CHECKOUT_URL);
  for (const chave of UTM_ACEITOS_PELA_STRIPE) {
    const valor = origem.get(chave);
    if (valor && VALOR_UTM_ACEITO.test(valor)) destino.searchParams.set(chave, valor);
  }
  return destino.toString();
}

/** Quanto falta até BF_FIM, em partes inteiras (zero depois do prazo). */
export function bfTempoRestante(agora: number = Date.now()) {
  const totalSegundos = Math.max(0, Math.floor((BF_FIM.getTime() - agora) / 1000));
  return {
    dias: Math.floor(totalSegundos / 86_400),
    horas: Math.floor((totalSegundos % 86_400) / 3_600),
    minutos: Math.floor((totalSegundos % 3_600) / 60),
    segundos: totalSegundos % 60,
  };
}
