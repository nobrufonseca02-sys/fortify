import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import BlackFridayPage from '../pages/landing/BlackFridayPage';
import { BF_CHECKOUT_URL, BF_FIM } from '@/content/blackFriday';
import { WHATSAPP_VIP_GROUP_URL } from '@/content/grupoVip';

/**
 * Página /black-friday da campanha do Meta Ads. Os testes guardam o que custa
 * dinheiro se quebrar: o link de pagamento certo (com os UTMs que a Stripe
 * aceita), o link do grupo, o botão de pagamento sumindo no prazo real e o
 * atalho /bf usado nos anúncios.
 */

// A rota /bf é decidida dentro do App, que monta o AuthProvider. A página de
// campanha não usa sessão; aqui só interessa não tocar no Supabase.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, session: null, loading: false, startupError: null, retryStartup: () => {} }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const DURANTE_A_OFERTA = new Date('2026-11-26T12:00:00-03:00');
const PAGAR = 'Garantir acesso vitalício por R$197';
const GRUPO = 'Entrar no grupo VIP';

type Evento = { event: string; event_id?: string; cta_location?: string };

function eventos(nome: string): Evento[] {
  return ((window as unknown as { dataLayer?: Evento[] }).dataLayer || []).filter((e) => e && e.event === nome);
}

/** Clique sem a navegação do jsdom (que não sai da página e só polui o log). */
function clicarSemNavegar(link: HTMLElement) {
  const impedir = (event: Event) => event.preventDefault();
  link.addEventListener('click', impedir);
  fireEvent.click(link);
  link.removeEventListener('click', impedir);
}

beforeEach(() => {
  vi.setSystemTime(DURANTE_A_OFERTA);
  window.dataLayer = [];
  window.sessionStorage.clear();
  window.localStorage.clear();
  delete window.fbq;
  window.history.replaceState(
    {},
    '',
    '/black-friday?utm_source=meta&utm_medium=paid&utm_campaign=black-friday-vitalicio&utm_content=An%C3%BAncio%201&fbclid=abc123',
  );
});

afterEach(() => {
  vi.useRealTimers();
  delete window.fbq;
  window.history.replaceState({}, '', '/');
});

describe('página /black-friday', () => {
  it('mostra os dois botões no topo e no fim, cada um com o link certo', () => {
    render(<BlackFridayPage />);

    const pagamento = screen.getAllByRole('link', { name: PAGAR });
    expect(pagamento).toHaveLength(2);
    for (const link of pagamento) {
      const url = new URL(link.getAttribute('href') || '');
      expect(`${url.origin}${url.pathname}`).toBe(BF_CHECKOUT_URL);
      // utm_content com espaço e acento a Stripe descartaria; fbclid ela não aceita.
      expect(Object.fromEntries(url.searchParams)).toEqual({
        utm_source: 'meta',
        utm_medium: 'paid',
        utm_campaign: 'black-friday-vitalicio',
      });
    }

    const grupo = screen.getAllByRole('link', { name: GRUPO });
    expect(grupo).toHaveLength(2);
    for (const link of grupo) expect(link).toHaveAttribute('href', WHATSAPP_VIP_GROUP_URL);
  });

  it('sem UTM na URL, o botão leva ao link da Stripe sem parâmetro nenhum', () => {
    window.history.replaceState({}, '', '/black-friday');
    render(<BlackFridayPage />);

    for (const link of screen.getAllByRole('link', { name: PAGAR })) {
      expect(link).toHaveAttribute('href', BF_CHECKOUT_URL);
    }
  });

  it('mostra a contagem regressiva até o prazo real', () => {
    render(<BlackFridayPage />);
    // 26/11 12h00 até 27/11 23h59min59s: 1 dia, 11 horas, 59 minutos e 59 segundos.
    expect(screen.getByRole('timer')).toHaveAccessibleName('Faltam 1 dia, 11 horas, 59 minutos e 59 segundos');
  });

  it('depois do BF_FIM, o botão de pagamento some e o do grupo continua', () => {
    vi.setSystemTime(new Date(BF_FIM.getTime() + 1000));
    render(<BlackFridayPage />);

    expect(screen.queryAllByRole('link', { name: PAGAR })).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1, name: 'Oferta de Black Friday encerrada' })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: GRUPO })).toHaveLength(2);
  });

  it('troca sozinha quando o prazo passa com a página aberta', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(BF_FIM.getTime() - 1500));
    render(<BlackFridayPage />);
    expect(screen.getAllByRole('link', { name: PAGAR })).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryAllByRole('link', { name: PAGAR })).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1, name: 'Oferta de Black Friday encerrada' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: GRUPO })).toHaveLength(2);
  });
});

describe('pixel da Meta na /black-friday', () => {
  it('InitiateCheckout no clique do pagamento, uma vez por sessão, com o mesmo event_id do dataLayer', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    render(<BlackFridayPage />);

    const [topo, fim] = screen.getAllByRole('link', { name: PAGAR });
    clicarSemNavegar(topo);
    clicarSemNavegar(fim);

    const checkouts = fbq.mock.calls.filter((chamada) => chamada[1] === 'InitiateCheckout');
    expect(checkouts).toHaveLength(1);
    expect(checkouts[0][2]).toMatchObject({ value: 197, currency: 'BRL' });
    const eventId = eventos('begin_checkout')[0].event_id;
    expect(eventId).toMatch(/^bf_checkout_/);
    expect(checkouts[0][3]).toEqual({ eventID: eventId });
    expect(eventos('begin_checkout')).toHaveLength(1);
  });

  it('Lead no clique do grupo, como na /grupo-vip', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    render(<BlackFridayPage />);

    clicarSemNavegar(screen.getAllByRole('link', { name: GRUPO })[0]);

    const lead = eventos('lead')[0];
    expect(lead).toMatchObject({ cta_location: 'black_friday_topo' });
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', { content_name: 'grupo_vip_whatsapp' }, { eventID: lead.event_id });
  });
});

describe('rota /bf', () => {
  it('leva para /black-friday e preserva a query string', async () => {
    window.history.replaceState({}, '', '/bf?utm_source=meta&utm_medium=paid&utm_campaign=black-friday-vitalicio');
    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fortify Guard vitalício por R$ 197' }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/black-friday');
    expect(window.location.search).toBe('?utm_source=meta&utm_medium=paid&utm_campaign=black-friday-vitalicio');
  });
});
