// Status do Fortify Guard (EA) numa conta, a partir de trading_accounts.ea_*.

/** Sem sinal do EA há mais que isso: o MT5 provavelmente está fechado. */
export const EA_CONNECTED_WINDOW_MS = 90_000;

export type EaStatusTone = 'ok' | 'wait' | 'off';

export function eaAccountStatus(
  account: { ea_status: string | null | undefined; ea_last_seen_at: string | null | undefined },
  now = Date.now(),
): { label: string; tone: EaStatusTone } {
  if (account.ea_status === 'pending') return { label: 'Aguardando o EA', tone: 'wait' };
  const seen = account.ea_last_seen_at ? Date.parse(account.ea_last_seen_at) : 0;
  if (seen && now - seen <= EA_CONNECTED_WINDOW_MS) return { label: 'Conectado', tone: 'ok' };
  return { label: 'EA desligado', tone: 'off' };
}
