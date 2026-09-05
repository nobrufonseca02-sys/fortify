import { useEffect } from 'react';
import { pushDataLayerEvent } from '@/lib/analytics';
import { FeaturesSection, FinalCtaSection, LandingSubPage } from './landingSections';

export default function RecursosPage() {
  useEffect(() => {
    pushDataLayerEvent('view_landing_page', { page: 'recursos' });
  }, []);

  return (
    <LandingSubPage
      eyebrow="Recursos"
      title="O que o Fortify realmente monitora"
      description="Cada recurso abaixo existe hoje no produto — nada em roadmap."
    >
      <FeaturesSection />
      <FinalCtaSection />
    </LandingSubPage>
  );
}
