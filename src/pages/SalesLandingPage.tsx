import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FortifyHero } from '@/components/landing/FortifyHero';
import { pushDataLayerEvent } from '@/lib/analytics';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support';

/**
 * Landing pública de aquisição (/vendas) — uma tela só, sem rolagem.
 *
 * As seções de conteúdo (como funciona, recursos, mesas + planos, FAQ) moraram
 * em páginas próprias sob src/pages/landing/, alcançadas pela LandingNav. Aqui
 * fica exclusivamente o hero.
 */
export default function SalesLandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    pushDataLayerEvent('view_sales_landing_page', {});
  }, []);

  // Página de anúncio: precisa ser clara e idêntica para todo visitante,
  // independente do tema salvo no app. Forçamos o tema claro enquanto ela está
  // montada e restauramos o anterior ao sair — sem tocar no localStorage, então
  // a preferência do usuário dentro do app continua intacta.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = 'light';
    return () => {
      if (previous) root.dataset.theme = previous;
      else delete root.dataset.theme;
    };
  }, []);

  const trackCta = (ctaId: string, destination: string) => {
    pushDataLayerEvent('cta_click', { cta_id: ctaId, cta_location: 'hero', destination });
  };

  return (
    <FortifyHero
      onPrimary={() => {
        trackCta('hero_primary', '/auth');
        navigate('/auth');
      }}
      onSecondary={() => {
        trackCta('hero_secondary', 'whatsapp_support');
        window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
      }}
    />
  );
}
