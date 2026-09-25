import { useEffect } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { pushDataLayerEvent } from '@/lib/analytics';
import { CinematicPage } from '@/components/landing/cinematic/CinematicPage';
import { CinematicHero } from '@/components/landing/cinematic/CinematicHero';
import { ProductSections } from '@/components/landing/cinematic/ProductSections';
import { FeedbackCarousel } from '@/components/landing/cinematic/FeedbackCarousel';
import { FinalCta } from '@/components/landing/cinematic/FinalCta';

/**
 * Landing pública de aquisição (/vendas). As páginas internas (como usar,
 * recursos, mesas, planos, quem somos, FAQ) continuam em src/pages/landing/.
 */
export default function SalesLandingPage() {
  useDocumentMeta({
    title: 'Fortify | controle de risco para contas de mesa proprietária',
    description:
      'Monitore perda diária, drawdown e consistência das regras da sua mesa proprietária em contas MT5, com alerta antes de a violação acontecer.',
    path: '/vendas',
  });

  useEffect(() => {
    pushDataLayerEvent('view_sales_landing_page', {});
  }, []);

  return (
    <CinematicPage checkoutLinkInFooter>
      <CinematicHero />
      <ProductSections />
      <FeedbackCarousel />
      <FinalCta />
    </CinematicPage>
  );
}
