import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setMarketingConsent, trackGrupoVipLead } from '@/lib/analytics';

/**
 * Lead da página /grupo-vip. É o evento em que a campanha do Meta otimiza:
 * contado a mais, o custo por lead parece menor do que é; contado a menos, o
 * algoritmo fica sem sinal.
 */

type Evento = { event: string; source?: string; cta_location?: string; event_id?: string; utm_source?: string };

function leads(): Evento[] {
  return ((window as unknown as { dataLayer?: Evento[] }).dataLayer || []).filter((e) => e && e.event === 'lead');
}

beforeEach(() => {
  window.dataLayer = [];
  window.sessionStorage.clear();
  window.localStorage.clear();
  delete window.fbq;
  delete window._fbq;
  document.head.querySelectorAll('script[src*="connect.facebook.net"]').forEach((s) => s.remove());
});

afterEach(() => {
  delete window.fbq;
});

describe('trackGrupoVipLead', () => {
  it('conta um lead só por sessão, mesmo com vários cliques', () => {
    trackGrupoVipLead('hero');
    trackGrupoVipLead('sticky_footer');
    trackGrupoVipLead('final');

    expect(leads()).toHaveLength(1);
    expect(leads()[0]).toMatchObject({ source: 'meta_ads_grupo_vip', cta_location: 'hero' });
  });

  it('manda o Lead ao pixel com o mesmo event_id do dataLayer, para o Meta deduplicar', () => {
    const fbq = vi.fn();
    window.fbq = fbq;

    trackGrupoVipLead('hero');

    const eventId = leads()[0].event_id;
    expect(eventId).toMatch(/^grupo_vip_/);
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', { content_name: 'grupo_vip_whatsapp' }, { eventID: eventId });
  });

  it('não quebra quando o pixel não está carregado (sem consentimento)', () => {
    expect(() => trackGrupoVipLead('hero')).not.toThrow();
    expect(leads()).toHaveLength(1);
  });
});

describe('Meta Pixel', () => {
  it('só carrega o pixel depois do consentimento', () => {
    setMarketingConsent(false);
    expect(window.fbq).toBeUndefined();

    setMarketingConsent(true);
    expect(typeof window.fbq).toBe('function');
    expect(document.head.querySelector('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).not.toBeNull();
  });

  it('não injeta o script duas vezes', () => {
    setMarketingConsent(true);
    setMarketingConsent(true);
    expect(document.head.querySelectorAll('script[src*="connect.facebook.net"]')).toHaveLength(1);
  });
});
