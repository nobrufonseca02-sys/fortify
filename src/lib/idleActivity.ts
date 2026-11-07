export const IDLE_LIMIT_MS = 30 * 60_000;
export const PRESENCE_HEARTBEAT_MS = 5 * 60_000;

const STORAGE_KEY = 'fortify:last-activity';

// Guardado em localStorage para valer entre abas e sobreviver ao fechamento
// do navegador. `signIn` amarra o registro ao login atual: depois de um login
// novo, a atividade antiga de outra sessão não pode derrubar o usuário.
export type IdleActivityRecord = { signIn: string; at: number };

export function readIdleActivity(): IdleActivityRecord | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && typeof parsed.signIn === 'string' && Number.isFinite(parsed.at)) return parsed;
  } catch {
    // storage indisponível ou corrompido: trata como sem registro
  }
  return null;
}

export function writeIdleActivity(record: IdleActivityRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // modo privado / storage bloqueado: o timer em memória segue valendo
  }
}

export function clearIdleActivity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem
  }
}

/** Última atividade registrada para este login; null quando o registro é de outro login. */
export function lastActivityForSignIn(record: IdleActivityRecord | null, signIn: string): number | null {
  return record && record.signIn === signIn ? record.at : null;
}

export function isIdleExpired(lastActivityMs: number, nowMs: number, limitMs = IDLE_LIMIT_MS): boolean {
  return nowMs - lastActivityMs >= limitMs;
}
