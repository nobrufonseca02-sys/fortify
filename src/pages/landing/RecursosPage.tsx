import { useEffect } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { pushDataLayerEvent } from '@/lib/analytics';
import { FeaturesSection, FinalCtaSection, LandingSubPage } from './landingSections';

export default function RecursosPage() {
  // Título, descrição e canônica próprios: sem isso as sete páginas do
  // site dividiam o mesmo título genérico, o que confunde o Google e
  // derruba o índice de qualidade de anúncio.
  useDocumentMeta({
    title: 'Recursos: o que o Fortify monitora — FORTIFY',
    description:
      'Perda diária, perda total, drawdown, consistência, lote e dias operados — cada regra com valor atual, limite e a folga que ainda resta.',
    path: '/vendas/recursos',
  });

  useEffect(() => {
    pushDataLayerEvent('view_landing_page', { page: 'recursos' });
  }, []);

  return (
    <LandingSubPage
      eyebrow="Recursos"
      title="O que o Fortify monitora"
      description="Recursos disponíveis hoje no produto."
    >
      <FeaturesSection />
      <FinalCtaSection />
    </LandingSubPage>
  );
}
