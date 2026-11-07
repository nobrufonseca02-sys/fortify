import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IDLE_LIMIT_MS,
  clearIdleActivity,
  isIdleExpired,
  lastActivityForSignIn,
  writeIdleActivity,
} from '@/lib/idleActivity';

const signOut = vi.fn(async () => ({ error: null }));
const authState = {
  session: { access_token: 'tok', user: { id: 'u1', last_sign_in_at: '2026-11-06T10:00:00Z' } } as any,
  signOut,
};

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));
const heartbeat = vi.fn(async (_token: string) => undefined);
vi.mock('@/lib/gateway', () => ({ sendPresenceHeartbeat: (token: string) => heartbeat(token) }));
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));

import { useIdleSession } from '@/hooks/useIdleSession';

describe('regras de inatividade', () => {
  it('expira com 30 min ou mais sem atividade', () => {
    expect(isIdleExpired(0, IDLE_LIMIT_MS - 1)).toBe(false);
    expect(isIdleExpired(0, IDLE_LIMIT_MS)).toBe(true);
  });

  it('ignora atividade registrada por outro login', () => {
    expect(lastActivityForSignIn({ signIn: 'antigo', at: 1 }, 'novo')).toBeNull();
    expect(lastActivityForSignIn({ signIn: 'novo', at: 5 }, 'novo')).toBe(5);
  });
});

describe('useIdleSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T12:00:00Z'));
    signOut.mockClear();
    heartbeat.mockClear();
    clearIdleActivity();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('manda heartbeat ao abrir e desloga após 30 min parado', () => {
    renderHook(() => useIdleSession());
    expect(heartbeat).toHaveBeenCalledWith('tok');
    expect(signOut).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(IDLE_LIMIT_MS + 30_000);
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('atividade do usuário adia o logout', () => {
    renderHook(() => useIdleSession());
    act(() => {
      vi.advanceTimersByTime(20 * 60_000);
      window.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(20 * 60_000);
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('desloga na hora quem volta depois de mais de 30 min fora', () => {
    writeIdleActivity({ signIn: '2026-11-06T10:00:00Z', at: Date.now() - IDLE_LIMIT_MS - 1 });
    renderHook(() => useIdleSession());
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('login novo não herda a inatividade da sessão anterior', () => {
    writeIdleActivity({ signIn: 'login-anterior', at: Date.now() - 2 * IDLE_LIMIT_MS });
    renderHook(() => useIdleSession());
    expect(signOut).not.toHaveBeenCalled();
  });
});
