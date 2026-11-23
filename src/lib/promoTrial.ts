// Link da campanha do teste grátis (/cadastro?promo=guard3d ou /auth?intent=signup&promo=guard3d).
// O código fica guardado no navegador até a pessoa entrar logada; aí o app pede o trial ao gateway,
// que decide quem tem direito. Guardado em localStorage (não sessionStorage) porque a confirmação
// de e-mail do cadastro costuma abrir em outra aba.

const STORAGE_KEY = 'fortify_promo_trial';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Códigos de campanha aceitos pelo site. A elegibilidade de verdade é checada no gateway. */
export const PROMO_TRIAL_CODES = ['guard3d'] as const;

export function normalizePromoCode(raw: unknown) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);
}

export function capturePromoFromSearch(search: string) {
  const code = normalizePromoCode(new URLSearchParams(search).get('promo'));
  if (!code || !(PROMO_TRIAL_CODES as readonly string[]).includes(code)) return null;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, savedAt: Date.now() }));
  } catch {
    // Sem armazenamento (aba anônima bloqueada): o trial só não é pedido automaticamente.
  }
  return code;
}

export function readPendingPromo(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string; savedAt?: number };
    if (!parsed?.code || !parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return normalizePromoCode(parsed.code);
  } catch {
    return null;
  }
}

export function clearPendingPromo() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada a fazer
  }
}

interface TrialLike {
  plan_id?: string | null;
  status?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
}

/** Assinatura que veio do teste grátis da campanha (nunca passou pela Stripe). */
export function isPromoTrialSubscription(subscription: TrialLike | null | undefined) {
  return Boolean(
    subscription &&
      String(subscription.status || '').toLowerCase() === 'trialing' &&
      !subscription.stripe_subscription_id &&
      String(subscription.plan_id || '').toLowerCase() === 'beginner_monthly',
  );
}

export function trialMsLeft(subscription: TrialLike | null | undefined, now = Date.now()) {
  const end = Date.parse(String(subscription?.current_period_end || ''));
  return Number.isFinite(end) ? end - now : 0;
}
