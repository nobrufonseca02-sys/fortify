/**
 * Configuração da página ponte /grupo-vip (campanha Meta Ads → grupo de WhatsApp).
 *
 * O link do grupo e o vídeo vêm de variáveis de ambiente para trocar sem
 * deploy de código quando o grupo lotar (limite do WhatsApp) ou o vídeo mudar.
 */

/** Link de convite do grupo. Defina VITE_WHATSAPP_VIP_GROUP_URL na Vercel. */
export const WHATSAPP_VIP_GROUP_URL =
  String(import.meta.env.VITE_WHATSAPP_VIP_GROUP_URL || '').trim() || 'https://chat.whatsapp.com/SEU_GRUPO';

/** Vídeo opcional do hero (mp4 público). Sem ele, a página mostra só a tela real do painel. */
export const GRUPO_VIP_VIDEO_URL = String(import.meta.env.VITE_GRUPO_VIP_VIDEO_URL || '').trim() || null;

/** Tela real do Fortify Guard aberto no MT5 (mesmo poster da página /fortify-guard). */
export const GRUPO_VIP_POSTER = '/videos/fortify-guard-instalar.jpg';

/** Fim da condição Black November: 30/11 às 23h59 no horário de Brasília. */
export const OFERTA_FIM = new Date('2026-11-30T23:59:59-03:00');

export function ofertaAtiva(agora: Date = new Date()) {
  return agora.getTime() <= OFERTA_FIM.getTime();
}

export const OFERTA = {
  precoDe: 'R$ 297',
  precoPor: 'R$ 97',
  prazoTexto: '30/11 às 23h59',
} as const;
