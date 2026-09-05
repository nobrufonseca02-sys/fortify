import { useEffect } from 'react';
import { pushDataLayerEvent } from '@/lib/analytics';
import { FaqSection, FinalCtaSection, LandingSubPage } from './landingSections';

export default function FaqPage() {
  useEffect(() => {
    pushDataLayerEvent('view_landing_page', { page: 'faq' });
  }, []);

  return (
    <LandingSubPage eyebrow="Perguntas frequentes" title="Antes de conectar sua conta">
      <FaqSection />
      <FinalCtaSection />
    </LandingSubPage>
  );
}
