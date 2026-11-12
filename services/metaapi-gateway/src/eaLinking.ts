// Regras do Fortify Guard para ligar um login MT5 a uma conta do Fortify e para
// contar quantas contas o trader já ocupa no plano. Funções puras: o gateway
// (na conexão do EA) e o site (na Biblioteca) usam as mesmas regras.

/** Conta criada pela Biblioteca que ainda espera o EA conectar. */
export type PendingCandidate = {
  id: string;
  prop_firm?: string | null;
  start_balance?: number | string | null;
  created_at?: string | null;
};

/** O que o EA informa do terminal onde está rodando. */
export type TerminalInfo = { balance: number; server?: string | null; broker?: string | null };

export type PickResult =
  | { kind: 'none' }
  | { kind: 'pick'; id: string }
  | { kind: 'ambiguous'; count: number };

/** Diferença máxima entre o saldo do MT5 e o tamanho da conta para considerar o mesmo modelo. */
export const SIZE_TOLERANCE = 0.1;

function normalize(text: string | null | undefined) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** O nome da mesa aparece no servidor ou na corretora do MT5 (ex.: "FTMO-Demo")? */
export function firmMatchesTerminal(firm: string | null | undefined, terminal: TerminalInfo): boolean {
  const firmKey = normalize(firm);
  if (firmKey.length < 3) return false;
  const terminalKey = normalize(`${terminal.server ?? ''} ${terminal.broker ?? ''}`);
  return terminalKey.includes(firmKey);
}

function startBalance(candidate: PendingCandidate) {
  const value = Number(candidate.start_balance);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Qual conta aguardando o EA é este terminal?
 *
 * - Uma só aguardando: é ela (o trader acabou de criar).
 * - Várias: fica com as da mesa que aparece no servidor/corretora do MT5, se
 *   houver; entre elas, a de tamanho mais próximo do saldo (até 10%).
 * - Se ainda houver empate (duas contas do mesmo tamanho, mesa não
 *   identificada), não chuta: o trader informa o login no site. Ligar a conta
 *   errada mostraria limites de outra mesa sem aviso.
 */
export function pickPendingAccount(candidates: PendingCandidate[], terminal: TerminalInfo): PickResult {
  if (candidates.length === 0) return { kind: 'none' };
  if (candidates.length === 1) return { kind: 'pick', id: candidates[0].id };

  const sameFirm = candidates.filter((candidate) => firmMatchesTerminal(candidate.prop_firm, terminal));
  const pool = sameFirm.length > 0 ? sameFirm : candidates;
  if (pool.length === 1) return { kind: 'pick', id: pool[0].id };

  const balance = Number(terminal.balance);
  if (!Number.isFinite(balance) || balance <= 0) return { kind: 'ambiguous', count: pool.length };

  const scored = pool
    .map((candidate) => {
      const size = startBalance(candidate);
      return { candidate, distance: size ? Math.abs(balance - size) / size : Number.POSITIVE_INFINITY };
    })
    .filter((item) => item.distance <= SIZE_TOLERANCE)
    .sort((a, b) => a.distance - b.distance);

  if (scored.length === 0) return { kind: 'ambiguous', count: pool.length };
  if (scored.length > 1 && Math.abs(scored[1].distance - scored[0].distance) < 1e-9) {
    return { kind: 'ambiguous', count: pool.length };
  }
  return { kind: 'pick', id: scored[0].candidate.id };
}

/** Conta do trader, como o limite de contas enxerga. */
export type SlotAccount = { id: string; status?: string | null; ea_status?: string | null };

/**
 * Quantas contas ocupam vaga no plano.
 *
 * Ocupa vaga: conta não arquivada ligada ao EA, ou com conexão ativa (MetaApi
 * antiga). Com `includePending`, as que aguardam o EA também contam: é assim na
 * Biblioteca, para o trader não criar mais contas do que pode monitorar. Na
 * conexão do EA elas não contam, senão uma conta a mais criada por engano
 * travaria a primeira.
 */
export function countAccountSlots(
  accounts: SlotAccount[],
  activeConnectionAccountIds: Iterable<string>,
  options: { includePending: boolean; excludeId?: string | null },
): number {
  const connected = new Set(activeConnectionAccountIds);
  let count = 0;
  for (const account of accounts) {
    if (account.id === options.excludeId) continue;
    if (String(account.status ?? '').toLowerCase() === 'archived') continue;
    const linked = account.ea_status === 'linked' || connected.has(account.id);
    const pending = account.ea_status === 'pending';
    if (linked || (options.includePending && pending)) count++;
  }
  return count;
}

export function accountLimitMessage(limit: number) {
  const contas = limit === 1 ? '1 conta' : `${limit} contas`;
  return `Seu plano permite ${contas}, e todas já estão em uso. Faça upgrade ou arquive uma conta no Fortify para monitorar esta.`;
}

export function ambiguousAccountMessage(login: string) {
  return `Há mais de uma conta aguardando o EA. No Fortify Guard do site, informe o login ${login} na conta certa.`;
}
