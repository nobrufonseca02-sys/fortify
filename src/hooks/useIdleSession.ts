import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { sendPresenceHeartbeat } from '@/lib/gateway';
import {
  PRESENCE_HEARTBEAT_MS,
  isIdleExpired,
  lastActivityForSignIn,
  readIdleActivity,
  writeIdleActivity,
} from '@/lib/idleActivity';

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
const CHECK_EVERY_MS = 30_000;
const PERSIST_EVERY_MS = 15_000;

/**
 * Encerra a sessão após 30 min sem interação e, enquanto o usuário está
 * ativo, avisa o gateway (heartbeat) para manter as contas MT5 implantadas.
 * O logout passa pelo signOut do useAuth, que pausa as contas na MetaApi.
 */
export function useIdleSession() {
  const { session, signOut } = useAuth();
  const tokenRef = useRef(session?.access_token);
  tokenRef.current = session?.access_token;

  const userId = session?.user?.id;
  const signIn = session?.user?.last_sign_in_at || userId || '';

  useEffect(() => {
    if (!userId) return;

    let expired = false;
    let lastLocal = Date.now();
    let lastPersisted = 0;
    let lastBeat = 0;

    const lastActivity = () => Math.max(lastLocal, lastActivityForSignIn(readIdleActivity(), signIn) ?? 0);

    const expire = () => {
      if (expired) return;
      expired = true;
      toast.info('Sessão encerrada por inatividade', {
        description: 'Você ficou 30 minutos sem usar o Fortify. Entre de novo para continuar.',
      });
      void signOut();
    };

    const beat = () => {
      const token = tokenRef.current;
      if (!token) return;
      lastBeat = Date.now();
      void sendPresenceHeartbeat(token);
    };

    // Voltou depois de fechar a aba/o notebook por mais de 30 min: encerra já.
    const stored = lastActivityForSignIn(readIdleActivity(), signIn);
    if (stored !== null && isIdleExpired(stored, Date.now())) {
      expire();
      return;
    }

    const persist = (at: number) => {
      lastPersisted = at;
      writeIdleActivity({ signIn, at });
    };
    persist(Date.now());
    beat();

    const onActivity = () => {
      const now = Date.now();
      lastLocal = now;
      if (now - lastPersisted >= PERSIST_EVERY_MS) persist(now);
    };

    const check = () => {
      const now = Date.now();
      const last = lastActivity();
      if (isIdleExpired(last, now)) {
        expire();
        return;
      }
      const recentlyActive = now - last < PRESENCE_HEARTBEAT_MS;
      if (document.visibilityState === 'visible' && recentlyActive && now - lastBeat >= PRESENCE_HEARTBEAT_MS) beat();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };

    // capture: o painel rola dentro de <main overflow-auto>, e scroll não borbulha.
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(check, CHECK_EVERY_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity, { capture: true }));
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [userId, signIn, signOut]);
}
