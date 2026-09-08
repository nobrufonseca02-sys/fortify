import { useEffect } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import PricingPage from '@/pages/PricingPage';
import { pushDataLayerEvent } from '@/lib/analytics';

/**
 * Planos (/vendas/planos) — a página de planos do site.
 *
 * Existe separada de /pricing por um motivo concreto: /pricing é a tela de
 * assinatura do produto e, com sessão ativa, é renderizada dentro do AppLayout.
 * Clicar em "Planos" no menu do site jogava o visitante logado para dentro do
 * Fortify. Aqui a casca pública é forçada, independente de sessão.
 *
 * A tela em si é a mesma (`variant="public"`), então os preços, os limites de
 * conta e os botões de checkout continuam vindo de um lugar só — duas cópias
 * divergiriam no primeiro reajuste.
 */
export default function PlanosPage() {
  // Título, descrição e canônica próprios: sem isso as sete páginas do
  // site dividiam o mesmo título genérico, o que confunde o Google e
  // derruba o índice de qualidade de anúncio.
  useDocumentMeta({
    title: 'Planos e preços — FORTIFY',
    description:
      'Escolha o plano pelo número de contas MT5 acompanhadas ao mesmo tempo. Todo plano inclui monitoramento de regras, alertas e painel de contas.',
    path: '/vendas/planos',
  });

  useEffect(() => {
    pushDataLayerEvent('view_landing_page', { page: 'planos' });
  }, []);

  return <PricingPage variant="public" />;
}
