import { useEffect } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useNavigate } from 'react-router-dom';
import { FortifyHero } from '@/components/landing/FortifyHero';
import { AUTH_SIGNUP_PATH, trackCta, useForcedLightTheme } from '@/components/landing/PublicShell';
import { pushDataLayerEvent } from '@/lib/analytics';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support';

/**
 * Landing pública de aquisição (/vendas) — uma tela só, sem rolagem.
 *
 * O conteúdo (como usar, recursos, mesas, planos, quem somos, FAQ) mora em
 * páginas próprias sob src/pages/landing/, alcançadas pelos botões da
 * LandingNav. Aqui fica exclusivamente o hero: nada de seção empilhada
 * abaixo, para a primeira tela não ter rolagem.
 */
export default function SalesLandingPage() {
  const navigate = useNavigate();

  // Título, descrição e canônica próprios: sem isso as sete páginas do
  // site dividiam o mesmo título genérico, o que confunde o Google e
  // derruba o índice de qualidade de anúncio.
  useDocumentMeta({
    title: 'Fortify | controle de risco para contas de mesa proprietária',
    description:
      'Monitore perda diária, drawdown e consistência das regras da sua mesa proprietária em contas MT5, com alerta antes de a violação acontecer.',
    path: '/vendas',
  });

  useEffect(() => {
    pushDataLayerEvent('view_sales_landing_page', {});
  }, []);

  // Página de anúncio: precisa ser idêntica para todo visitante, independente
  // do tema salvo no app. Restaura o anterior ao sair, sem tocar no localStorage.
  useForcedLightTheme();

  return (
    <FortifyHero
      onPrimary={() => {
        trackCta('hero_primary', 'hero', AUTH_SIGNUP_PATH);
        navigate(AUTH_SIGNUP_PATH);
      }}
      onSecondary={() => {
        trackCta('hero_secondary', 'hero', 'whatsapp_support');
        window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
      }}
    />
  );
}
