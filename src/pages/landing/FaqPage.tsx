import { useEffect } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { pushDataLayerEvent } from '@/lib/analytics';
import { FaqSection, FinalCtaSection, LandingSubPage } from './landingSections';

export default function FaqPage() {
  // Título, descrição e canônica próprios: sem isso as sete páginas do
  // site dividiam o mesmo título genérico, o que confunde o Google e
  // derruba o índice de qualidade de anúncio.
  useDocumentMeta({
    title: 'Perguntas frequentes — FORTIFY',
    description:
      'Como o Fortify trata suas credenciais MT5, quais mesas e plataformas são suportadas e o que fazer se a sua mesa não estiver no catálogo.',
    path: '/vendas/faq',
  });

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
