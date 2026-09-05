import { useEffect } from 'react';
import { pushDataLayerEvent } from '@/lib/analytics';
import { CATALOG_FIRM_COUNT, FirmsSection, LandingSubPage } from './landingSections';

export default function MesasPage() {
  useEffect(() => {
    pushDataLayerEvent('view_landing_page', { page: 'mesas' });
  }, []);

  return (
    <LandingSubPage
      eyebrow="Catálogo auditado"
      title={`${CATALOG_FIRM_COUNT} mesas proprietárias já mapeadas`}
      description="Cada mesa na Biblioteca tem suas regras — perda diária, drawdown, consistência, dias mínimos — com a fonte oficial linkada. Sem mesa no catálogo, você ainda pode cadastrar a conta manualmente."
    >
      <FirmsSection />
    </LandingSubPage>
  );
}
