import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  checkSupabaseConnection,
  supabase,
  supabaseStartupConfig,
} from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000;

export type AuthStartupError = {
  code: "config_missing" | "timeout" | "unavailable";
  host: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: Session["user"] | null;
  loading: boolean;
  startupError: AuthStartupError | null;
  retryStartup: () => void;
  signOut: () => ReturnType<typeof supabase.auth.signOut>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function waitForAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const rejectForAbort = () => reject(new Error("supabase_connection_timeout"));

    if (signal.aborted) {
      rejectForAbort();
      return;
    }

    signal.addEventListener("abort", rejectForAbort, { once: true });
  });
}

function classifyStartupError(error: unknown, signal: AbortSignal): AuthStartupError {
  const message = error instanceof Error ? error.message : "";

  if (!supabaseStartupConfig.configured || message === "supabase_config_missing") {
    return { code: "config_missing", host: supabaseStartupConfig.host };
  }

  if (signal.aborted || message === "supabase_connection_timeout") {
    return { code: "timeout", host: supabaseStartupConfig.host };
  }

  return { code: "unavailable", host: supabaseStartupConfig.host };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState<AuthStartupError | null>(null);
  const [startupAttempt, setStartupAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), AUTH_BOOTSTRAP_TIMEOUT_MS);

    setLoading(true);
    setStartupError(null);

    const initializeAuth = async () => {
      try {
        await checkSupabaseConnection(controller.signal);

        if (!active) return;

        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!active) return;
          setSession(nextSession);
        });
        unsubscribe = () => data.subscription.unsubscribe();

        const result = await Promise.race([
          supabase.auth.getSession(),
          waitForAbort(controller.signal),
        ]);

        if (result.error) throw result.error;
        if (!active) return;

        setSession(result.data.session);
        setStartupError(null);
      } catch (error) {
        if (!active) return;
        setSession(null);
        setStartupError(classifyStartupError(error, controller.signal));
      } finally {
        window.clearTimeout(timeoutId);
        if (active) setLoading(false);
      }
    };

    void initializeAuth();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
      unsubscribe?.();
    };
  }, [startupAttempt]);

  const retryStartup = useCallback(() => {
    setStartupAttempt((current) => current + 1);
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      startupError,
      retryStartup,
      signOut,
    }),
    [session, loading, startupError, retryStartup, signOut],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
