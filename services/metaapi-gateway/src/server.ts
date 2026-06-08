import Fastify, { type FastifyRequest } from 'fastify';
import dotenv from 'dotenv';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';
import { createClient } from '@supabase/supabase-js';
import cors from '@fastify/cors';

const gatewayEnvPath = path.resolve(__dirname, '../.env');
const gatewayEnvResult = dotenv.config({ path: gatewayEnvPath, override: true });

const fastify = Fastify({ logger: true });
const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:8080,http://localhost:8081,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

fastify.register(cors, {
  origin: corsAllowedOrigins,
  credentials: true,
});

fastify.addHook('preParsing', (request, _reply, payload, done) => {
  const pathname = request.url.split('?')[0];
  if (pathname !== '/billing/webhook') {
    done(null, payload);
    return;
  }

  const chunks: Buffer[] = [];
  payload.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  payload.on('end', () => {
    const rawBody = Buffer.concat(chunks);
    (request as any).rawBody = rawBody;
    done(null, Readable.from(rawBody));
  });
  payload.on('error', (error) => done(error));
});

const PORT = Number(process.env.PORT || 3001);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN!;
const METAAPI_REGION = process.env.METAAPI_REGION || 'new-york';
const METAAPI_PROVISIONING_MAX_ATTEMPTS = Number(process.env.METAAPI_PROVISIONING_MAX_ATTEMPTS || 4);
const METAAPI_PROVISIONING_MAX_WAIT_MS = Number(process.env.METAAPI_PROVISIONING_MAX_WAIT_MS || 30000);
const FORTIFY_ALLOW_BETA_FALLBACK = process.env.FORTIFY_ALLOW_BETA_FALLBACK === 'true';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || 'http://localhost:8081/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}';
const STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL || 'http://localhost:8081/pricing?checkout=cancel';
const STRIPE_CUSTOMER_PORTAL_RETURN_URL = process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL || 'http://localhost:8081/settings';
const STRIPE_API_BASE_URL = 'https://api.stripe.com/v1';
const OWNER_ADMIN_EMAIL = 'nobrufonseca01@hotmail.com';

if (!SUPABASE_URL) {
  throw new Error('Missing required environment variable: SUPABASE_URL');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
}
if (!METAAPI_TOKEN) {
  throw new Error('Missing required environment variable: METAAPI_TOKEN');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const provisioningBaseUrl = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';
const clientBaseUrl = `https://mt-client-api-v1.${METAAPI_REGION}.agiliumtrade.ai`;

fastify.log.info({
  event: 'metaapi_gateway_env_loaded',
  envPath: gatewayEnvPath,
  envExists: existsSync(gatewayEnvPath),
  envLoaded: !gatewayEnvResult.error,
  envError: gatewayEnvResult.error?.message,
  metaapiTokenPresent: !!METAAPI_TOKEN,
  metaapiTokenLength: METAAPI_TOKEN.length,
  metaapiRegion: METAAPI_REGION,
  betaFallbackEnabled: FORTIFY_ALLOW_BETA_FALLBACK,
  stripeConfigured: !!STRIPE_SECRET_KEY,
  stripeWebhookConfigured: !!STRIPE_WEBHOOK_SECRET,
  supabaseUrlHost: hostOnly(SUPABASE_URL),
  port: PORT,
});

type JsonRecord = Record<string, any>;

type MetaApiProvisioningAccount = JsonRecord & {
  id?: string;
  _id?: string;
  login?: string | number;
  server?: string;
  region?: string;
  state?: string;
  connectionStatus?: string;
};

type ProvisioningFailure = {
  code:
    | 'invalid_metaapi_token'
    | 'metaapi_permission_denied'
    | 'wrong_mt5_server'
    | 'wrong_mt5_credentials'
    | 'metaapi_provisioning_pending'
    | 'metaapi_provisioning_failed';
  error: string;
  httpStatus: number;
};

type RuleEvaluationStatus = 'APPROVING' | 'WARNING' | 'VIOLATED' | 'NOT_MET';
type ComputationWindow = 'daily' | 'total' | 'phase' | 'payoutWindow';

type RuleEvaluationResult = {
  status: RuleEvaluationStatus;
  current_value: number | null;
  limit_value: number | null;
  remaining_value?: number | null;
  progress_pct: number | null;
  message: string;
  explanation?: string;
  recommended_action?: string;
  severity?: string;
  next_best_action?: string;
  data_status?: 'ok' | 'insufficient_data' | 'pending';
  computation_window: ComputationWindow;
  reference_date: string | null;
};

type RuleDefinition = {
  id: string;
  key: string;
  name: string;
  category: string | null;
};

type RuleInstance = {
  id: string;
  rule_set_version_id: string;
  mode: 'percent' | 'value';
  base_calculation: string | null;
  includes_floating: boolean;
  daily_reset: boolean;
  limit_value: number;
  severity: string;
  enabled: boolean;
  params: JsonRecord | null;
  rule_definitions: RuleDefinition | null;
};

type TradingAccount = {
  id: string;
  user_id: string;
  rule_set_id: string | null;
  start_balance: number;
  current_balance: number;
  current_equity: number;
  highest_equity: number;
  daily_loss_limit: number | null;
  total_loss_limit: number | null;
  profit_target: number | null;
  status: string;
};

type AuthenticatedUser = {
  id: string;
  email?: string;
};

type AccountLimitCheck = {
  allowed: boolean;
  status: 'active_subscription' | 'fallback_beta' | 'plan_required' | 'limit_exceeded';
  planName: string | null;
  accountLimit: number;
  activeAccountCount: number;
  remainingAccounts: number;
  error?: string;
  code?: string;
  httpStatus?: number;
};

type BillingPlan = {
  id: string;
  plan_name: string;
  name?: string | null;
  slug?: string | null;
  status?: string | null;
  active?: boolean | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  account_limit: number;
  support_tier?: string | null;
  billing_interval?: string | null;
  price_amount?: number | null;
  price_cents?: number | null;
  currency?: string | null;
  plan_features?: unknown;
  display_order?: number | null;
  highlighted?: boolean | null;
  recommended_badge?: string | null;
};

type AdminAuthResult = AuthenticatedUser & { isOwnerEmail: boolean };

type DetectionResult = {
  detected_broker: string | null;
  detected_server: string | null;
  detected_platform: string;
  detected_prop_firm: string | null;
  detection_confidence: 'high' | 'medium' | 'low';
  detection_notes: string;
};

type CanonicalSnapshot = {
  date: string;
  balance: number;
  equity: number;
  daily_pnl: number;
  floating_pnl: number;
  drawdown: number;
  max_balance: number;
};

type CanonicalTrade = {
  ticket: number;
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  open_time: string;
  close_time: string | null;
  open_price: number;
  close_price: number | null;
  profit: number;
  commission: number;
  swap: number;
  created_at: string;
};

type CanonicalPosition = {
  ticket: number;
  symbol: string;
  volume: number;
  open_price: number;
  current_price: number;
  floating_pnl: number;
  stop_loss: number | null;
  take_profit: number | null;
  updated_at: string;
};

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function toDateKey(value: unknown): string {
  const dt = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(dt.getTime())) return todayDate();
  return dt.toISOString().split('T')[0];
}

function toIso(value: unknown): string {
  const dt = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(dt.getTime())) return new Date().toISOString();
  return dt.toISOString();
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toSafeTicket(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function sideFromType(type: unknown): 'buy' | 'sell' | 'unknown' {
  const t = String(type ?? '').toUpperCase();
  if (t.includes('BUY')) return 'buy';
  if (t.includes('SELL')) return 'sell';
  return 'unknown';
}

function clampSyncError(message: string): string {
  return message.length > 500 ? message.slice(0, 500) : message;
}

function clampProgress(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function maskForLog(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value);
  if (text.length <= 4) return '*'.repeat(text.length);
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function getBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  const match = /^bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || null;
}

async function verifyRequestUser(request: FastifyRequest, requestedUserId: string): Promise<AuthenticatedUser | { error: JsonRecord; status: number }> {
  if (!isUuid(requestedUserId)) {
    return {
      status: 400,
      error: {
        error: 'A valid userId is required',
        code: 'invalid_user_id',
      },
    };
  }

  const token = getBearerToken(request);
  if (!token) {
    return {
      status: 401,
      error: {
        error: 'Missing user session token',
        code: 'missing_user_session',
      },
    };
  }

  const { data, error } = await supabase.auth.getUser(token);
  const authUser = data?.user;

  if (error || !authUser) {
    fastify.log.warn({
      event: 'fortify_user_token_invalid',
      requestedUserId: maskForLog(requestedUserId),
      error: error?.message,
    });
    return {
      status: 401,
      error: {
        error: 'Invalid or expired user session',
        code: 'invalid_user_session',
      },
    };
  }

  if (authUser.id !== requestedUserId) {
    fastify.log.warn({
      event: 'fortify_user_token_mismatch',
      tokenUserId: maskForLog(authUser.id),
      requestedUserId: maskForLog(requestedUserId),
    });
    return {
      status: 403,
      error: {
        error: 'User session does not match requested userId',
        code: 'user_mismatch',
      },
    };
  }

  return {
    id: authUser.id,
    email: authUser.email,
  };
}

async function verifyBearerUser(request: FastifyRequest): Promise<AuthenticatedUser | { error: JsonRecord; status: number }> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      status: 401,
      error: {
        error: 'Missing user session token',
        code: 'missing_user_session',
      },
    };
  }

  const { data, error } = await supabase.auth.getUser(token);
  const authUser = data?.user;
  if (error || !authUser) {
    fastify.log.warn({
      event: 'fortify_billing_user_token_invalid',
      error: error?.message,
    });
    return {
      status: 401,
      error: {
        error: 'Invalid or expired user session',
        code: 'invalid_user_session',
      },
    };
  }

  return {
    id: authUser.id,
    email: authUser.email,
  };
}

async function ensureOwnerAdminRole(user: AuthenticatedUser) {
  const isOwnerEmail = String(user.email || '').toLowerCase() === OWNER_ADMIN_EMAIL;
  if (!isOwnerEmail) return false;

  const { error } = await (supabase
    .from('user_roles' as any)
    .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id,role' }) as any);

  if (error) {
    fastify.log.error({
      event: 'admin_owner_bootstrap_failed',
      userId: maskForLog(user.id),
      error: error.message,
    });
    return false;
  }

  return true;
}

async function verifyAdminRequest(request: FastifyRequest): Promise<AdminAuthResult | { error: JsonRecord; status: number }> {
  const authResult = await verifyBearerUser(request);
  if (isAuthError(authResult)) return authResult;

  const isOwnerEmail = await ensureOwnerAdminRole(authResult);
  const { data: role, error } = await (supabase
    .from('user_roles' as any)
    .select('role')
    .eq('user_id', authResult.id)
    .eq('role', 'admin')
    .maybeSingle() as any);

  if (error) {
    fastify.log.error({
      event: 'admin_role_lookup_failed',
      userId: maskForLog(authResult.id),
      error: error.message,
    });
    return {
      status: 500,
      error: {
        error: 'Failed to verify admin role',
        code: 'admin_role_lookup_failed',
      },
    };
  }

  if (!role) {
    fastify.log.warn({
      event: 'admin_access_denied',
      userId: maskForLog(authResult.id),
      email: authResult.email ? maskForLog(authResult.email) : null,
    });
    return {
      status: 403,
      error: {
        error: 'Admin access required',
        code: 'admin_forbidden',
      },
    };
  }

  return {
    ...authResult,
    isOwnerEmail,
  };
}

async function verifyRequestUserOrAdmin(request: FastifyRequest, requestedUserId: string): Promise<AuthenticatedUser | { error: JsonRecord; status: number }> {
  if (!isUuid(requestedUserId)) {
    return {
      status: 400,
      error: {
        error: 'A valid userId is required',
        code: 'invalid_user_id',
      },
    };
  }

  const authResult = await verifyBearerUser(request);
  if (isAuthError(authResult)) return authResult;
  if (authResult.id === requestedUserId) return authResult;

  const adminResult = await verifyAdminRequest(request);
  if (!isAuthError(adminResult)) {
    fastify.log.info({
      event: 'admin_cross_user_sync_authorized',
      adminUserId: maskForLog(adminResult.id),
      targetUserId: maskForLog(requestedUserId),
    });
    return authResult;
  }

  return {
    status: 403,
    error: {
      error: 'User session does not match requested userId',
      code: 'user_mismatch',
    },
  };
}

function isAuthError(result: AuthenticatedUser | { error: JsonRecord; status: number }): result is { error: JsonRecord; status: number } {
  return 'error' in result;
}

function stripeConfigError() {
  return {
    error: 'A cobrança Stripe ainda não está configurada neste gateway.',
    code: 'stripe_config_missing',
    details: 'Configure STRIPE_SECRET_KEY em services/metaapi-gateway/.env para criar sessões reais.',
  };
}

function stripeWebhookConfigError() {
  return {
    error: 'O segredo do webhook Stripe ainda não está configurado neste gateway.',
    code: 'stripe_webhook_config_missing',
    details: 'Configure STRIPE_WEBHOOK_SECRET antes de aceitar eventos Stripe.',
  };
}

function normalizeBillingPlan(plan: JsonRecord): BillingPlan {
  return {
    id: String(plan.id),
    plan_name: String(plan.plan_name ?? plan.name ?? plan.id),
    name: plan.name ?? null,
    slug: plan.slug ?? plan.id,
    status: plan.status ?? 'active',
    active: plan.active ?? true,
    stripe_product_id: plan.stripe_product_id ?? null,
    stripe_price_id: plan.stripe_price_id ?? null,
    account_limit: Number(plan.account_limit ?? 0),
    support_tier: plan.support_tier ?? null,
    billing_interval: plan.billing_interval ?? null,
    price_amount: plan.price_amount ?? plan.price_cents ?? null,
    price_cents: plan.price_cents ?? plan.price_amount ?? null,
    currency: plan.currency ?? null,
    plan_features: plan.plan_features ?? [],
    display_order: plan.display_order ?? null,
    highlighted: plan.highlighted ?? null,
    recommended_badge: plan.recommended_badge ?? null,
  };
}

function isSafePlanSelector(value: string) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

async function findBillingPlanBySelector(selector: string): Promise<BillingPlan | null> {
  const clean = selector.trim();
  if (!clean || !isSafePlanSelector(clean)) return null;

  const query = (supabase
    .from('plans' as any)
    .select('*')
    .eq('status', 'active')
    .eq('active', true) as any);

  const { data, error } = clean.startsWith('price_')
    ? await query.eq('stripe_price_id', clean).maybeSingle()
    : await query.or(`id.eq.${clean},slug.eq.${clean}`).maybeSingle();

  if (error) throw error;
  return data ? normalizeBillingPlan(data) : null;
}

async function findAdminPlanBySelector(selector: string): Promise<BillingPlan | null> {
  const clean = selector.trim();
  if (!clean || !isSafePlanSelector(clean)) return null;

  const query = supabase.from('plans' as any).select('*') as any;
  const { data, error } = clean.startsWith('price_')
    ? await query.eq('stripe_price_id', clean).maybeSingle()
    : await query.or(`id.eq.${clean},slug.eq.${clean}`).maybeSingle();

  if (error) throw error;
  return data ? normalizeBillingPlan(data) : null;
}

async function findBillingPlanByStripePriceId(priceId: string): Promise<BillingPlan | null> {
  if (!priceId) return null;
  const { data, error } = await (supabase
    .from('plans' as any)
    .select('*')
    .eq('stripe_price_id', priceId)
    .eq('status', 'active')
    .eq('active', true)
    .maybeSingle() as any);

  if (error) throw error;
  return data ? normalizeBillingPlan(data) : null;
}

function appendStripeParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return;
  params.append(key, String(value));
}

function isStripePriceId(value: unknown): value is string {
  return typeof value === 'string' && /^price_[A-Za-z0-9]+$/.test(value);
}

function isStripeProductId(value: unknown): value is string {
  return typeof value === 'string' && /^prod_[A-Za-z0-9]+$/.test(value);
}

function isStripeCheckoutSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^cs_(test|live)_[A-Za-z0-9]+$/.test(value);
}

function checkoutSuccessUrl() {
  if (STRIPE_SUCCESS_URL.includes('{CHECKOUT_SESSION_ID}')) return STRIPE_SUCCESS_URL;
  const separator = STRIPE_SUCCESS_URL.includes('?') ? '&' : '?';
  return `${STRIPE_SUCCESS_URL}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getRequestIp(request: FastifyRequest) {
  const forwarded = request.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(first || request.ip || 'local').split(',')[0].trim();
}

function checkRateLimit(request: FastifyRequest, scope: string, maxRequests: number, windowMs: number) {
  const key = `${scope}:${getRequestIp(request)}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > maxRequests) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

function rateLimitError(retryAfterSeconds: number) {
  return {
    error: 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.',
    code: 'rate_limited',
    retryAfterSeconds,
  };
}

function getPlanPriceIdFromSession(session: JsonRecord, subscription?: JsonRecord | null) {
  return (
    session.line_items?.data?.[0]?.price?.id ||
    session.display_items?.[0]?.price?.id ||
    getStripePriceId(subscription || {}) ||
    null
  );
}

async function stripeRequest(pathname: string, params: Record<string, unknown>) {
  const form = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => appendStripeParam(form, key, value));

  const res = await fetch(`${STRIPE_API_BASE_URL}${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const error = new Error(body?.error?.message || `Stripe request failed with ${res.status}`) as Error & { status?: number; body?: JsonRecord };
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body;
}

async function stripeGet(pathname: string) {
  const res = await fetch(`${STRIPE_API_BASE_URL}${pathname}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const error = new Error(body?.error?.message || `Stripe request failed with ${res.status}`) as Error & { status?: number; body?: JsonRecord };
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body;
}

function getStripeEventSignature(signatureHeader: string | undefined): { timestamp: string; signature: string } | null {
  if (!signatureHeader) return null;
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
  if (!parts.t || !parts.v1) return null;
  return { timestamp: parts.t, signature: parts.v1 };
}

function verifyStripeWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const parsed = getStripeEventSignature(signatureHeader);
  if (!parsed || !STRIPE_WEBHOOK_SECRET) return false;

  const timestamp = Number(parsed.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > 5 * 60) return false;

  const signedPayload = `${parsed.timestamp}.${rawBody.toString('utf8')}`;
  const expected = createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(signedPayload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(parsed.signature, 'hex');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function stripeEpochToIso(value: unknown): string | null {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function getStripePriceId(subscription: JsonRecord): string | null {
  return (
    subscription.items?.data?.[0]?.price?.id ||
    subscription.plan?.id ||
    null
  );
}

function getStripeId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && 'id' in value) return String((value as JsonRecord).id);
  return null;
}

async function upsertSubscriptionFromStripe(subscription: JsonRecord, fallbackUserId?: string | null) {
  const stripeSubscriptionId = getStripeId(subscription.id);
  const stripeCustomerId = getStripeId(subscription.customer);
  const priceId = getStripePriceId(subscription);
  const userId = String(subscription.metadata?.user_id || fallbackUserId || '').trim();

  if (!stripeSubscriptionId || !stripeCustomerId || !priceId || !isUuid(userId)) {
    fastify.log.warn({
      event: 'stripe_subscription_sync_skipped_missing_metadata',
      subscriptionId: maskForLog(stripeSubscriptionId),
      customerId: maskForLog(stripeCustomerId),
      priceId: maskForLog(priceId),
      userId: maskForLog(userId),
    });
    return { updated: false, reason: 'missing_metadata' };
  }

  const plan = await findBillingPlanByStripePriceId(priceId);
  if (!plan) {
    fastify.log.warn({
      event: 'stripe_subscription_sync_skipped_plan_not_found',
      subscriptionId: maskForLog(stripeSubscriptionId),
      priceId: maskForLog(priceId),
      userId: maskForLog(userId),
    });
    return { updated: false, reason: 'plan_not_found' };
  }

  const currentPeriodStart =
    stripeEpochToIso(subscription.current_period_start) ||
    stripeEpochToIso(subscription.items?.data?.[0]?.current_period_start);
  const currentPeriodEnd =
    stripeEpochToIso(subscription.current_period_end) ||
    stripeEpochToIso(subscription.items?.data?.[0]?.current_period_end);

  const { error } = await (supabase
    .from('user_subscriptions' as any)
    .upsert({
      user_id: userId,
      plan_id: plan.id,
      plan_name: plan.plan_name,
      status: String(subscription.status || 'incomplete'),
      account_limit: plan.account_limit,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }) as any);

  if (error) throw error;

  fastify.log.info({
    event: 'stripe_subscription_synced',
    userId: maskForLog(userId),
    planId: plan.id,
    status: subscription.status,
    subscriptionId: maskForLog(stripeSubscriptionId),
  });

  return { updated: true, planId: plan.id };
}

async function syncSubscriptionById(subscriptionId: string, fallbackUserId?: string | null) {
  const subscription = await stripeGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  return upsertSubscriptionFromStripe(subscription, fallbackUserId);
}

async function getSubscriptionStatusForUser(userId: string) {
  const [subscriptionRes, activeAccountCountRes] = await Promise.all([
    (supabase
      .from('user_subscriptions' as any)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any),
    supabase
      .from('mt5_connections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('connection_status', ['connected', 'connecting', 'syncing']),
  ]);

  if (subscriptionRes.error) throw subscriptionRes.error;
  if (activeAccountCountRes.error) throw activeAccountCountRes.error;

  let subscription = subscriptionRes.data as JsonRecord | null;
  const refreshSubscriptionId = subscription?.stripe_subscription_id ? String(subscription.stripe_subscription_id) : null;
  if (refreshSubscriptionId && STRIPE_SECRET_KEY) {
    try {
      await syncSubscriptionById(refreshSubscriptionId, userId);
      const refreshed = await (supabase
        .from('user_subscriptions' as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle() as any);
      if (!refreshed.error && refreshed.data) subscription = refreshed.data;
    } catch (error: any) {
      fastify.log.warn({
        event: 'stripe_subscription_status_refresh_failed',
        userId: maskForLog(userId),
        subscriptionId: maskForLog(refreshSubscriptionId),
        error: error?.message,
      });
    }
  }

  const plan = subscription?.plan_id
    ? await findAdminPlanBySelector(subscription.plan_id)
    : null;
  const activeAccountCount = Number(activeAccountCountRes.count ?? 0);
  const accountLimit = Number(subscription?.account_limit ?? plan?.account_limit ?? 0);

  return {
    subscription: sanitizeSubscription(subscription),
    plan: sanitizePlan(plan as JsonRecord | null),
    support_tier: plan?.support_tier || null,
    activeAccountCount,
    accountLimit,
    remainingAccounts: Math.max(0, accountLimit - activeAccountCount),
    hasActivePlan: Boolean(subscription && ['active', 'trialing'].includes(String(subscription.status))),
  };
}

async function resolveStripePricesForPlans() {
  if (!STRIPE_SECRET_KEY) {
    return { configured: false, resolved: [], missing: [] as JsonRecord[] };
  }

  const { data: plans, error } = await (supabase
    .from('plans' as any)
    .select('*')
    .eq('status', 'active')
    .eq('active', true)
    .not('stripe_product_id', 'is', null) as any);

  if (error) throw error;

  const resolved: JsonRecord[] = [];
  const missing: JsonRecord[] = [];
  for (const plan of plans || []) {
    if (!isStripeProductId(plan.stripe_product_id)) {
      missing.push({ plan_id: plan.id, reason: 'invalid_product_id' });
      continue;
    }

    const prices = await stripeGet(
      `/prices?product=${encodeURIComponent(plan.stripe_product_id)}&active=true&type=recurring&limit=100`,
    );
    const expectedAmount = Number(plan.price_amount ?? plan.price_cents ?? 0);
    const expectedCurrency = String(plan.currency || 'brl').toLowerCase();
    const expectedInterval = String(plan.billing_interval || '').toLowerCase();
    const match = (prices.data || []).find((price: JsonRecord) =>
      price.active === true &&
      price.currency === expectedCurrency &&
      Number(price.unit_amount) === expectedAmount &&
      String(price.recurring?.interval || '').toLowerCase() === expectedInterval &&
      isStripePriceId(price.id)
    );

    if (!match) {
      missing.push({
        plan_id: plan.id,
        product_id: maskForLog(plan.stripe_product_id),
        amount: expectedAmount,
        currency: expectedCurrency,
        interval: expectedInterval,
        reason: 'no_matching_active_recurring_price',
      });
      continue;
    }

    const { error: updateError } = await (supabase
      .from('plans' as any)
      .update({
        stripe_price_id: match.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id) as any);
    if (updateError) throw updateError;

    resolved.push({
      plan_id: plan.id,
      product_id: maskForLog(plan.stripe_product_id),
      price_id: maskForLog(match.id),
    });
  }

  return { configured: true, resolved, missing };
}

function toPositiveInteger(value: unknown, fallback: number, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.floor(parsed));
}

function getQueryParam(request: FastifyRequest, key: string) {
  return String((request.query as JsonRecord | undefined)?.[key] ?? '').trim();
}

function maskExternalId(value: unknown) {
  return maskForLog(value);
}

function sanitizePlan(plan: JsonRecord | null | undefined) {
  if (!plan) return null;
  return {
    id: plan.id,
    name: plan.name ?? plan.plan_name,
    slug: plan.slug ?? plan.id,
    plan_name: plan.plan_name ?? plan.name,
    status: plan.status,
    active: plan.active ?? plan.status === 'active',
    account_limit: plan.account_limit,
    support_tier: plan.support_tier,
    billing_interval: plan.billing_interval,
    price_amount: plan.price_amount ?? plan.price_cents ?? null,
    currency: plan.currency,
    plan_features: Array.isArray(plan.plan_features) ? plan.plan_features : [],
    display_order: plan.display_order,
    highlighted: plan.highlighted,
    recommended_badge: plan.recommended_badge,
    stripe_product_id: maskExternalId(plan.stripe_product_id),
    has_stripe_product: Boolean(plan.stripe_product_id),
    stripe_product_id_status: isStripeProductId(plan.stripe_product_id) ? 'configured' : plan.stripe_product_id ? 'invalid' : 'missing',
    stripe_price_id: maskExternalId(plan.stripe_price_id),
    has_stripe_price: Boolean(plan.stripe_price_id),
    stripe_price_id_status: isStripePriceId(plan.stripe_price_id) ? 'configured' : plan.stripe_price_id ? 'invalid' : 'missing',
    created_at: plan.created_at,
    updated_at: plan.updated_at,
  };
}

function sanitizeSubscription(subscription: JsonRecord | null | undefined) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    user_id: subscription.user_id,
    plan_id: subscription.plan_id,
    plan_name: subscription.plan_name,
    status: subscription.status,
    account_limit: subscription.account_limit,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end,
    stripe_customer_id: maskExternalId(subscription.stripe_customer_id),
    stripe_subscription_id: maskExternalId(subscription.stripe_subscription_id),
    has_stripe_customer: Boolean(subscription.stripe_customer_id),
    has_stripe_subscription: Boolean(subscription.stripe_subscription_id),
    created_at: subscription.created_at,
    updated_at: subscription.updated_at,
  };
}

function sanitizeConnection(connection: JsonRecord, email?: string | null) {
  return {
    id: connection.id,
    trading_account_id: connection.trading_account_id,
    user_id: connection.user_id,
    user_email: email ?? null,
    account_name: connection.account_name,
    mt5_login: maskForLog(connection.mt5_login),
    mt5_server: connection.mt5_server,
    broker_name: connection.broker_name,
    provider: connection.provider,
    provider_account_id: maskExternalId(connection.provider_account_id),
    connection_status: connection.connection_status,
    sync_status: connection.sync_status,
    sync_error: connection.sync_error,
    last_sync_at: connection.last_sync_at,
    created_at: connection.created_at,
    updated_at: connection.updated_at,
  };
}

function sanitizeTradingAccount(account: JsonRecord | null | undefined) {
  if (!account) return null;
  return {
    id: account.id,
    user_id: account.user_id,
    nickname: account.nickname,
    broker: account.broker,
    prop_firm: account.prop_firm,
    status: account.status,
    rule_set_id: account.rule_set_id,
    rule_selection_status: account.rule_selection_status,
    mt5_login: maskForLog(account.mt5_login),
    mt5_server: account.mt5_server,
    mt5_connection_status: account.mt5_connection_status,
    mt5_last_sync_at: account.mt5_last_sync_at,
    mt5_sync_error: account.mt5_sync_error,
    detected_broker: account.detected_broker,
    detected_prop_firm: account.detected_prop_firm,
    detection_confidence: account.detection_confidence,
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

async function listAuthUsersForAdmin() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return (data.users || []).map((user: any) => ({
    id: user.id,
    email: user.email || '',
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    banned_until: user.banned_until,
    email_confirmed_at: user.email_confirmed_at,
    user_metadata: user.user_metadata || {},
  }));
}

async function getAuthUserForAdmin(userId: string) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw error;
  const user = data.user as any;
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || '',
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    banned_until: user.banned_until,
    email_confirmed_at: user.email_confirmed_at,
    user_metadata: user.user_metadata || {},
  };
}

function buildUserEmailMap(users: Array<{ id: string; email: string }>) {
  return new Map(users.map((user) => [user.id, user.email]));
}

async function getAdminUserRows() {
  const [users, subscriptionsRes, connectionsRes] = await Promise.all([
    listAuthUsersForAdmin(),
    (supabase.from('user_subscriptions' as any).select('*') as any),
    supabase.from('mt5_connections').select('id,user_id,last_sync_at,connection_status,sync_status,sync_error'),
  ]);

  if (subscriptionsRes.error) throw subscriptionsRes.error;
  if (connectionsRes.error) throw connectionsRes.error;

  const subByUser = new Map((subscriptionsRes.data || []).map((sub: JsonRecord) => [sub.user_id, sub]));
  const connectionsByUser = new Map<string, JsonRecord[]>();
  for (const connection of connectionsRes.data || []) {
    const list = connectionsByUser.get(connection.user_id) || [];
    list.push(connection);
    connectionsByUser.set(connection.user_id, list);
  }

  return users.map((user) => {
    const subscription = subByUser.get(user.id) as JsonRecord | undefined;
    const userConnections = connectionsByUser.get(user.id) || [];
    const lastSync = userConnections
      .map((connection) => connection.last_sync_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null;

    return {
      user_id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      blocked: Boolean(user.banned_until),
      subscription_status: subscription?.status || null,
      plan: subscription?.plan_id || null,
      plan_name: subscription?.plan_name || null,
      account_limit: subscription?.account_limit || 0,
      connected_accounts_count: userConnections.filter((connection) => ['connected', 'connecting', 'syncing'].includes(String(connection.connection_status))).length,
      sync_error_count: userConnections.filter((connection) => connection.sync_error || ['error', 'failed'].includes(String(connection.sync_status))).length,
      last_sync_at: lastSync,
      subscription: sanitizeSubscription(subscription),
    };
  });
}

function filterAndPaginateRows<T extends JsonRecord>(rows: T[], input: { search?: string; status?: string; plan?: string; page?: number; limit?: number }) {
  const search = String(input.search || '').toLowerCase();
  const status = String(input.status || '').toLowerCase();
  const plan = String(input.plan || '').toLowerCase();
  const page = input.page || 1;
  const limit = input.limit || 25;

  const filtered = rows.filter((row) => {
    const matchesSearch = !search || JSON.stringify(row).toLowerCase().includes(search);
    const matchesStatus = !status || String(row.subscription_status || row.status || '').toLowerCase() === status;
    const matchesPlan = !plan || String(row.plan || row.plan_id || '').toLowerCase() === plan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const start = (page - 1) * limit;
  return {
    rows: filtered.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
  };
}

function paginateRows<T>(rows: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return {
    rows: rows.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    },
  };
}

function normalizeAdminStatus(value: unknown, fallback = 'active') {
  const status = String(value || fallback).trim().toLowerCase();
  const allowed = new Set(['active', 'trialing', 'inactive', 'canceled', 'past_due', 'suspended', 'incomplete']);
  return allowed.has(status) ? status : fallback;
}

function parsePeriodEnd(value: unknown, fallbackIso: string | null) {
  if (value === null || value === undefined || value === '') return fallbackIso;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallbackIso;
}

function defaultPeriodEndForPlan(plan: BillingPlan) {
  const days = plan.id === 'beta_free' ? 90 : plan.billing_interval === 'year' ? 365 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function loadTradingAccountMap() {
  const { data, error } = await supabase
    .from('trading_accounts')
    .select('id,user_id,nickname,broker,prop_firm,status,rule_set_id,rule_selection_status,mt5_connection_status,mt5_last_sync_at,mt5_sync_error');

  if (error) throw error;
  return new Map((data || []).map((account: JsonRecord) => [account.id, account]));
}

async function loadRuleEvaluationSummary(tradingAccountIds: string[]) {
  if (tradingAccountIds.length === 0) return new Map<string, JsonRecord>();

  const { data, error } = await (supabase
    .from('rule_evaluations' as any)
    .select('trading_account_id,status,data_status,computed_at')
    .in('trading_account_id', tradingAccountIds) as any);

  if (error) throw error;

  const summaries = new Map<string, JsonRecord>();
  for (const evaluation of data || []) {
    const accountId = evaluation.trading_account_id;
    const current = summaries.get(accountId) || {
      total: 0,
      approving: 0,
      warning: 0,
      violated: 0,
      notMet: 0,
      insufficientData: 0,
      lastComputedAt: null,
    };

    current.total += 1;
    if (evaluation.status === 'APPROVING') current.approving += 1;
    if (evaluation.status === 'WARNING') current.warning += 1;
    if (evaluation.status === 'VIOLATED') current.violated += 1;
    if (evaluation.status === 'NOT_MET') current.notMet += 1;
    if (evaluation.data_status === 'insufficient_data') current.insufficientData += 1;
    if (evaluation.computed_at && (!current.lastComputedAt || evaluation.computed_at > current.lastComputedAt)) {
      current.lastComputedAt = evaluation.computed_at;
    }

    summaries.set(accountId, current);
  }

  return summaries;
}

async function getActiveAccountLimit(userId: string): Promise<AccountLimitCheck> {
  const { data: subscription, error } = await (supabase
    .from('user_subscriptions')
    .select('plan_id,plan_name,status,account_limit,current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle() as any);

  if (error) {
    fastify.log.error({
      event: 'subscription_lookup_failed',
      userId: maskForLog(userId),
      error: error.message,
    });

    if (FORTIFY_ALLOW_BETA_FALLBACK) {
      fastify.log.warn({
        event: 'subscription_lookup_failed_using_beta_fallback',
        userId: maskForLog(userId),
      });
      return {
        allowed: true,
        status: 'fallback_beta',
        planName: 'Local Beta Fallback',
        accountLimit: 1,
        activeAccountCount: 0,
        remainingAccounts: 1,
      };
    }

    return {
      allowed: false,
      status: 'plan_required',
      planName: null,
      accountLimit: 0,
      activeAccountCount: 0,
      remainingAccounts: 0,
      error: 'Subscription lookup failed',
      code: 'subscription_lookup_failed',
      httpStatus: 500,
    };
  }

  const isPeriodActive =
    !subscription?.current_period_end ||
    !Number.isFinite(Date.parse(subscription.current_period_end)) ||
    Date.parse(subscription.current_period_end) > Date.now();

  if (!subscription || !isPeriodActive) {
    if (FORTIFY_ALLOW_BETA_FALLBACK) {
      fastify.log.warn({
        event: 'subscription_missing_using_beta_fallback',
        userId: maskForLog(userId),
      });
      return {
        allowed: true,
        status: 'fallback_beta',
        planName: 'Local Beta Fallback',
        accountLimit: 1,
        activeAccountCount: 0,
        remainingAccounts: 1,
      };
    }

    return {
      allowed: false,
      status: 'plan_required',
      planName: null,
      accountLimit: 0,
      activeAccountCount: 0,
      remainingAccounts: 0,
      error: 'Active Fortify plan required before connecting MT5',
      code: 'plan_required',
      httpStatus: 402,
    };
  }

  return {
    allowed: true,
    status: 'active_subscription',
    planName: subscription.plan_name,
    accountLimit: Number(subscription.account_limit ?? 0),
    activeAccountCount: 0,
    remainingAccounts: Number(subscription.account_limit ?? 0),
  };
}

async function enforceAccountLimitForConnect(input: {
  userId: string;
  mt5Login: string;
  mt5Server: string;
  tradingAccountId: string | null;
}): Promise<AccountLimitCheck> {
  const { userId, mt5Login, mt5Server, tradingAccountId } = input;
  const limit = await getActiveAccountLimit(userId);
  if (!limit.allowed) return limit;

  const reusableStatuses = ['connected', 'connecting', 'syncing', 'queued', 'auth_error'];
  const { data: ownExistingConnection, error: ownExistingConnectionError } = await supabase
    .from('mt5_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('mt5_login', mt5Login)
    .eq('mt5_server', mt5Server)
    .in('connection_status', reusableStatuses)
    .limit(1)
    .maybeSingle();

  if (ownExistingConnectionError) {
    return {
      ...limit,
      allowed: false,
      error: 'Failed to check existing MT5 connection',
      code: 'supabase_lookup_failed',
      httpStatus: 500,
    };
  }

  if (ownExistingConnection) {
    return limit;
  }

  if (tradingAccountId) {
    const { data: ownTradingConnection, error: ownTradingConnectionError } = await supabase
      .from('mt5_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('trading_account_id', tradingAccountId)
      .in('connection_status', reusableStatuses)
      .limit(1)
      .maybeSingle();

    if (ownTradingConnectionError) {
      return {
        ...limit,
        allowed: false,
        error: 'Failed to check selected trading account connection',
        code: 'supabase_lookup_failed',
        httpStatus: 500,
      };
    }

    if (ownTradingConnection) {
      return limit;
    }
  }

  const activeStatuses = ['connected', 'connecting', 'syncing'];
  const { count, error: countError } = await supabase
    .from('mt5_connections')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('connection_status', activeStatuses);

  if (countError) {
    return {
      ...limit,
      allowed: false,
      error: 'Failed to count active MT5 accounts',
      code: 'supabase_lookup_failed',
      httpStatus: 500,
    };
  }

  const activeAccountCount = count ?? 0;
  const accountLimit = limit.accountLimit;
  const remainingAccounts = Math.max(0, accountLimit - activeAccountCount);

  if (activeAccountCount >= accountLimit) {
    return {
      ...limit,
      allowed: false,
      activeAccountCount,
      remainingAccounts,
      error: 'Você atingiu o limite de contas do seu plano.',
      code: 'account_limit_exceeded',
      httpStatus: 402,
    };
  }

  return {
    ...limit,
    activeAccountCount,
    remainingAccounts,
  };
}

async function findOtherUserMt5Connection(userId: string, mt5Login: string, mt5Server: string) {
  const { data, error } = await supabase
    .from('mt5_connections')
    .select('id,user_id,connection_status')
    .eq('mt5_login', mt5Login)
    .eq('mt5_server', mt5Server)
    .neq('user_id', userId)
    .in('connection_status', ['connected', 'connecting', 'syncing'])
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

function detectAccountSource(mt5Server: string, brokerName?: string | null): DetectionResult {
  const server = String(mt5Server || '').trim();
  const broker = String(brokerName || '').trim();
  const text = `${server} ${broker}`.toLowerCase();

  const result: DetectionResult = {
    detected_broker: broker || null,
    detected_server: server || null,
    detected_platform: 'mt5',
    detected_prop_firm: null,
    detection_confidence: 'low',
    detection_notes: 'Broker/server captured from MT5 connection. Prop firm requires user selection.',
  };

  if (text.includes('easymarkets')) {
    return {
      ...result,
      detected_broker: 'EasyMarkets',
      detection_confidence: 'high',
      detection_notes: 'Detected EasyMarkets from MT5 server. This is treated as broker/server only, not as a prop firm.',
    };
  }

  if (text.includes('ftmo')) {
    return {
      ...result,
      detected_broker: 'FTMO',
      detected_prop_firm: 'FTMO',
      detection_confidence: 'medium',
      detection_notes: 'FTMO-like server/broker pattern detected. User should confirm program, phase and account size.',
    };
  }

  if (text.includes('hantec') || text.includes('hmarkets')) {
    return {
      ...result,
      detected_broker: broker || 'Hantec Markets',
      detected_prop_firm: 'Hantec Trader',
      detection_confidence: 'medium',
      detection_notes: 'Hantec-like server/broker pattern detected. User should confirm Hantec Trader program details.',
    };
  }

  if (text.includes('fundscap') || text.includes('funds cap')) {
    return {
      ...result,
      detected_broker: broker || 'Fundscap',
      detected_prop_firm: 'Fundscap',
      detection_confidence: 'medium',
      detection_notes: 'Fundscap-like pattern detected. User should confirm modality and funded/evaluation phase.',
    };
  }

  if (text.includes('topstep')) {
    return {
      ...result,
      detected_broker: broker || 'Topstep',
      detected_prop_firm: 'Topstep',
      detection_confidence: 'medium',
      detection_notes: 'Topstep-like pattern detected. User should confirm futures program and drawdown model.',
    };
  }

  if (broker) {
    return {
      ...result,
      detected_broker: broker,
      detection_confidence: 'medium',
      detection_notes: 'Broker name provided by user. Prop firm was not inferred from server.',
    };
  }

  return result;
}

function buildManagementAdvice(result: RuleEvaluationResult, rule: RuleInstance): RuleEvaluationResult {
  const key = rule.rule_definitions?.key || '';
  const limit = result.limit_value ?? 0;
  const current = result.current_value ?? 0;
  const remaining = result.remaining_value ?? (limit > 0 ? Math.max(0, limit - current) : null);
  const progress = result.progress_pct ?? 0;

  let recommended = 'Keep risk controlled and follow the account plan.';
  let next = 'continue';

  if (result.data_status === 'insufficient_data') {
    recommended = 'Sync more account history before relying on this rule.';
    next = 'wait_for_more_data';
  } else if (result.status === 'VIOLATED') {
    recommended = 'Stop trading and review the rule violation immediately.';
    next = 'stop_trading';
  } else if (result.status === 'WARNING' || progress >= 80) {
    recommended = 'Reduce risk and avoid new exposure until the buffer improves.';
    next = 'reduce_risk';
  } else if (key.includes('profit_target')) {
    recommended = `You need ${remaining !== null ? `$${remaining.toFixed(2)}` : 'more profit'} to reach the target.`;
    next = 'continue';
  } else if (key.includes('daily_loss')) {
    recommended = `Daily loss buffer remaining: ${remaining !== null ? `$${remaining.toFixed(2)}` : 'unknown'}.`;
    next = progress >= 60 ? 'reduce_risk' : 'continue';
  } else if (key.includes('total_loss') || key.includes('drawdown') || key.includes('floating')) {
    recommended = `Drawdown/loss buffer remaining: ${remaining !== null ? `$${remaining.toFixed(2)}` : 'unknown'}.`;
    next = progress >= 60 ? 'reduce_risk' : 'continue';
  } else if (key.includes('trading_days') || key.includes('profitable_days')) {
    recommended = `Eligible days remaining: ${remaining !== null ? remaining.toFixed(0) : 'unknown'}.`;
    next = 'continue';
  } else if (key.includes('average_lot') || key.includes('max_lot')) {
    recommended = 'Keep lot size below the configured account limit.';
    next = progress >= 60 ? 'reduce_lot_size' : 'continue';
  }

  return {
    ...result,
    remaining_value: remaining,
    explanation: result.explanation ?? result.message,
    recommended_action: result.recommended_action ?? recommended,
    severity: result.severity ?? rule.severity,
    next_best_action: result.next_best_action ?? next,
    data_status: result.data_status ?? 'ok',
  };
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseJsonText(text: string): JsonRecord {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractMetaApiMessage(body: JsonRecord, fallback: string): string {
  if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  if (typeof body?.details === 'string' && body.details.trim()) return body.details;
  if (typeof body?.raw === 'string' && body.raw.trim()) return body.raw;
  return fallback;
}

function hostOnly(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function classifyProvisioningFailure(status: number, body: JsonRecord): ProvisioningFailure {
  const message = extractMetaApiMessage(body, `MetaApi provisioning failed (HTTP ${status})`);
  const normalized = message.toLowerCase();

  if (
    status === 403 &&
    (normalized.includes('do not have access') ||
      normalized.includes('forbidden') ||
      normalized.includes('methodid') ||
      normalized.includes('createaccount') ||
      normalized.includes('account-management:createaccount'))
  ) {
    return {
      code: 'metaapi_permission_denied',
      error: 'MetaApi token lacks account provisioning permission',
      httpStatus: 403,
    };
  }

  if (
    status === 401 ||
    normalized.includes('auth-token') ||
    normalized.includes('auth token') ||
    normalized.includes('unauthorized')
  ) {
    return {
      code: 'invalid_metaapi_token',
      error: 'Invalid MetaApi token',
      httpStatus: 401,
    };
  }

  if (
    normalized.includes('server') &&
    (normalized.includes('not found') ||
      normalized.includes('invalid') ||
      normalized.includes('unknown') ||
      normalized.includes('broker'))
  ) {
    return {
      code: 'wrong_mt5_server',
      error: 'Wrong MT5 server',
      httpStatus: 400,
    };
  }

  if (
    normalized.includes('credential') ||
    normalized.includes('login') ||
    normalized.includes('password') ||
    normalized.includes('authorization') ||
    normalized.includes('authentication')
  ) {
    return {
      code: 'wrong_mt5_credentials',
      error: 'Wrong MT5 login or password',
      httpStatus: 400,
    };
  }

  return {
    code: 'metaapi_provisioning_failed',
    error: message,
    httpStatus: status >= 400 && status < 500 ? 400 : 502,
  };
}

function parseRetryAfterMs(header: string | null): number {
  if (!header) return 1000;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = new Date(header).getTime();
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return 1000;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function limitAmount(rule: RuleInstance, reference: number): number {
  const limit = toNumber(rule.limit_value, 0);
  if (rule.mode === 'value') return limit;
  return Math.abs(reference) * (limit / 100);
}

function dealNetProfit(deal: JsonRecord): number {
  return toNumber(deal.profit) + toNumber(deal.commission) + toNumber(deal.swap);
}

function getProviderAccountId(body: JsonRecord): string | null {
  if (typeof body?.id === 'string' && body.id.trim()) return body.id;
  if (typeof body?._id === 'string' && body._id.trim()) return body._id;
  return null;
}

function getMetaApiAccountId(account: MetaApiProvisioningAccount): string | null {
  if (typeof account?._id === 'string' && account._id.trim()) return account._id;
  if (typeof account?.id === 'string' && account.id.trim()) return account.id;
  return null;
}

function getProvisioningAccounts(body: JsonRecord): MetaApiProvisioningAccount[] {
  if (Array.isArray(body)) return body as MetaApiProvisioningAccount[];
  if (Array.isArray(body?.items)) return body.items as MetaApiProvisioningAccount[];
  if (Array.isArray(body?.accounts)) return body.accounts as MetaApiProvisioningAccount[];
  return [];
}

async function listProvisioningAccounts(url: string) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'auth-token': METAAPI_TOKEN,
    },
  });

  const text = await res.text();
  const body = parseJsonText(text);
  const accounts = getProvisioningAccounts(body);

  fastify.log.info({
    event: 'metaapi_accounts_list_response',
    url,
    status: res.status,
    accountCount: accounts.length,
  });

  return { res, text, body, accounts };
}

function findMatchingProvisioningAccount(
  accounts: MetaApiProvisioningAccount[],
  mt5Login: string,
  mt5Server: string,
): MetaApiProvisioningAccount | null {
  return (
    accounts.find((account) => String(account.login ?? '').trim() === mt5Login && String(account.server ?? '').trim() === mt5Server) ??
    null
  );
}

async function postProvisioningAccount(url: string, payload: JsonRecord) {
  const transactionId = `fortify-${randomUUID()}`;
  let lastRes: Response | null = null;
  let lastText = '';
  let lastBody: JsonRecord = {};

  for (let attempt = 1; attempt <= METAAPI_PROVISIONING_MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'auth-token': METAAPI_TOKEN,
        'Content-Type': 'application/json',
        'transaction-id': transactionId,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const parsed = parseJsonText(text);
    lastRes = res;
    lastText = text;
    lastBody = parsed;

    fastify.log.info({
      event: 'metaapi_connect_response',
      url,
      status: res.status,
      attempt,
      transactionId,
    });

    if (res.status !== 202 || getProviderAccountId(parsed)) {
      return { res, text, body: parsed, transactionId, attempts: attempt, pending: false };
    }

    if (attempt < METAAPI_PROVISIONING_MAX_ATTEMPTS) {
      const waitMs = Math.min(parseRetryAfterMs(res.headers.get('Retry-After')), METAAPI_PROVISIONING_MAX_WAIT_MS);
      fastify.log.info({
        event: 'metaapi_connect_pending',
        status: res.status,
        attempt,
        waitMs,
        transactionId,
      });
      await sleep(waitMs);
    }
  }

  if (!lastRes) {
    throw new Error('MetaApi provisioning did not return a response');
  }

  return {
    res: lastRes,
    text: lastText,
    body: lastBody,
    transactionId,
    attempts: METAAPI_PROVISIONING_MAX_ATTEMPTS,
    pending: lastRes.status === 202,
  };
}

async function validateLoadedMetaApiToken() {
  const url = `${provisioningBaseUrl}/users/current/accounts`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'auth-token': METAAPI_TOKEN,
      },
    });

    fastify.log.info({
      event: 'metaapi_startup_token_validation',
      url,
      status: res.status,
      tokenPresent: !!METAAPI_TOKEN,
      tokenLength: METAAPI_TOKEN.length,
    });
  } catch (error: any) {
    fastify.log.error({
      event: 'metaapi_startup_token_validation_failed',
      url,
      tokenPresent: !!METAAPI_TOKEN,
      tokenLength: METAAPI_TOKEN.length,
      error: error?.message || String(error),
      name: error?.name,
      cause: error?.cause,
    });
  }
}

function mapPositions(raw: unknown[]): CanonicalPosition[] {
  return raw
    .map((p: any) => {
      const ticket = toSafeTicket(p.id ?? p.ticket ?? p.positionId);
      const symbol = String(p.symbol ?? '').trim();
      if (ticket === null || !symbol) return null;

      return {
        ticket,
        symbol,
        volume: toNumber(p.volume),
        open_price: toNumber(p.openPrice ?? p.price),
        current_price: toNumber(p.currentPrice ?? p.price ?? p.openPrice),
        floating_pnl: toNumber(p.profit),
        stop_loss: toNullableNumber(p.stopLoss),
        take_profit: toNullableNumber(p.takeProfit),
        updated_at: toIso(p.updateTime ?? p.time),
      };
    })
    .filter((p): p is CanonicalPosition => p !== null);
}

function mapDeals(raw: unknown[]): CanonicalTrade[] {
  return raw
    .map((d: any) => {
      const ticket = toSafeTicket(d.id ?? d.ticket ?? d.dealId);
      const symbol = String(d.symbol ?? '').trim();
      const side = sideFromType(d.type);
      if (ticket === null || !symbol || side === 'unknown') return null;

      const at = toIso(d.time ?? d.brokerTime);
      const price = toNumber(d.price);
      const trade: CanonicalTrade = {
        ticket,
        symbol,
        side,
        volume: toNumber(d.volume),
        open_time: at,
        close_time: at,
        open_price: price,
        close_price: price,
        profit: toNumber(d.profit),
        commission: toNumber(d.commission),
        swap: toNumber(d.swap),
        created_at: at,
      };
      return trade;
    })
    .filter((t): t is CanonicalTrade => t !== null);
}

function buildSnapshot(
  accountInfo: JsonRecord,
  deals: CanonicalTrade[],
  positions: CanonicalPosition[],
  existingSnapshots: any[],
  tradingAccount: TradingAccount | null,
): CanonicalSnapshot {
  const date = todayDate();
  const balance = toNumber(accountInfo.balance, tradingAccount?.current_balance ?? tradingAccount?.start_balance ?? 0);
  const equity = toNumber(accountInfo.equity, balance);
  const floatingPnl = toNumber(accountInfo.profit, positions.reduce((sum, p) => sum + p.floating_pnl, 0));
  const dailyPnl = deals
    .filter((deal) => toDateKey(deal.created_at) === date)
    .reduce((sum, deal) => sum + deal.profit + deal.commission + deal.swap, 0);

  const previousMax = Math.max(
    0,
    tradingAccount?.highest_equity ?? 0,
    tradingAccount?.start_balance ?? 0,
    ...existingSnapshots.map((s) => toNumber(s.max_balance ?? s.equity ?? s.balance, 0)),
  );
  const maxBalance = Math.max(previousMax, balance, equity);

  return {
    date,
    balance,
    equity,
    daily_pnl: dailyPnl,
    floating_pnl: floatingPnl,
    drawdown: Math.max(0, maxBalance - equity),
    max_balance: maxBalance,
  };
}

function calcMaxDailyLoss(
  snapshot: CanonicalSnapshot | null,
  tradingAccount: TradingAccount,
  rule: RuleInstance,
): RuleEvaluationResult {
  const date = snapshot?.date ?? todayDate();
  if (!snapshot) {
    return {
      status: 'NOT_MET',
      current_value: null,
      limit_value: limitAmount(rule, tradingAccount.start_balance),
      progress_pct: null,
      message: 'No MT5 snapshot is available for today',
      computation_window: 'daily',
      reference_date: date,
    };
  }

  const pnl = snapshot.daily_pnl + (rule.includes_floating ? snapshot.floating_pnl : 0);
  const used = Math.max(0, -pnl);
  const limit = limitAmount(rule, tradingAccount.start_balance);
  const progress = limit > 0 ? (used / limit) * 100 : null;
  const status: RuleEvaluationStatus = used >= limit && limit > 0 ? 'VIOLATED' : progress !== null && progress >= 80 ? 'WARNING' : 'APPROVING';

  return {
    status,
    current_value: used,
    limit_value: limit,
    progress_pct: clampProgress(progress),
    message: `Daily loss used: ${used.toFixed(2)} of ${limit.toFixed(2)}`,
    computation_window: 'daily',
    reference_date: date,
  };
}

function calcMaxTotalLoss(
  snapshot: CanonicalSnapshot,
  tradingAccount: TradingAccount,
  rule: RuleInstance,
): RuleEvaluationResult {
  const currentValue = rule.includes_floating ? snapshot.equity : snapshot.balance;
  const limit = limitAmount(rule, tradingAccount.start_balance);
  const floor = tradingAccount.start_balance - limit;
  const used = Math.max(0, tradingAccount.start_balance - currentValue);
  const progress = limit > 0 ? (used / limit) * 100 : null;
  const status: RuleEvaluationStatus = currentValue <= floor ? 'VIOLATED' : progress !== null && progress >= 75 ? 'WARNING' : 'APPROVING';

  return {
    status,
    current_value: used,
    limit_value: limit,
    progress_pct: clampProgress(progress),
    message: `Total loss used: ${used.toFixed(2)} of ${limit.toFixed(2)}`,
    computation_window: 'total',
    reference_date: null,
  };
}

function calcTrailingDrawdown(
  snapshot: CanonicalSnapshot,
  snapshots: CanonicalSnapshot[],
  tradingAccount: TradingAccount,
  rule: RuleInstance,
): RuleEvaluationResult {
  const hwm = Math.max(
    tradingAccount.start_balance,
    tradingAccount.highest_equity,
    snapshot.equity,
    ...snapshots.map((s) => Math.max(s.equity, s.max_balance)),
  );
  const limit = limitAmount(rule, hwm);
  const floor = hwm - limit;
  const used = Math.max(0, hwm - snapshot.equity);
  const progress = limit > 0 ? (used / limit) * 100 : null;
  const status: RuleEvaluationStatus = snapshot.equity <= floor ? 'VIOLATED' : progress !== null && progress >= 75 ? 'WARNING' : 'APPROVING';

  return {
    status,
    current_value: used,
    limit_value: limit,
    progress_pct: clampProgress(progress),
    message: `Trailing drawdown used: ${used.toFixed(2)} of ${limit.toFixed(2)} (HWM ${hwm.toFixed(2)})`,
    computation_window: 'total',
    reference_date: null,
  };
}

function calcProfitTarget(snapshot: CanonicalSnapshot, tradingAccount: TradingAccount, rule: RuleInstance): RuleEvaluationResult {
  const profit = snapshot.balance - tradingAccount.start_balance;
  const target = limitAmount(rule, tradingAccount.start_balance);
  const progress = target > 0 ? (profit / target) * 100 : null;

  return {
    status: profit >= target && target > 0 ? 'APPROVING' : 'NOT_MET',
    current_value: profit,
    limit_value: target,
    progress_pct: clampProgress(progress),
    message: `Profit target progress: ${profit.toFixed(2)} of ${target.toFixed(2)}`,
    computation_window: 'total',
    reference_date: null,
  };
}

function calcMinTradingDays(trades: CanonicalTrade[], rule: RuleInstance): RuleEvaluationResult {
  const tradingDays = new Set(trades.map((trade) => toDateKey(trade.created_at))).size;
  const requiredDays = toNumber(rule.limit_value);
  const progress = requiredDays > 0 ? (tradingDays / requiredDays) * 100 : null;

  return {
    status: tradingDays >= requiredDays && requiredDays > 0 ? 'APPROVING' : 'NOT_MET',
    current_value: tradingDays,
    limit_value: requiredDays,
    progress_pct: clampProgress(progress),
    message: `Trading days: ${tradingDays}/${requiredDays}`,
    computation_window: 'total',
    reference_date: null,
  };
}

function calcProfitableDays(snapshots: CanonicalSnapshot[], rule: RuleInstance): RuleEvaluationResult {
  const profitableDays = snapshots.filter((snapshot) => snapshot.daily_pnl > 0).length;
  const requiredDays = toNumber(rule.limit_value);
  const progress = requiredDays > 0 ? (profitableDays / requiredDays) * 100 : null;

  return {
    status: profitableDays >= requiredDays && requiredDays > 0 ? 'APPROVING' : 'NOT_MET',
    current_value: profitableDays,
    limit_value: requiredDays,
    progress_pct: clampProgress(progress),
    message: `Profitable days: ${profitableDays}/${requiredDays}`,
    computation_window: 'total',
    reference_date: null,
  };
}

function calcConsistencyBestDayCap(snapshots: CanonicalSnapshot[], rule: RuleInstance): RuleEvaluationResult {
  const profits = snapshots.map((snapshot) => snapshot.daily_pnl).filter((profit) => profit > 0);
  const totalProfit = profits.reduce((sum, profit) => sum + profit, 0);
  const bestDay = profits.length > 0 ? Math.max(...profits) : 0;
  const bestDayPct = totalProfit > 0 ? (bestDay / totalProfit) * 100 : 0;
  const cap = toNumber(rule.limit_value);

  return {
    status: totalProfit <= 0 ? 'NOT_MET' : bestDayPct > cap ? 'VIOLATED' : 'APPROVING',
    current_value: bestDayPct,
    limit_value: cap,
    progress_pct: clampProgress(bestDayPct),
    message: `Best day is ${bestDayPct.toFixed(1)}% of profitable total`,
    computation_window: 'payoutWindow',
    reference_date: null,
  };
}

function calcInactivity(trades: CanonicalTrade[], rule: RuleInstance): RuleEvaluationResult {
  const maxDays = toNumber(rule.limit_value);
  const latestTradeMs = trades.reduce((latest, trade) => {
    const ms = new Date(trade.created_at).getTime();
    return Number.isFinite(ms) ? Math.max(latest, ms) : latest;
  }, 0);
  const inactiveDays = latestTradeMs > 0 ? Math.floor((Date.now() - latestTradeMs) / (24 * 60 * 60 * 1000)) : maxDays;
  const progress = maxDays > 0 ? (inactiveDays / maxDays) * 100 : null;

  return {
    status: inactiveDays >= maxDays && maxDays > 0 ? 'VIOLATED' : progress !== null && progress >= 70 ? 'WARNING' : 'APPROVING',
    current_value: inactiveDays,
    limit_value: maxDays,
    progress_pct: clampProgress(progress),
    message: `Inactive days: ${inactiveDays}/${maxDays}`,
    computation_window: 'total',
    reference_date: null,
  };
}

function calcFloatingLossLimit(positions: CanonicalPosition[], tradingAccount: TradingAccount, rule: RuleInstance): RuleEvaluationResult {
  const floatingLoss = Math.max(0, -positions.reduce((sum, position) => sum + position.floating_pnl, 0));
  const limit = limitAmount(rule, tradingAccount.start_balance);
  const progress = limit > 0 ? (floatingLoss / limit) * 100 : null;

  return {
    status: floatingLoss >= limit && limit > 0 ? 'VIOLATED' : progress !== null && progress >= 80 ? 'WARNING' : 'APPROVING',
    current_value: floatingLoss,
    limit_value: limit,
    progress_pct: clampProgress(progress),
    message: `Floating loss: ${floatingLoss.toFixed(2)} of ${limit.toFixed(2)}`,
    computation_window: 'daily',
    reference_date: todayDate(),
  };
}

function insufficientRuleData(rule: RuleInstance, message: string, window: ComputationWindow = 'total'): RuleEvaluationResult {
  return {
    status: 'NOT_MET',
    current_value: null,
    limit_value: toNumber(rule.limit_value),
    remaining_value: null,
    progress_pct: null,
    message,
    explanation: message,
    recommended_action: 'Sync more MT5 history or configure this rule manually before relying on it.',
    next_best_action: 'wait_for_more_data',
    data_status: 'insufficient_data',
    computation_window: window,
    reference_date: window === 'daily' ? todayDate() : null,
  };
}

function calcAverageLotLimit(trades: CanonicalTrade[], rule: RuleInstance): RuleEvaluationResult {
  if (trades.length === 0) return insufficientRuleData(rule, 'No closed trades available to calculate average lot.');
  const averageLot = trades.reduce((sum, trade) => sum + Math.abs(trade.volume), 0) / trades.length;
  const limit = toNumber(rule.limit_value);
  const progress = limit > 0 ? (averageLot / limit) * 100 : null;

  return {
    status: averageLot > limit && limit > 0 ? 'VIOLATED' : progress !== null && progress >= 75 ? 'WARNING' : 'APPROVING',
    current_value: averageLot,
    limit_value: limit,
    progress_pct: clampProgress(progress),
    message: `Average lot: ${averageLot.toFixed(2)} of ${limit.toFixed(2)}`,
    computation_window: 'total',
    reference_date: null,
  };
}

function calcMaxLotLimit(trades: CanonicalTrade[], positions: CanonicalPosition[], rule: RuleInstance): RuleEvaluationResult {
  const lots = [...trades.map((trade) => Math.abs(trade.volume)), ...positions.map((position) => Math.abs(position.volume))];
  if (lots.length === 0) return insufficientRuleData(rule, 'No trades or open positions available to calculate max lot.');
  const maxLot = Math.max(...lots);
  const limit = toNumber(rule.limit_value);
  const progress = limit > 0 ? (maxLot / limit) * 100 : null;

  return {
    status: maxLot > limit && limit > 0 ? 'VIOLATED' : progress !== null && progress >= 75 ? 'WARNING' : 'APPROVING',
    current_value: maxLot,
    limit_value: limit,
    progress_pct: clampProgress(progress),
    message: `Max lot used: ${maxLot.toFixed(2)} of ${limit.toFixed(2)}`,
    computation_window: 'total',
    reference_date: null,
  };
}

function calcTradeValueScore(trades: CanonicalTrade[], snapshots: CanonicalSnapshot[], rule: RuleInstance): RuleEvaluationResult {
  const tradeProfits = trades.map((trade) => Math.max(0, dealNetProfit(trade))).filter((profit) => profit > 0);
  const dailyProfits = snapshots.map((snapshot) => Math.max(0, snapshot.daily_pnl)).filter((profit) => profit > 0);
  const profits = tradeProfits.length > 0 ? tradeProfits : dailyProfits;
  if (profits.length === 0) return insufficientRuleData(rule, 'No profitable trades or days available to calculate concentration score.');

  const totalProfit = profits.reduce((sum, profit) => sum + profit, 0);
  const largest = Math.max(...profits);
  const score = totalProfit > 0 ? (largest / totalProfit) * 100 : 0;
  const limit = toNumber(rule.limit_value);

  return {
    status: score > limit && limit > 0 ? 'VIOLATED' : score >= limit * 0.8 && limit > 0 ? 'WARNING' : 'APPROVING',
    current_value: score,
    limit_value: limit,
    progress_pct: clampProgress(score),
    message: `Largest profit concentration: ${score.toFixed(1)}% of profitable total`,
    computation_window: 'payoutWindow',
    reference_date: null,
  };
}

function calcStopLossRequired(positions: CanonicalPosition[], rule: RuleInstance): RuleEvaluationResult {
  if (positions.length === 0) return insufficientRuleData(rule, 'No open positions available to verify stop-loss usage.', 'daily');
  const missingStops = positions.filter((position) => position.stop_loss === null).length;
  return {
    status: missingStops > 0 ? 'VIOLATED' : 'APPROVING',
    current_value: missingStops,
    limit_value: 0,
    remaining_value: missingStops > 0 ? 0 : null,
    progress_pct: missingStops > 0 ? 100 : 0,
    message: missingStops > 0 ? `${missingStops} open position(s) without stop loss` : 'All open positions have stop loss',
    computation_window: 'daily',
    reference_date: todayDate(),
  };
}

async function resolveRuleSetVersionId(tradingAccount: TradingAccount): Promise<string | null> {
  const ruleSetId = tradingAccount.rule_set_id;
  if (!isUuid(ruleSetId)) return null;

  const { data: directInstances, error: directErr } = await supabase
    .from('rule_instances')
    .select('id')
    .eq('rule_set_version_id', ruleSetId)
    .eq('enabled', true)
    .limit(1);

  if (!directErr && directInstances && directInstances.length > 0) {
    return ruleSetId;
  }

  const { data: versionsByProgram, error: programErr } = await supabase
    .from('rule_set_versions')
    .select('id')
    .eq('program_id', ruleSetId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);

  if (!programErr && versionsByProgram && versionsByProgram.length > 0) {
    return versionsByProgram[0].id;
  }

  const { data: versionsByFirm, error: firmErr } = await supabase
    .from('rule_set_versions')
    .select('id, programs!inner(prop_firm_id)')
    .eq('programs.prop_firm_id', ruleSetId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);

  if (!firmErr && versionsByFirm && versionsByFirm.length > 0) {
    return versionsByFirm[0].id;
  }

  return null;
}

async function loadRuleInstances(tradingAccount: TradingAccount): Promise<{ rules: RuleInstance[]; warning: string | null }> {
  const ruleSetVersionId = await resolveRuleSetVersionId(tradingAccount);

  const { data: customRows, error: customErr } = await supabase
    .from('account_rule_overrides' as any)
    .select('*, rule_definitions (*)')
    .eq('trading_account_id', tradingAccount.id)
    .eq('enabled', true);

  if (customErr) {
    throw new Error(`Failed to load custom account rules: ${customErr.message}`);
  }

  const customRules = ((customRows ?? []) as any[]).map((row) => ({
    id: row.id,
    rule_set_version_id: ruleSetVersionId ?? tradingAccount.id,
    rule_definition_id: row.rule_definition_id,
    mode: row.mode,
    base_calculation: row.base_calculation,
    includes_floating: row.includes_floating,
    daily_reset: row.daily_reset,
    limit_value: row.limit_value,
    severity: row.severity,
    enabled: row.enabled,
    params: {
      ...(row.params ?? {}),
      is_custom: true,
      review_status: row.review_status,
      source_notes: row.source_notes,
    },
    rule_definitions: row.rule_definitions,
  })) as RuleInstance[];

  if (!ruleSetVersionId) {
    return {
      rules: customRules,
      warning:
        customRules.length > 0
          ? 'Trading account has custom rules but no library rule set version. Confirm whether this account should use Custom-only monitoring.'
          : 'Trading account has no active rule set. Select a prop firm/program or explicitly choose Generic Broker-only before relying on evaluations.',
    };
  }

  const { data, error } = await supabase
    .from('rule_instances')
    .select('*, rule_definitions (*)')
    .eq('rule_set_version_id', ruleSetVersionId)
    .eq('enabled', true);

  if (error) {
    throw new Error(`Failed to load rule instances: ${error.message}`);
  }

  return {
    rules: [...((data ?? []) as RuleInstance[]), ...customRules],
    warning: data && data.length > 0 ? null : 'Resolved rule set version has no enabled rules',
  };
}

function evaluateRule(
  rule: RuleInstance,
  snapshot: CanonicalSnapshot,
  snapshots: CanonicalSnapshot[],
  trades: CanonicalTrade[],
  positions: CanonicalPosition[],
  tradingAccount: TradingAccount,
): RuleEvaluationResult | null {
  const key = rule.rule_definitions?.key;
  let result: RuleEvaluationResult | null = null;
  switch (key) {
    case 'max_daily_loss':
      result = calcMaxDailyLoss(snapshot, tradingAccount, rule);
      break;
    case 'max_total_loss':
    case 'static_drawdown':
      result = calcMaxTotalLoss(snapshot, tradingAccount, rule);
      break;
    case 'trailing_drawdown':
    case 'end_of_day_trailing_drawdown':
    case 'intraday_equity_drawdown':
      result = calcTrailingDrawdown(snapshot, snapshots, tradingAccount, rule);
      break;
    case 'floating_loss_limit':
      result = calcFloatingLossLimit(positions, tradingAccount, rule);
      break;
    case 'profit_target':
      result = calcProfitTarget(snapshot, tradingAccount, rule);
      break;
    case 'min_trading_days':
    case 'payout_min_days':
      result = calcMinTradingDays(trades, rule);
      break;
    case 'profitable_days':
      result = calcProfitableDays(snapshots, rule);
      break;
    case 'consistency_best_day_cap':
      result = calcConsistencyBestDayCap(snapshots, rule);
      break;
    case 'trade_value_score_max_percent':
      result = calcTradeValueScore(trades, snapshots, rule);
      break;
    case 'average_lot_limit':
      result = calcAverageLotLimit(trades, rule);
      break;
    case 'max_lot':
      result = calcMaxLotLimit(trades, positions, rule);
      break;
    case 'stop_loss_required':
      result = calcStopLossRequired(positions, rule);
      break;
    case 'inactivity_limit':
      result = calcInactivity(trades, rule);
      break;
    case 'news_restriction':
    case 'scalping_restriction':
    case 'weekend_holding':
    case 'leverage_limit':
    case 'payout_eligibility':
    case 'profit_split':
    case 'payout_frequency':
    case 'custom_boolean':
    case 'custom_numeric_threshold':
    case 'custom_text_rule':
      result = insufficientRuleData(rule, `Rule "${key}" is tracked but needs manual data or account-specific configuration.`);
      break;
    default:
      return null;
  }

  return result ? buildManagementAdvice(result, rule) : null;
}

async function evaluateRulesForConnection(
  connectionId: string,
  tradingAccountId: string | null,
  latestSnapshot: CanonicalSnapshot,
  latestPositions: CanonicalPosition[],
): Promise<{ evaluated: number; violated: string[]; warning: string[]; skipped: string[]; warningMessage: string | null }> {
  if (!tradingAccountId) {
    return {
      evaluated: 0,
      violated: [],
      warning: [],
      skipped: [],
      warningMessage: 'Connection is not linked to a trading account',
    };
  }

  const { data: tradingAccount, error: accountError } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('id', tradingAccountId)
    .single();

  if (accountError || !tradingAccount) {
    throw new Error(accountError?.message || 'Trading account not found');
  }

  const { rules, warning } = await loadRuleInstances(tradingAccount as TradingAccount);
  if (rules.length === 0) {
    return {
      evaluated: 0,
      violated: [],
      warning: [],
      skipped: [],
      warningMessage: warning,
    };
  }

  const { data: snapshotRows, error: snapshotsError } = await supabase
    .from('mt5_account_snapshots')
    .select('*')
    .eq('connection_id', connectionId)
    .order('date', { ascending: true });

  if (snapshotsError) {
    throw new Error(`Failed to read MT5 snapshots for evaluation: ${snapshotsError.message}`);
  }

  const snapshots = (snapshotRows ?? []).map((row: any) => ({
    date: row.date || todayDate(),
    balance: toNumber(row.balance),
    equity: toNumber(row.equity),
    daily_pnl: toNumber(row.daily_pnl),
    floating_pnl: toNumber(row.floating_pnl),
    drawdown: toNumber(row.drawdown),
    max_balance: toNumber(row.max_balance),
  })) as CanonicalSnapshot[];

  if (!snapshots.some((snapshot) => snapshot.date === latestSnapshot.date)) {
    snapshots.push(latestSnapshot);
  }

  const { data: tradeRows, error: tradesError } = await supabase
    .from('mt5_trades')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: true });

  if (tradesError) {
    throw new Error(`Failed to read MT5 trades for evaluation: ${tradesError.message}`);
  }

  const trades = (tradeRows ?? []).map((row: any) => ({
    ticket: toNumber(row.ticket),
    symbol: row.symbol || '',
    side: row.side || 'unknown',
    volume: toNumber(row.volume),
    open_time: row.open_time || row.created_at || new Date().toISOString(),
    close_time: row.close_time || null,
    open_price: toNumber(row.open_price),
    close_price: toNullableNumber(row.close_price),
    profit: toNumber(row.profit),
    commission: toNumber(row.commission),
    swap: toNumber(row.swap),
    created_at: row.created_at || row.open_time || new Date().toISOString(),
  })) as CanonicalTrade[];

  const violated: string[] = [];
  const warningRules: string[] = [];
  const skipped: string[] = [];
  let evaluated = 0;

  for (const rule of rules) {
    const result = evaluateRule(rule, latestSnapshot, snapshots, trades, latestPositions, tradingAccount as TradingAccount);
    if (!result) {
      skipped.push(rule.rule_definitions?.key || rule.id);
      continue;
    }

    const { error: upsertError } = await supabase
      .from('rule_evaluations' as any)
      .upsert(
        {
          trading_account_id: tradingAccountId,
          rule_instance_id: rule.id,
          connection_id: connectionId,
          status: result.status,
          current_value: result.current_value,
          limit_value: result.limit_value,
          remaining_value: result.remaining_value,
          progress_pct: result.progress_pct,
          message: result.message,
          explanation: result.explanation,
          recommended_action: result.recommended_action,
          severity: result.severity ?? rule.severity,
          next_best_action: result.next_best_action,
          data_status: result.data_status ?? 'ok',
          computation_window: result.computation_window,
          reference_date: result.reference_date,
          computed_at: new Date().toISOString(),
        },
        {
          onConflict: 'trading_account_id,rule_instance_id,reference_date',
        },
      );

    if (upsertError) {
      throw new Error(`Failed to upsert rule evaluation: ${upsertError.message}`);
    }

    evaluated++;
    const ruleName = rule.rule_definitions?.name || rule.rule_definitions?.key || rule.id;
    if (result.status === 'VIOLATED') violated.push(ruleName);
    if (result.status === 'WARNING') warningRules.push(ruleName);
  }

  if (violated.length > 0) {
    const { error: statusError } = await supabase
      .from('trading_accounts')
      .update({ status: 'violated' })
      .eq('id', tradingAccountId);

    if (statusError) {
      throw new Error(`Failed to mark trading account as violated: ${statusError.message}`);
    }
  }

  return {
    evaluated,
    violated,
    warning: warningRules,
    skipped,
    warningMessage: warning,
  };
}

fastify.get('/health', async () => {
  return {
    ok: true,
    service: 'metaapi-gateway',
    region: METAAPI_REGION,
  };
});

fastify.get('/admin/summary', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin', 120, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const users = await listAuthUsersForAdmin();
    const emailMap = buildUserEmailMap(users);
    const [subscriptionsRes, connectionsRes] = await Promise.all([
      supabase.from('user_subscriptions' as any).select('*') as any,
      supabase.from('mt5_connections').select('*').order('created_at', { ascending: false }),
    ]);

    if (subscriptionsRes.error) throw subscriptionsRes.error;
    if (connectionsRes.error) throw connectionsRes.error;

    const subscriptions = subscriptionsRes.data || [];
    const connections = connectionsRes.data || [];
    const activeSubscriptions = subscriptions.filter((sub: JsonRecord) => ['active', 'trialing'].includes(String(sub.status))).length;
    const betaUsers = subscriptions.filter((sub: JsonRecord) => sub.plan_id === 'beta_free' && ['active', 'trialing'].includes(String(sub.status))).length;
    const connectedAccounts = connections.filter((conn: JsonRecord) => ['connected', 'connecting', 'syncing'].includes(String(conn.connection_status))).length;
    const syncErrors = connections.filter((conn: JsonRecord) => conn.sync_error || ['error', 'failed'].includes(String(conn.sync_status))).length;
    const accountsByPlan = subscriptions.reduce((acc: Record<string, number>, sub: JsonRecord) => {
      const key = String(sub.plan_id || sub.plan_name || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const recentUsers = [...users]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 10);
    const recentConnections = connections
      .slice(0, 10)
      .map((connection: JsonRecord) => sanitizeConnection(connection, emailMap.get(connection.user_id) || null));

    return reply.send({
      totalUsers: users.length,
      activeSubscriptions,
      betaUsers,
      connectedAccounts,
      syncErrors,
      accountsByPlan,
      recentUsers,
      recentConnections,
    });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_summary_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to load admin summary',
      code: 'admin_summary_failed',
      details: error?.message,
    });
  }
});

fastify.get('/admin/users', async (request, reply) => {
  try {
    const rateLimit = checkRateLimit(request, 'admin', 120, 60_000);
    if (!rateLimit.allowed) return reply.status(429).send(rateLimitError(rateLimit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const rows = await getAdminUserRows();
    const page = toPositiveInteger(getQueryParam(request, 'page'), 1, 1000);
    const pageLimit = toPositiveInteger(getQueryParam(request, 'limit'), 25, 100);
    const result = filterAndPaginateRows(rows, {
      search: getQueryParam(request, 'search'),
      status: getQueryParam(request, 'status'),
      plan: getQueryParam(request, 'plan'),
      page,
      limit: pageLimit,
    });

    return reply.send({ users: result.rows, pagination: result.pagination });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_users_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to load admin users',
      code: 'admin_users_failed',
      details: error?.message,
    });
  }
});

fastify.get('/admin/users/:userId', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin', 120, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const { userId } = request.params as { userId?: string };
    if (!isUuid(userId)) {
      return reply.status(400).send({ error: 'A valid userId is required', code: 'invalid_user_id' });
    }

    const [profile, subscriptionRes, connectionsRes, accountsRes] = await Promise.all([
      getAuthUserForAdmin(userId),
      (supabase.from('user_subscriptions' as any).select('*').eq('user_id', userId).maybeSingle() as any),
      supabase.from('mt5_connections').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('trading_accounts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (!profile) return reply.status(404).send({ error: 'User not found', code: 'user_not_found' });
    if (subscriptionRes.error) throw subscriptionRes.error;
    if (connectionsRes.error) throw connectionsRes.error;
    if (accountsRes.error) throw accountsRes.error;

    const accountIds = (accountsRes.data || []).map((account: JsonRecord) => account.id).filter(Boolean);
    const ruleSummaries = await loadRuleEvaluationSummary(accountIds);
    const recentSync = (connectionsRes.data || [])
      .map((conn: JsonRecord) => conn.last_sync_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null;

    return reply.send({
      profile,
      subscription: sanitizeSubscription(subscriptionRes.data),
      connectedAccounts: (connectionsRes.data || []).map((connection: JsonRecord) => sanitizeConnection(connection, profile.email)),
      tradingAccounts: (accountsRes.data || []).map((account: JsonRecord) => ({
        ...sanitizeTradingAccount(account),
        ruleStatusSummary: ruleSummaries.get(account.id) || null,
      })),
      recentSyncStatus: {
        last_sync_at: recentSync,
        sync_error_count: (connectionsRes.data || []).filter((connection: JsonRecord) => connection.sync_error || ['error', 'failed'].includes(String(connection.sync_status))).length,
      },
    });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_user_detail_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to load admin user detail',
      code: 'admin_user_detail_failed',
      details: error?.message,
    });
  }
});

fastify.post('/admin/users/:userId/subscription', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin-write', 60, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const { userId } = request.params as { userId?: string };
    if (!isUuid(userId)) {
      return reply.status(400).send({ error: 'A valid userId is required', code: 'invalid_user_id' });
    }

    const body = request.body as JsonRecord;
    const selector = String(body?.planId || body?.planSlug || body?.plan || '').trim();
    if (!selector) {
      return reply.status(400).send({ error: 'planId or planSlug is required', code: 'admin_plan_required' });
    }

    const plan = await findAdminPlanBySelector(selector);
    if (!plan) {
      return reply.status(400).send({ error: 'Selected plan was not found', code: 'admin_plan_not_found' });
    }

    const status = normalizeAdminStatus(body?.status, 'active');
    const accountLimit = Math.max(0, Math.floor(toNumber(body?.accountLimit, plan.account_limit)));
    const currentPeriodEnd = parsePeriodEnd(body?.currentPeriodEnd, defaultPeriodEndForPlan(plan));

    const { data, error } = await (supabase
      .from('user_subscriptions' as any)
      .upsert({
        user_id: userId,
        plan_id: plan.id,
        plan_name: plan.plan_name,
        status,
        account_limit: accountLimit,
        current_period_start: new Date().toISOString(),
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('*')
      .single() as any);

    if (error) throw error;

    fastify.log.info({
      event: 'admin_subscription_updated',
      adminUserId: maskForLog(adminResult.id),
      targetUserId: maskForLog(userId),
      planId: plan.id,
      status,
    });

    return reply.send({ subscription: sanitizeSubscription(data) });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_subscription_update_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to update user subscription',
      code: 'admin_subscription_update_failed',
      details: error?.message,
    });
  }
});

fastify.post('/admin/users/:userId/block', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin-write', 60, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const { userId } = request.params as { userId?: string };
    if (!isUuid(userId)) {
      return reply.status(400).send({ error: 'A valid userId is required', code: 'invalid_user_id' });
    }

    const body = request.body as JsonRecord;
    const blocked = body?.blocked !== false;

    const { data: existing, error: existingError } = await (supabase
      .from('user_subscriptions' as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle() as any);

    if (existingError) throw existingError;

    const plan = existing?.plan_id
      ? await findAdminPlanBySelector(existing.plan_id)
      : await findAdminPlanBySelector('beta_free');
    if (!plan) {
      return reply.status(409).send({ error: 'No plan available for block operation', code: 'admin_plan_not_found' });
    }

    const nextStatus = blocked ? 'suspended' : 'active';
    const { data, error } = await (supabase
      .from('user_subscriptions' as any)
      .upsert({
        user_id: userId,
        plan_id: existing?.plan_id || plan.id,
        plan_name: existing?.plan_name || plan.plan_name,
        status: nextStatus,
        account_limit: Number(existing?.account_limit ?? plan.account_limit),
        current_period_start: existing?.current_period_start || new Date().toISOString(),
        current_period_end: existing?.current_period_end || defaultPeriodEndForPlan(plan),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('*')
      .single() as any);

    if (error) throw error;

    fastify.log.info({
      event: 'admin_user_block_status_updated',
      adminUserId: maskForLog(adminResult.id),
      targetUserId: maskForLog(userId),
      blocked,
    });

    return reply.send({ blocked, subscription: sanitizeSubscription(data) });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_user_block_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to update user block status',
      code: 'admin_user_block_failed',
      details: error?.message,
    });
  }
});

fastify.get('/admin/plans', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin', 120, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const { data, error } = await (supabase
      .from('plans' as any)
      .select('*')
      .order('account_limit', { ascending: true }) as any);

    if (error) throw error;
    return reply.send({ plans: (data || []).map(sanitizePlan) });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_plans_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to load plans',
      code: 'admin_plans_failed',
      details: error?.message,
    });
  }
});

fastify.post('/admin/plans', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin-write', 60, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const body = request.body as JsonRecord;
    const slug = String(body?.slug || body?.id || '').trim().toLowerCase();
    const name = String(body?.name || body?.plan_name || '').trim();
    if (!slug || !name || !isSafePlanSelector(slug)) {
      return reply.status(400).send({
        error: 'A safe slug and name are required',
        code: 'admin_invalid_plan_payload',
      });
    }

    const active = body?.active !== false && String(body?.status || 'active') !== 'inactive';
    const priceAmount = body?.price_amount ?? body?.priceAmount ?? body?.price_cents ?? null;
    const stripeProductId = String(body?.stripe_product_id || body?.stripeProductId || '').trim() || null;
    const stripePriceId = String(body?.stripe_price_id || body?.stripePriceId || '').trim() || null;
    const accountLimit = Math.max(0, Math.floor(toNumber(body?.account_limit ?? body?.accountLimit, 0)));

    const { data, error } = await (supabase
      .from('plans' as any)
      .upsert({
        id: String(body?.id || slug),
        plan_name: name,
        name,
        slug,
        status: active ? 'active' : 'inactive',
        active,
        account_limit: accountLimit,
        support_tier: body?.support_tier || body?.supportTier || 'basic',
        billing_interval: body?.billing_interval || body?.billingInterval || null,
        price_cents: toNullableNumber(priceAmount),
        price_amount: toNullableNumber(priceAmount),
        currency: String(body?.currency || 'brl').toLowerCase(),
        plan_features: Array.isArray(body?.plan_features) ? body.plan_features : [],
        display_order: toPositiveInteger(body?.display_order ?? body?.displayOrder, 100, 1000),
        highlighted: Boolean(body?.highlighted),
        recommended_badge: body?.recommended_badge || body?.recommendedBadge || null,
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select('*')
      .single() as any);

    if (error) throw error;

    fastify.log.info({
      event: 'admin_plan_upserted',
      adminUserId: maskForLog(adminResult.id),
      planId: data.id,
      hasStripeProduct: Boolean(stripeProductId),
      hasStripePrice: Boolean(stripePriceId),
    });

    return reply.send({ plan: sanitizePlan(data) });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_plan_upsert_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to save plan',
      code: 'admin_plan_upsert_failed',
      details: error?.message,
    });
  }
});

fastify.post('/admin/plans/resolve-stripe-prices', async (request, reply) => {
  try {
    const rateLimit = checkRateLimit(request, 'admin-write', 20, 60_000);
    if (!rateLimit.allowed) return reply.status(429).send(rateLimitError(rateLimit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    if (!STRIPE_SECRET_KEY) {
      return reply.status(503).send(stripeConfigError());
    }

    const result = await resolveStripePricesForPlans();
    fastify.log.info({
      event: 'admin_stripe_prices_resolved',
      adminUserId: maskForLog(adminResult.id),
      resolvedCount: result.resolved.length,
      missingCount: result.missing.length,
    });
    return reply.send(result);
  } catch (error: any) {
    fastify.log.error({
      event: 'admin_stripe_prices_resolve_failed',
      error: error?.message,
      stripeCode: error?.body?.error?.code,
    });
    return reply.status(error?.status && error.status < 500 ? 400 : 500).send({
      error: error?.message || 'Não foi possível resolver os Price IDs da Stripe.',
      code: 'admin_stripe_prices_resolve_failed',
      details: error?.body?.error?.code,
    });
  }
});

fastify.get('/admin/accounts', async (request, reply) => {
  try {
    const rateLimit = checkRateLimit(request, 'admin', 120, 60_000);
    if (!rateLimit.allowed) return reply.status(429).send(rateLimitError(rateLimit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const page = toPositiveInteger(getQueryParam(request, 'page'), 1, 1000);
    const pageLimit = toPositiveInteger(getQueryParam(request, 'limit'), 25, 100);
    const search = getQueryParam(request, 'search').toLowerCase();
    const status = getQueryParam(request, 'status').toLowerCase();
    const syncStatus = getQueryParam(request, 'sync_status').toLowerCase();

    const [users, accountMap, connectionsRes] = await Promise.all([
      listAuthUsersForAdmin(),
      loadTradingAccountMap(),
      supabase.from('mt5_connections').select('*').order('created_at', { ascending: false }),
    ]);

    if (connectionsRes.error) throw connectionsRes.error;
    const emailMap = buildUserEmailMap(users);
    const accounts = (connectionsRes.data || []).map((connection: JsonRecord) => {
      const tradingAccount = accountMap.get(connection.trading_account_id) as JsonRecord | undefined;
      return {
        ...sanitizeConnection(connection, emailMap.get(connection.user_id) || null),
        trading_account_nickname: tradingAccount?.nickname || null,
        rule_status: tradingAccount?.rule_selection_status || null,
        trading_account_status: tradingAccount?.status || null,
      };
    }).filter((row: JsonRecord) => {
      const haystack = JSON.stringify(row).toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      const matchesStatus = !status || String(row.connection_status || '').toLowerCase() === status;
      const matchesSync = !syncStatus || String(row.sync_status || '').toLowerCase() === syncStatus;
      return matchesSearch && matchesStatus && matchesSync;
    });

    const result = paginateRows(accounts, page, pageLimit);
    return reply.send({ accounts: result.rows, pagination: result.pagination });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_accounts_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to load MT5 accounts',
      code: 'admin_accounts_failed',
      details: error?.message,
    });
  }
});

fastify.post('/admin/accounts/:accountId/force-sync', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin-write', 60, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const { accountId } = request.params as { accountId?: string };
    if (!isUuid(accountId)) {
      return reply.status(400).send({ error: 'A valid accountId is required', code: 'invalid_account_id' });
    }

    const { data: connection, error } = await supabase
      .from('mt5_connections')
      .select('id,user_id')
      .eq('id', accountId)
      .single();

    if (error || !connection) {
      return reply.status(404).send({ error: 'MT5 connection not found', code: 'mt5_connection_not_found' });
    }

    const authHeader = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const syncResponse = await fetch(`http://127.0.0.1:${PORT}/metaapi/sync`, {
      method: 'POST',
      headers: {
        Authorization: authHeader || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectionId: connection.id,
        userId: connection.user_id,
      }),
    });
    const text = await syncResponse.text();
    const body = parseJsonText(text);

    fastify.log.info({
      event: 'admin_force_sync_completed',
      adminUserId: maskForLog(adminResult.id),
      connectionId: maskForLog(connection.id),
      status: syncResponse.status,
    });

    return reply.status(syncResponse.status).send(body || { raw: text });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_force_sync_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to force MT5 sync',
      code: 'admin_force_sync_failed',
      details: error?.message,
    });
  }
});

fastify.post('/admin/accounts/:accountId/soft-remove', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin-write', 60, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const { accountId } = request.params as { accountId?: string };
    if (!isUuid(accountId)) {
      return reply.status(400).send({ error: 'A valid accountId is required', code: 'invalid_account_id' });
    }

    const { data: connection, error: readError } = await supabase
      .from('mt5_connections')
      .select('*')
      .eq('id', accountId)
      .single();

    if (readError || !connection) {
      return reply.status(404).send({ error: 'MT5 connection not found', code: 'mt5_connection_not_found' });
    }

    const { data, error } = await supabase
      .from('mt5_connections')
      .update({
        connection_status: 'disconnected',
        sync_status: 'removed',
        sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select('*')
      .single();

    if (error) throw error;

    if (connection.trading_account_id) {
      const { error: accountError } = await supabase
        .from('trading_accounts')
        .update({
          status: 'inactive',
          mt5_connection_status: 'disconnected',
          mt5_sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.trading_account_id)
        .eq('user_id', connection.user_id);

      if (accountError) throw accountError;
    }

    fastify.log.info({
      event: 'admin_connection_soft_removed',
      adminUserId: maskForLog(adminResult.id),
      connectionId: maskForLog(accountId),
    });

    return reply.send({ connection: sanitizeConnection(data) });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_connection_soft_remove_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to soft remove MT5 account',
      code: 'admin_connection_soft_remove_failed',
      details: error?.message,
    });
  }
});

fastify.get('/admin/rules', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin', 120, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const [firmsRes, programsRes, ruleSetsRes, instancesRes, definitionsRes] = await Promise.all([
      supabase.from('prop_firms').select('*').order('name', { ascending: true }),
      supabase.from('programs').select('*').order('name', { ascending: true }),
      supabase.from('rule_set_versions').select('*').order('created_at', { ascending: false }),
      supabase.from('rule_instances').select('id,rule_set_version_id,enabled,review_status'),
      supabase.from('rule_definitions').select('id,key,name,category').order('name', { ascending: true }),
    ]);

    if (firmsRes.error) throw firmsRes.error;
    if (programsRes.error) throw programsRes.error;
    if (ruleSetsRes.error) throw ruleSetsRes.error;
    if (instancesRes.error) throw instancesRes.error;
    if (definitionsRes.error) throw definitionsRes.error;

    const firmsById = new Map((firmsRes.data || []).map((firm: JsonRecord) => [firm.id, firm]));
    const programsById = new Map((programsRes.data || []).map((program: JsonRecord) => [program.id, program]));
    const instanceCounts = new Map<string, number>();
    for (const instance of instancesRes.data || []) {
      instanceCounts.set(instance.rule_set_version_id, (instanceCounts.get(instance.rule_set_version_id) || 0) + 1);
    }

    const ruleSets = (ruleSetsRes.data || []).map((ruleSet: JsonRecord) => {
      const program = programsById.get(ruleSet.program_id) as JsonRecord | undefined;
      const firm = program ? firmsById.get(program.prop_firm_id) as JsonRecord | undefined : undefined;
      return {
        id: ruleSet.id,
        name: ruleSet.name,
        status: ruleSet.status,
        review_status: ruleSet.review_status,
        verified_at: ruleSet.verified_at,
        source_url: ruleSet.source_url,
        source_notes: ruleSet.source_notes,
        is_user_custom: ruleSet.is_user_custom,
        rule_count: instanceCounts.get(ruleSet.id) || 0,
        program: program ? {
          id: program.id,
          name: program.name,
          review_status: program.review_status,
          account_size: program.account_size,
          phase: program.phase,
        } : null,
        prop_firm: firm ? {
          id: firm.id,
          name: firm.name,
          slug: firm.slug,
        } : null,
      };
    });

    const needsReviewCount = ruleSets.filter((ruleSet: JsonRecord) => ruleSet.review_status === 'needs_review').length;

    return reply.send({
      propFirms: firmsRes.data || [],
      programs: programsRes.data || [],
      ruleSets,
      ruleDefinitions: definitionsRes.data || [],
      needsReviewCount,
    });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_rules_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to load rules library',
      code: 'admin_rules_failed',
      details: error?.message,
    });
  }
});

fastify.post('/admin/rules/:id/review', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin-write', 60, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const { id } = request.params as { id?: string };
    if (!isUuid(id)) {
      return reply.status(400).send({ error: 'A valid rule set id is required', code: 'invalid_rule_set_id' });
    }

    const body = request.body as JsonRecord;
    const reviewStatus = String(body?.reviewStatus || body?.review_status || '').trim();
    if (!['verified', 'needs_review', 'deprecated'].includes(reviewStatus)) {
      return reply.status(400).send({
        error: 'reviewStatus must be verified, needs_review or deprecated',
        code: 'invalid_review_status',
      });
    }

    const { data, error } = await supabase
      .from('rule_set_versions')
      .update({
        review_status: reviewStatus,
        source_url: body?.sourceUrl ?? body?.source_url ?? null,
        source_notes: body?.sourceNotes ?? body?.source_notes ?? null,
        verified_at: reviewStatus === 'verified' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    fastify.log.info({
      event: 'admin_rule_review_updated',
      adminUserId: maskForLog(adminResult.id),
      ruleSetId: maskForLog(id),
      reviewStatus,
    });

    return reply.send({ ruleSet: data });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_rule_review_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to update rule review status',
      code: 'admin_rule_review_failed',
      details: error?.message,
    });
  }
});

fastify.get('/admin/system', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'admin', 120, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const adminResult = await verifyAdminRequest(request);
    if (isAuthError(adminResult)) return reply.status(adminResult.status).send(adminResult.error);

    const { data: plans, error: supabaseError } = await (supabase
      .from('plans' as any)
      .select('id,stripe_product_id,stripe_price_id')
      .eq('status', 'active')
      .eq('active', true) as any);
    const billablePlans = (plans || []).filter((plan: JsonRecord) => plan.id !== 'beta_free');
    const productPriceMappingComplete =
      billablePlans.length > 0 &&
      billablePlans.every((plan: JsonRecord) => isStripeProductId(plan.stripe_product_id) && isStripePriceId(plan.stripe_price_id));

    return reply.send({
      gateway: {
        ok: true,
        region: METAAPI_REGION,
        port: PORT,
      },
      stripeConfigured: Boolean(STRIPE_SECRET_KEY),
      stripeWebhookConfigured: Boolean(STRIPE_WEBHOOK_SECRET),
      productPriceMappingComplete,
      metaapiTokenConfigured: Boolean(METAAPI_TOKEN),
      supabaseConnected: !supabaseError,
      supabaseError: supabaseError?.message || null,
      env: {
        allowBetaFallback: FORTIFY_ALLOW_BETA_FALLBACK,
        successUrlConfigured: Boolean(STRIPE_SUCCESS_URL),
        cancelUrlConfigured: Boolean(STRIPE_CANCEL_URL),
      },
    });
  } catch (error: any) {
    fastify.log.error({ event: 'admin_system_failed', error: error?.message });
    return reply.status(500).send({
      error: 'Failed to load system status',
      code: 'admin_system_failed',
      details: error?.message,
    });
  }
});

fastify.get('/billing/subscription-status', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'billing', 60, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const authResult = await verifyBearerUser(request);
    if (isAuthError(authResult)) {
      return reply.status(authResult.status).send(authResult.error);
    }

    const status = await getSubscriptionStatusForUser(authResult.id);
    return reply.send(status);
  } catch (error: any) {
    fastify.log.error({
      event: 'billing_subscription_status_failed',
      error: error?.message,
    });
    return reply.status(500).send({
      error: 'Não foi possível carregar o status da assinatura.',
      code: 'billing_subscription_status_failed',
      details: error?.message,
    });
  }
});

fastify.post('/billing/confirm-checkout-session', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'billing', 30, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const authResult = await verifyBearerUser(request);
    if (isAuthError(authResult)) {
      return reply.status(authResult.status).send(authResult.error);
    }

    const body = request.body as { sessionId?: string };
    const sessionId = String(body?.sessionId || '').trim();
    if (!isStripeCheckoutSessionId(sessionId)) {
      return reply.status(400).send({
        error: 'Sessão de checkout inválida.',
        code: 'invalid_checkout_session',
      });
    }

    if (!STRIPE_SECRET_KEY) {
      return reply.status(503).send(stripeConfigError());
    }

    const session = await stripeGet(
      `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription&expand[]=line_items`,
    );
    const sessionUserId = String(session.metadata?.user_id || session.client_reference_id || '').trim();
    if (sessionUserId !== authResult.id) {
      fastify.log.warn({
        event: 'stripe_checkout_session_user_mismatch',
        sessionId: maskForLog(sessionId),
        sessionUserId: maskForLog(sessionUserId),
        authUserId: maskForLog(authResult.id),
      });
      return reply.status(403).send({
        error: 'Esta sessão de checkout não pertence ao usuário autenticado.',
        code: 'checkout_session_user_mismatch',
      });
    }

    const subscription = typeof session.subscription === 'object' ? session.subscription : null;
    const subscriptionStatus = String(subscription?.status || '').toLowerCase();
    const paymentConfirmed =
      session.payment_status === 'paid' ||
      ['active', 'trialing'].includes(subscriptionStatus);

    if (!paymentConfirmed) {
      return reply.status(409).send({
        error: 'Pagamento ainda não confirmado pela Stripe.',
        code: 'stripe_payment_not_confirmed',
        payment_status: session.payment_status || null,
        subscription_status: subscriptionStatus || null,
      });
    }

    const priceId = getPlanPriceIdFromSession(session, subscription);
    if (!isStripePriceId(priceId)) {
      return reply.status(409).send({
        error: 'Não foi possível identificar o Price ID da Stripe nesta sessão.',
        code: 'stripe_price_missing',
      });
    }

    const plan = await findBillingPlanByStripePriceId(priceId);
    if (!plan) {
      return reply.status(409).send({
        error: 'O Price ID pago ainda não está mapeado a um plano Fortify.',
        code: 'stripe_price_not_mapped',
      });
    }

    if (subscription) {
      await upsertSubscriptionFromStripe(subscription, authResult.id);
    } else {
      const currentPeriodEnd = defaultPeriodEndForPlan(plan);
      const stripeCustomerId = getStripeId(session.customer);
      const stripeSubscriptionId = getStripeId(session.subscription);
      const { error } = await (supabase
        .from('user_subscriptions' as any)
        .upsert({
          user_id: authResult.id,
          plan_id: plan.id,
          plan_name: plan.plan_name,
          status: 'active',
          account_limit: plan.account_limit,
          current_period_start: new Date().toISOString(),
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: false,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }) as any);
      if (error) throw error;
    }

    const status = await getSubscriptionStatusForUser(authResult.id);
    fastify.log.info({
      event: 'stripe_checkout_session_confirmed',
      userId: maskForLog(authResult.id),
      sessionId: maskForLog(sessionId),
      planId: plan.id,
    });

    return reply.send(status);
  } catch (error: any) {
    fastify.log.error({
      event: 'stripe_checkout_session_confirm_failed',
      error: error?.message,
      status: error?.status,
      stripeCode: error?.body?.error?.code,
    });
    return reply.status(error?.status && error.status < 500 ? 400 : 500).send({
      error: error?.message || 'Não foi possível confirmar o checkout Stripe.',
      code: 'stripe_checkout_confirm_failed',
      details: error?.body?.error?.code,
    });
  }
});

fastify.post('/billing/create-checkout-session', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'billing', 30, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const authResult = await verifyBearerUser(request);
    if (isAuthError(authResult)) {
      return reply.status(authResult.status).send(authResult.error);
    }

    const body = request.body as {
      planSlug?: string;
      plan_slug?: string;
      planId?: string;
      priceId?: string;
    };
    const selector = String(body?.planSlug || body?.plan_slug || body?.planId || body?.priceId || '').trim();
    if (!selector) {
      return reply.status(400).send({
        error: 'Informe o plano desejado antes de iniciar o checkout.',
        code: 'billing_plan_required',
      });
    }

    const plan = await findBillingPlanBySelector(selector);
    if (!plan) {
      return reply.status(400).send({
        error: 'Plano Fortify não encontrado ou inativo.',
        code: 'invalid_billing_plan',
      });
    }

    if (plan.id === 'beta_free') {
      return reply.status(400).send({
        error: 'O plano beta não usa checkout Stripe.',
        code: 'beta_plan_not_checkoutable',
      });
    }

    if (!plan.stripe_price_id || !isStripePriceId(plan.stripe_price_id)) {
      return reply.status(400).send({
        error: 'Este plano ainda não possui um Price ID válido da Stripe.',
        code: 'stripe_price_missing',
        details: isStripeProductId(plan.stripe_price_id)
          ? 'O plano está usando Product ID. Resolva e salve o Price ID recorrente correto.'
          : 'Salve um ID iniciado por price_ no cadastro do plano.',
      });
    }

    if (!STRIPE_SECRET_KEY) {
      return reply.status(503).send(stripeConfigError());
    }

    const { data: subscription } = await (supabase
      .from('user_subscriptions' as any)
      .select('stripe_customer_id')
      .eq('user_id', authResult.id)
      .maybeSingle() as any);

    let stripeCustomerId = subscription?.stripe_customer_id || null;
    if (!stripeCustomerId && authResult.email) {
      const customer = await stripeRequest('/customers', {
        email: authResult.email,
        'metadata[user_id]': authResult.id,
      });
      stripeCustomerId = getStripeId(customer.id);
      if (stripeCustomerId) {
        await (supabase
          .from('user_subscriptions' as any)
          .update({
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', authResult.id) as any);
      }
    }

    const params: Record<string, unknown> = {
      mode: 'subscription',
      success_url: checkoutSuccessUrl(),
      cancel_url: STRIPE_CANCEL_URL,
      client_reference_id: authResult.id,
      'line_items[0][price]': plan.stripe_price_id,
      'line_items[0][quantity]': 1,
      'metadata[user_id]': authResult.id,
      'metadata[plan_id]': plan.id,
      'metadata[plan_slug]': plan.slug || plan.id,
      'subscription_data[metadata][user_id]': authResult.id,
      'subscription_data[metadata][plan_id]': plan.id,
      'subscription_data[metadata][plan_slug]': plan.slug || plan.id,
      allow_promotion_codes: true,
    };

    if (stripeCustomerId) {
      params.customer = stripeCustomerId;
    } else if (authResult.email) {
      params.customer_email = authResult.email;
    }

    const checkoutSession = await stripeRequest('/checkout/sessions', params);

    fastify.log.info({
      event: 'stripe_checkout_session_created',
      userId: maskForLog(authResult.id),
      planId: plan.id,
      sessionId: maskForLog(checkoutSession.id),
    });

    return reply.send({
      checkout_url: checkoutSession.url,
      session_id: checkoutSession.id,
    });
  } catch (error: any) {
    fastify.log.error({
      event: 'stripe_checkout_session_failed',
      error: error?.message,
      status: error?.status,
      stripeCode: error?.body?.error?.code,
    });
    return reply.status(error?.status && error.status < 500 ? 400 : 500).send({
      error: error?.message || 'Failed to create Stripe checkout session',
      code: 'stripe_checkout_failed',
      details: error?.body?.error?.code,
    });
  }
});

fastify.post('/billing/create-portal-session', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'billing', 30, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const authResult = await verifyBearerUser(request);
    if (isAuthError(authResult)) {
      return reply.status(authResult.status).send(authResult.error);
    }

    const { data: subscription, error } = await (supabase
      .from('user_subscriptions' as any)
      .select('stripe_customer_id')
      .eq('user_id', authResult.id)
      .maybeSingle() as any);

    if (error) {
      return reply.status(500).send({
        error: 'Failed to load user subscription',
        code: 'subscription_lookup_failed',
        details: error.message,
      });
    }

    if (!subscription?.stripe_customer_id) {
      return reply.status(404).send({
        error: 'Você ainda não possui uma assinatura ativa. Escolha um plano para começar.',
        code: 'stripe_customer_missing',
      });
    }

    if (!STRIPE_SECRET_KEY) {
      return reply.status(503).send(stripeConfigError());
    }

    const portalSession = await stripeRequest('/billing_portal/sessions', {
      customer: subscription.stripe_customer_id,
      return_url: STRIPE_CUSTOMER_PORTAL_RETURN_URL,
    });

    fastify.log.info({
      event: 'stripe_portal_session_created',
      userId: maskForLog(authResult.id),
      customerId: maskForLog(subscription.stripe_customer_id),
    });

    return reply.send({
      portal_url: portalSession.url,
    });
  } catch (error: any) {
    fastify.log.error({
      event: 'stripe_portal_session_failed',
      error: error?.message,
      status: error?.status,
      stripeCode: error?.body?.error?.code,
    });
    return reply.status(error?.status && error.status < 500 ? 400 : 500).send({
      error: error?.message || 'Failed to create Stripe portal session',
      code: 'stripe_portal_failed',
      details: error?.body?.error?.code,
    });
  }
});

fastify.post('/billing/webhook', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'billing-webhook', 180, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    if (!STRIPE_WEBHOOK_SECRET) {
      return reply.status(503).send(stripeWebhookConfigError());
    }

    const rawBody = (request as any).rawBody as Buffer | undefined;
    const signatureHeader = Array.isArray(request.headers['stripe-signature'])
      ? request.headers['stripe-signature'][0]
      : request.headers['stripe-signature'];

    if (!rawBody || !verifyStripeWebhookSignature(rawBody, signatureHeader)) {
      return reply.status(400).send({
        error: 'Invalid Stripe webhook signature',
        code: 'stripe_signature_invalid',
      });
    }

    const event = JSON.parse(rawBody.toString('utf8')) as JsonRecord;
    const eventType = String(event.type || '');
    const object = event.data?.object || {};

    fastify.log.info({
      event: 'stripe_webhook_received',
      stripeEventId: maskForLog(event.id),
      type: eventType,
    });

    if (eventType === 'checkout.session.completed') {
      const subscriptionId = getStripeId(object.subscription);
      const fallbackUserId = object.metadata?.user_id || object.client_reference_id || null;
      if (subscriptionId && STRIPE_SECRET_KEY) {
        await syncSubscriptionById(subscriptionId, fallbackUserId);
      }
    } else if (
      eventType === 'customer.subscription.created' ||
      eventType === 'customer.subscription.updated' ||
      eventType === 'customer.subscription.deleted'
    ) {
      await upsertSubscriptionFromStripe(object);
    } else if (eventType === 'invoice.payment_succeeded') {
      const subscriptionId = getStripeId(object.subscription);
      if (subscriptionId && STRIPE_SECRET_KEY) {
        await syncSubscriptionById(subscriptionId);
      }
    } else if (eventType === 'invoice.payment_failed') {
      const subscriptionId = getStripeId(object.subscription);
      if (subscriptionId) {
        const { error } = await (supabase
          .from('user_subscriptions' as any)
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId) as any);
        if (error) throw error;
      }
    }

    return reply.send({ received: true });
  } catch (error: any) {
    fastify.log.error({
      event: 'stripe_webhook_failed',
      error: error?.message,
    });
    return reply.status(500).send({
      error: error?.message || 'Failed to process Stripe webhook',
      code: 'stripe_webhook_failed',
    });
  }
});

fastify.post('/metaapi/connect', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'metaapi-connect', 20, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const body = request.body as {
      accountName?: string;
      mt5Login?: string;
      mt5Server?: string;
      brokerName?: string;
      mt5Password?: string;
      tradingAccountId?: string | null;
      userId?: string;
    };

    const accountName = String(body?.accountName ?? '').trim();
    const mt5Login = String(body?.mt5Login ?? '').trim();
    const mt5Server = String(body?.mt5Server ?? '').trim();
    const brokerName = String(body?.brokerName ?? '').trim() || 'Unknown';
    const mt5Password = String(body?.mt5Password ?? '');
    const tradingAccountId =
      typeof body?.tradingAccountId === 'string' && body.tradingAccountId.trim().length > 0
        ? body.tradingAccountId.trim()
        : null;
    const userId = String(body?.userId ?? '').trim();

    if (!accountName || !mt5Login || !mt5Server || !userId) {
      return reply.status(400).send({
        error: 'accountName, mt5Login, mt5Server and userId are required',
      });
    }

    const authResult = await verifyRequestUser(request, userId);
    if (isAuthError(authResult)) {
      return reply.status(authResult.status).send(authResult.error);
    }

    let otherUserConnection: JsonRecord | null = null;
    try {
      otherUserConnection = await findOtherUserMt5Connection(userId, mt5Login, mt5Server);
    } catch (lookupError: any) {
      fastify.log.error({
        event: 'metaapi_connect_duplicate_lookup_failed',
        userId: maskForLog(userId),
        mt5Login: maskForLog(mt5Login),
        mt5Server,
        error: lookupError?.message,
      });
      return reply.status(500).send({
        error: 'Supabase lookup failed while checking duplicate MT5 ownership',
        code: 'supabase_lookup_failed',
        details: lookupError?.message,
      });
    }

    if (otherUserConnection) {
      fastify.log.warn({
        event: 'metaapi_connect_duplicate_mt5_blocked',
        requestingUserId: maskForLog(userId),
        existingUserId: maskForLog(otherUserConnection.user_id),
        existingConnectionId: maskForLog(otherUserConnection.id),
        mt5Login: maskForLog(mt5Login),
        mt5Server,
      });
      return reply.status(409).send({
        error: 'This MT5 login/server is already connected to another Fortify user',
        code: 'duplicate_mt5_account',
      });
    }

    const accountLimitCheck = await enforceAccountLimitForConnect({
      userId,
      mt5Login,
      mt5Server,
      tradingAccountId,
    });

    if (!accountLimitCheck.allowed) {
      fastify.log.warn({
        event: 'metaapi_connect_plan_blocked',
        userId: maskForLog(userId),
        status: accountLimitCheck.status,
        planName: accountLimitCheck.planName,
        accountLimit: accountLimitCheck.accountLimit,
        activeAccountCount: accountLimitCheck.activeAccountCount,
      });
      return reply.status(accountLimitCheck.httpStatus ?? 402).send({
        error: accountLimitCheck.error || 'Active Fortify plan required before connecting MT5',
        code: accountLimitCheck.code || accountLimitCheck.status,
        planName: accountLimitCheck.planName,
        accountLimit: accountLimitCheck.accountLimit,
        activeAccountCount: accountLimitCheck.activeAccountCount,
        remainingAccounts: accountLimitCheck.remainingAccounts,
      });
    }

    const url = `${provisioningBaseUrl}/users/current/accounts`;
    const detection = detectAccountSource(mt5Server, brokerName);

    fastify.log.info({
      event: 'metaapi_connect_request',
      url,
      tokenPresent: !!METAAPI_TOKEN,
      accountName,
      mt5Login: maskForLog(mt5Login),
      mt5Server,
      brokerName,
      detectedBroker: detection.detected_broker,
      detectedPropFirm: detection.detected_prop_firm,
      detectionConfidence: detection.detection_confidence,
      tradingAccountId: maskForLog(tradingAccountId),
      userId: maskForLog(userId),
      planName: accountLimitCheck.planName,
      activeAccountCount: accountLimitCheck.activeAccountCount,
      accountLimit: accountLimitCheck.accountLimit,
    });

    let existingMetaApiAccount: MetaApiProvisioningAccount | null = null;
    let provisioning: Awaited<ReturnType<typeof postProvisioningAccount>> | null = null;
    let providerAccountId: string | null = null;

    try {
      const listed = await listProvisioningAccounts(url);
      if (!listed.res.ok) {
        const failure = classifyProvisioningFailure(listed.res.status, listed.body);
        fastify.log.error({
          event: 'metaapi_accounts_list_failed',
          url,
          status: listed.res.status,
          code: failure.code,
          body: listed.text,
        });
        return reply.status(failure.httpStatus).send({
          error: failure.error,
          code: failure.code,
          details: listed.body,
        });
      }

      existingMetaApiAccount = findMatchingProvisioningAccount(listed.accounts, mt5Login, mt5Server);
      providerAccountId = existingMetaApiAccount ? getMetaApiAccountId(existingMetaApiAccount) : null;

      fastify.log.info({
        event: 'metaapi_existing_account_lookup',
        found: !!existingMetaApiAccount,
        providerAccountId: maskForLog(providerAccountId),
        state: existingMetaApiAccount?.state,
        connectionStatus: existingMetaApiAccount?.connectionStatus,
        region: existingMetaApiAccount?.region,
      });

      if (!providerAccountId) {
        if (!mt5Password) {
          return reply.status(400).send({
            error: 'mt5Password is required when provisioning a new MetaApi account',
            code: 'mt5_password_required',
          });
        }

        // Password is transient: sent only to MetaApi provisioning, never logged, never persisted.
        provisioning = await postProvisioningAccount(url, {
          name: accountName,
          type: 'cloud',
          login: mt5Login,
          password: mt5Password,
          server: mt5Server,
          platform: 'mt5',
          application: 'MetaApi',
          magic: 0,
          tags: ['fortify', `user:${userId}`],
        });
      }
    } catch (fetchError: any) {
      fastify.log.error({
        event: 'metaapi_connect_fetch_error',
        error: fetchError?.message || String(fetchError),
        name: fetchError?.name,
        cause: fetchError?.cause,
        url,
      });
      return reply.status(502).send({
        error: 'Failed to reach MetaApi provisioning API',
        code: 'metaapi_provisioning_fetch_failed',
        details: fetchError?.message || 'Network error or invalid URL',
      });
    }

    if (provisioning?.pending) {
      fastify.log.error({
        event: 'metaapi_connect_provisioning_pending_timeout',
        url,
        status: provisioning.res.status,
        transactionId: provisioning.transactionId,
        attempts: provisioning.attempts,
        body: provisioning.text,
      });
      return reply.status(202).send({
        error: 'MetaApi provisioning is still pending',
        code: 'metaapi_provisioning_pending',
        transactionId: provisioning.transactionId,
        attempts: provisioning.attempts,
        details: provisioning.body,
      });
    }

    if (provisioning && !provisioning.res.ok) {
      const failure = classifyProvisioningFailure(provisioning.res.status, provisioning.body);

      fastify.log.error({
        event: 'metaapi_connect_provisioning_failed',
        url,
        status: provisioning.res.status,
        code: failure.code,
        transactionId: provisioning.transactionId,
        body: provisioning.text,
      });

      if (failure.code !== 'invalid_metaapi_token') {
        const { error: failureInsertError } = await supabase.from('mt5_connections').insert({
          user_id: userId,
          trading_account_id: tradingAccountId,
          account_name: accountName,
          mt5_login: mt5Login,
          mt5_server: mt5Server,
          broker_name: brokerName,
          provider: 'metaapi',
          provider_account_id: null,
          api_mode: 'cloud',
          connection_status: 'auth_error',
          sync_status: 'error',
          sync_error: clampSyncError(failure.error),
          last_sync_at: null,
        });

        if (failureInsertError) {
          fastify.log.error({
            event: 'metaapi_connect_failure_insert_failed',
            error: failureInsertError.message,
          });
          return reply.status(500).send({
            error: 'Supabase insert failed while recording MetaApi failure',
            code: 'supabase_insert_failed',
            details: failureInsertError.message,
          });
        }
      }

      return reply.status(failure.httpStatus).send({
        error: failure.error,
        code: failure.code,
        details: provisioning.body,
      });
    }

    if (!providerAccountId && provisioning) {
      providerAccountId = getProviderAccountId(provisioning.body);
    }

    if (!providerAccountId) {
      fastify.log.error({
        event: 'metaapi_connect_missing_provider_account_id',
        status: provisioning?.res.status,
        transactionId: provisioning?.transactionId,
        body: provisioning?.body,
      });
      return reply.status(502).send({
        error: 'MetaApi provisioning response did not include an account id',
        code: 'metaapi_provisioning_failed',
        details: provisioning?.body,
      });
    }

    const connectionStatus = existingMetaApiAccount?.connectionStatus === 'CONNECTED' ? 'connected' : 'connecting';
    let effectiveTradingAccountId = tradingAccountId;
    let existingRuleSetId: string | null = null;
    let existingRuleSelectionStatus: string | null = null;

    if (!effectiveTradingAccountId) {
      const { data: existingTradingAccount, error: existingTradingAccountError } = await supabase
        .from('trading_accounts')
        .select('id,rule_set_id,rule_selection_status')
        .eq('user_id', userId)
        .eq('mt5_login', mt5Login)
        .eq('mt5_server', mt5Server)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingTradingAccountError) {
        fastify.log.error({
          event: 'metaapi_connect_trading_account_lookup_failed',
          userId: maskForLog(userId),
          error: existingTradingAccountError.message,
        });
        return reply.status(500).send({
          error: 'Supabase lookup failed while finding trading account',
          code: 'supabase_lookup_failed',
          details: existingTradingAccountError.message,
        });
      }

      effectiveTradingAccountId = existingTradingAccount?.id ?? null;
      existingRuleSetId = existingTradingAccount?.rule_set_id ?? null;
      existingRuleSelectionStatus = existingTradingAccount?.rule_selection_status ?? null;

      if (!effectiveTradingAccountId) {
        const { data: createdTradingAccount, error: createTradingAccountError } = await supabase
          .from('trading_accounts')
          .insert({
            user_id: userId,
            nickname: accountName,
            broker: brokerName,
            mt5_login: mt5Login,
            mt5_server: mt5Server,
            mt5_connection_status: connectionStatus,
            mt5_sync_error: null,
            detected_broker: detection.detected_broker,
            detected_server: detection.detected_server,
            detected_platform: detection.detected_platform,
            detected_prop_firm: detection.detected_prop_firm,
            detection_confidence: detection.detection_confidence,
            detection_notes: detection.detection_notes,
            rule_selection_status: 'unconfigured',
            account_size: 10000,
            base_currency: 'USD',
            start_balance: 0,
            current_balance: 0,
            current_equity: 0,
            highest_equity: 0,
            status: 'active',
          })
          .select('id')
          .single();

        if (createTradingAccountError) {
          fastify.log.error({
            event: 'metaapi_connect_trading_account_insert_failed',
            userId: maskForLog(userId),
            error: createTradingAccountError.message,
          });
          return reply.status(500).send({
            error: 'Supabase insert failed while creating trading account',
            code: 'supabase_insert_failed',
            details: createTradingAccountError.message,
          });
        }

        effectiveTradingAccountId = createdTradingAccount.id;
        existingRuleSetId = null;
        existingRuleSelectionStatus = 'unconfigured';
      }
    } else {
      const { data: selectedTradingAccount, error: selectedTradingAccountError } = await supabase
        .from('trading_accounts')
        .select('id,rule_set_id,rule_selection_status')
        .eq('id', effectiveTradingAccountId)
        .eq('user_id', userId)
        .maybeSingle();

      if (selectedTradingAccountError) {
        fastify.log.error({
          event: 'metaapi_connect_selected_trading_account_lookup_failed',
          tradingAccountId: maskForLog(effectiveTradingAccountId),
          error: selectedTradingAccountError.message,
        });
        return reply.status(500).send({
          error: 'Supabase lookup failed while checking selected trading account',
          code: 'supabase_lookup_failed',
          details: selectedTradingAccountError.message,
        });
      }

      if (!selectedTradingAccount) {
        fastify.log.warn({
          event: 'metaapi_connect_trading_account_ownership_mismatch',
          tradingAccountId: maskForLog(effectiveTradingAccountId),
          userId: maskForLog(userId),
        });
        return reply.status(403).send({
          error: 'Trading account does not belong to the authenticated user',
          code: 'ownership_mismatch',
        });
      }

      existingRuleSetId = selectedTradingAccount?.rule_set_id ?? null;
      existingRuleSelectionStatus = selectedTradingAccount?.rule_selection_status ?? null;
    }

    const requiresRuleConfiguration =
      !isUuid(existingRuleSetId) ||
      !existingRuleSelectionStatus ||
      existingRuleSelectionStatus === 'unconfigured' ||
      existingRuleSelectionStatus === 'auto_generic';

    const connectionPayload = {
      user_id: userId,
      trading_account_id: effectiveTradingAccountId,
      account_name: accountName,
      mt5_login: mt5Login,
      mt5_server: mt5Server,
      broker_name: brokerName,
      provider: 'metaapi',
      provider_account_id: providerAccountId,
      api_mode: 'cloud',
      connection_status: connectionStatus,
      sync_status: 'queued',
      sync_error: null,
      last_sync_at: null,
    };

    let existingConnection: JsonRecord | null = null;

    const { data: providerConnection, error: providerConnectionError } = await supabase
      .from('mt5_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'metaapi')
      .eq('provider_account_id', providerAccountId)
      .maybeSingle();

    if (providerConnectionError) {
      fastify.log.error({
        event: 'metaapi_connect_existing_connection_lookup_failed',
        error: providerConnectionError.message,
      });
      return reply.status(500).send({
        error: 'Supabase lookup failed while finding existing MT5 connection',
        code: 'supabase_lookup_failed',
        details: providerConnectionError.message,
      });
    }

    existingConnection = providerConnection;

    if (!existingConnection && effectiveTradingAccountId) {
      const { data: accountConnection, error: accountConnectionError } = await supabase
        .from('mt5_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'metaapi')
        .eq('trading_account_id', effectiveTradingAccountId)
        .maybeSingle();

      if (accountConnectionError) {
        fastify.log.error({
          event: 'metaapi_connect_account_connection_lookup_failed',
          error: accountConnectionError.message,
        });
        return reply.status(500).send({
          error: 'Supabase lookup failed while finding account MT5 connection',
          code: 'supabase_lookup_failed',
          details: accountConnectionError.message,
        });
      }

      existingConnection = accountConnection;
    }

    const { data, error } = existingConnection
      ? await supabase.from('mt5_connections').update(connectionPayload).eq('id', existingConnection.id).select('*').single()
      : await supabase.from('mt5_connections').insert(connectionPayload).select('*').single();

    if (error) {
      fastify.log.error({
        event: existingConnection ? 'metaapi_connect_update_failed' : 'metaapi_connect_insert_failed',
        error: error.message,
      });
      return reply.status(500).send({
        error: existingConnection
          ? 'Supabase update failed while saving MT5 connection'
          : 'Supabase insert failed while saving MT5 connection',
        code: existingConnection ? 'supabase_update_failed' : 'supabase_insert_failed',
        details: error.message,
      });
    }

    const accountUpdatePayload: JsonRecord = {
      mt5_connection_status: connectionStatus,
      mt5_login: mt5Login,
      mt5_server: mt5Server,
      mt5_sync_error: null,
      detected_broker: detection.detected_broker,
      detected_server: detection.detected_server,
      detected_platform: detection.detected_platform,
      detected_prop_firm: detection.detected_prop_firm,
      detection_confidence: detection.detection_confidence,
      detection_notes: detection.detection_notes,
    };

    if (!isUuid(existingRuleSetId) && existingRuleSelectionStatus !== 'configured') {
      accountUpdatePayload.rule_selection_status = 'unconfigured';
      accountUpdatePayload.account_size = 10000;
    }

    const { error: accountUpdateError } = await supabase
      .from('trading_accounts')
      .update(accountUpdatePayload)
      .eq('id', effectiveTradingAccountId)
      .eq('user_id', userId);

    if (accountUpdateError) {
      fastify.log.error({
        event: 'metaapi_connect_trading_account_update_failed',
        tradingAccountId: maskForLog(effectiveTradingAccountId),
        error: accountUpdateError.message,
      });
    }

    return {
      success: true,
      connection: data,
      providerAccountId,
      tradingAccountId: effectiveTradingAccountId,
      detection,
      requiresRuleConfiguration,
      reusedExistingMetaApiAccount: !!existingMetaApiAccount,
      transactionId: provisioning?.transactionId ?? null,
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

fastify.post('/metaapi/sync', async (request, reply) => {
  try {
    const limit = checkRateLimit(request, 'metaapi-sync', 60, 60_000);
    if (!limit.allowed) return reply.status(429).send(rateLimitError(limit.retryAfterSeconds));

    const body = request.body as {
      connectionId?: string;
      userId?: string;
    };

    const connectionId = String(body?.connectionId ?? '').trim();
    const userId = String(body?.userId ?? '').trim();

    fastify.log.info({
      event: 'metaapi_sync_request',
      connectionId: maskForLog(connectionId),
      userId: maskForLog(userId),
    });

    if (!connectionId || !userId) {
      return reply.status(400).send({
        error: 'connectionId and userId are required',
      });
    }

    const authResult = await verifyRequestUserOrAdmin(request, userId);
    if (isAuthError(authResult)) {
      return reply.status(authResult.status).send(authResult.error);
    }

    const { data: conn, error: connErr } = await supabase
      .from('mt5_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connErr || !conn) {
      fastify.log.error({
        event: 'metaapi_sync_connection_not_found',
        connectionId,
        userId: maskForLog(userId),
        error: connErr?.message,
      });
      return reply.status(403).send({
        error: 'Connection does not belong to the authenticated user',
        code: 'ownership_mismatch',
      });
    }

    if (!conn.provider_account_id) {
      fastify.log.error({
        event: 'metaapi_sync_missing_provider_account_id',
        connectionId,
        provider_account_id: conn.provider_account_id,
      });
      return reply.status(409).send({ error: 'Missing provider_account_id' });
    }

    const { data: tradingAccount, error: tradingAccountErr } = conn.trading_account_id
      ? await supabase
          .from('trading_accounts')
          .select('*')
          .eq('id', conn.trading_account_id)
          .eq('user_id', userId)
          .maybeSingle()
      : { data: null, error: null };

    if (tradingAccountErr) {
      fastify.log.error({
        event: 'metaapi_sync_trading_account_read_failed',
        connectionId,
        tradingAccountId: conn.trading_account_id,
        error: tradingAccountErr.message,
      });
      return reply.status(500).send({
        error: 'Supabase read failed while loading trading account',
        code: 'supabase_read_failed',
        details: tradingAccountErr.message,
      });
    }

    if (conn.trading_account_id && !tradingAccount) {
      fastify.log.warn({
        event: 'metaapi_sync_trading_account_ownership_mismatch',
        connectionId: maskForLog(connectionId),
        tradingAccountId: maskForLog(conn.trading_account_id),
        userId: maskForLog(userId),
      });
      return reply.status(403).send({
        error: 'Trading account does not belong to the authenticated user',
        code: 'ownership_mismatch',
      });
    }

    fastify.log.info({
      event: 'metaapi_sync_connection_found',
      connectionId,
      provider_account_id: conn.provider_account_id,
      mt5_login: conn.mt5_login,
      mt5_server: conn.mt5_server,
      trading_account_id: conn.trading_account_id,
    });

    const { error: markRunningErr } = await supabase
      .from('mt5_connections')
      .update({
        connection_status: 'syncing',
        sync_status: 'running',
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (markRunningErr) {
      fastify.log.error({
        event: 'metaapi_sync_status_update_failed',
        connectionId,
        error: markRunningErr.message,
      });
      return reply.status(500).send({
        error: 'Supabase update failed while marking sync as running',
        code: 'supabase_update_failed',
        details: markRunningErr.message,
      });
    }

    const headers = {
      'auth-token': METAAPI_TOKEN,
      'Content-Type': 'application/json',
    };

    const accountInfoUrl = `${clientBaseUrl}/users/current/accounts/${conn.provider_account_id}/account-information`;
    const positionsUrl = `${clientBaseUrl}/users/current/accounts/${conn.provider_account_id}/positions`;

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const until = new Date().toISOString();
    const dealsUrl =
      `${clientBaseUrl}/users/current/accounts/${conn.provider_account_id}/history-deals/time/` +
      `${encodeURIComponent(since)}/${encodeURIComponent(until)}`;

    fastify.log.info({
      event: 'metaapi_sync_fetching_data',
      accountInfoUrl,
      positionsUrl,
      dealsUrl,
    });

    const [accountInfoRes, positionsRes, dealsRes] = await Promise.all([
      fetch(accountInfoUrl, { headers }),
      fetch(positionsUrl, { headers }),
      fetch(dealsUrl, { headers }),
    ]);

    const accountInfoText = await accountInfoRes.text();
    const positionsText = await positionsRes.text();
    const dealsText = await dealsRes.text();

    fastify.log.info({
      event: 'metaapi_sync_fetch_response',
      accountInfoStatus: accountInfoRes.status,
      positionsStatus: positionsRes.status,
      dealsStatus: dealsRes.status,
      accountInfoBodyLength: accountInfoText.length,
      positionsBodyLength: positionsText.length,
      dealsBodyLength: dealsText.length,
    });

    const accountInfo = parseJsonText(accountInfoText);
    const positionsJson = parseJsonText(positionsText);
    const dealsJson = parseJsonText(dealsText);
    const positionsRaw = Array.isArray(positionsJson) ? positionsJson : Array.isArray(positionsJson?.positions) ? positionsJson.positions : [];
    const dealsRaw = Array.isArray(dealsJson) ? dealsJson : Array.isArray(dealsJson?.deals) ? dealsJson.deals : [];

    if (!accountInfoRes.ok || !positionsRes.ok || !dealsRes.ok) {
      const message = `MetaApi sync failed: account=${accountInfoRes.status}, positions=${positionsRes.status}, deals=${dealsRes.status}`;

      fastify.log.error({
        event: 'metaapi_sync_fetch_failed',
        message,
        accountInfoStatus: accountInfoRes.status,
        positionsStatus: positionsRes.status,
        dealsStatus: dealsRes.status,
      });

      const { error: markErrorErr } = await supabase
        .from('mt5_connections')
        .update({
          connection_status: 'auth_error',
          sync_status: 'error',
          sync_error: message,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      if (markErrorErr) {
        fastify.log.error({
          event: 'metaapi_sync_error_status_update_failed',
          connectionId,
          error: markErrorErr.message,
        });
        return reply.status(500).send({
          error: 'Supabase update failed while recording sync failure',
          code: 'supabase_update_failed',
          details: markErrorErr.message,
        });
      }

      if (conn.trading_account_id) {
        await supabase
          .from('trading_accounts')
          .update({
            mt5_connection_status: 'auth_error',
            mt5_sync_error: message,
            mt5_last_sync_at: new Date().toISOString(),
          })
          .eq('id', conn.trading_account_id)
          .eq('user_id', userId);
      }

      return reply.status(502).send({
        error: message,
        details: {
          accountInformation: accountInfoText,
          positions: positionsText,
          deals: dealsText,
        },
      });
    }

    const mappedPositions = mapPositions(positionsRaw);
    const mappedDeals = mapDeals(dealsRaw);

    const { data: existingSnapshots, error: existingSnapshotsErr } = await supabase
      .from('mt5_account_snapshots')
      .select('balance,equity,max_balance,date')
      .eq('connection_id', connectionId);

    if (existingSnapshotsErr) {
      fastify.log.error({
        event: 'metaapi_sync_existing_snapshots_read_failed',
        connectionId,
        error: existingSnapshotsErr.message,
      });
      return reply.status(500).send({
        error: 'Supabase read failed while checking existing MT5 snapshots',
        code: 'supabase_read_failed',
        details: existingSnapshotsErr.message,
      });
    }

    const snapshot = buildSnapshot(
      accountInfo,
      mappedDeals,
      mappedPositions,
      existingSnapshots ?? [],
      tradingAccount as TradingAccount | null,
    );

    fastify.log.info({
      event: 'metaapi_sync_writing_snapshot',
      connectionId,
      balance: snapshot.balance,
      equity: snapshot.equity,
      date: snapshot.date,
    });

    const { error: snapshotErr } = await supabase
      .from('mt5_account_snapshots')
      .upsert(
        {
          connection_id: connectionId,
          date: snapshot.date,
          balance: snapshot.balance,
          equity: snapshot.equity,
          daily_pnl: snapshot.daily_pnl,
          floating_pnl: snapshot.floating_pnl,
          drawdown: snapshot.drawdown,
          max_balance: snapshot.max_balance,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'connection_id,date',
        },
      );

    if (snapshotErr) {
      fastify.log.error({
        event: 'metaapi_sync_snapshot_write_failed',
        connectionId,
        error: snapshotErr.message,
      });
      return reply.status(500).send({
        error: 'Supabase upsert failed while writing MT5 snapshot',
        code: 'supabase_upsert_failed',
        details: snapshotErr.message,
      });
    }

    const { error: deletePositionsErr } = await supabase
      .from('mt5_positions')
      .delete()
      .eq('connection_id', connectionId);

    if (deletePositionsErr) {
      fastify.log.error({
        event: 'metaapi_sync_positions_delete_failed',
        connectionId,
        error: deletePositionsErr.message,
      });
      return reply.status(500).send({
        error: 'Supabase delete failed while clearing MT5 positions',
        code: 'supabase_delete_failed',
        details: deletePositionsErr.message,
      });
    }

    if (mappedPositions.length > 0) {
      const { error: posErr } = await supabase.from('mt5_positions').insert(
        mappedPositions.map((position) => ({
          connection_id: connectionId,
          ...position,
        })),
      );

      if (posErr) {
        fastify.log.error({
          event: 'metaapi_sync_positions_write_failed',
          connectionId,
          error: posErr.message,
        });
        return reply.status(500).send({
          error: 'Supabase insert failed while writing MT5 positions',
          code: 'supabase_insert_failed',
          details: posErr.message,
        });
      }
    }

    const { data: existingTrades, error: existingTradesErr } = await supabase
      .from('mt5_trades')
      .select('ticket')
      .eq('connection_id', connectionId);

    if (existingTradesErr) {
      fastify.log.error({
        event: 'metaapi_sync_existing_trades_read_failed',
        connectionId,
        error: existingTradesErr.message,
      });
      return reply.status(500).send({
        error: 'Supabase read failed while checking existing MT5 trades',
        code: 'supabase_read_failed',
        details: existingTradesErr.message,
      });
    }

    const existingTickets = new Set((existingTrades ?? []).map((r: any) => Number(r.ticket)).filter(Number.isFinite));
    const newTrades = mappedDeals.filter((trade) => !existingTickets.has(trade.ticket));

    if (newTrades.length > 0) {
      const { error: tradeErr } = await supabase.from('mt5_trades').insert(
        newTrades.map((trade) => ({
          connection_id: connectionId,
          ...trade,
        })),
      );

      if (tradeErr) {
        fastify.log.error({
          event: 'metaapi_sync_trades_write_failed',
          connectionId,
          error: tradeErr.message,
        });
        return reply.status(500).send({
          error: 'Supabase insert failed while writing MT5 trades',
          code: 'supabase_insert_failed',
          details: tradeErr.message,
        });
      }
    }

    const allTradeDates = new Set(mappedDeals.map((deal) => toDateKey(deal.created_at)));
    const lastTradingDate = mappedDeals.reduce<string | null>((latest, deal) => {
      const date = toDateKey(deal.created_at);
      return latest === null || date > latest ? date : latest;
    }, null);

    if (conn.trading_account_id && tradingAccount) {
      const existingStartBalance = toNumber((tradingAccount as any).start_balance, 0);
      const startBalance = existingStartBalance > 0 ? existingStartBalance : snapshot.balance;
      const totalLossUsed = Math.max(0, startBalance - snapshot.equity);
      const dailyLossUsed = Math.max(0, -snapshot.daily_pnl);
      const totalLossPct = startBalance > 0 ? (totalLossUsed / startBalance) * 100 : null;
      const dailyLossLimit = toNumber((tradingAccount as any).daily_loss_limit);
      const dailyLossPct = dailyLossLimit > 0 ? (dailyLossUsed / dailyLossLimit) * 100 : null;
      const syncDetection = detectAccountSource(conn.mt5_server, conn.broker_name);

      const { error: accountSnapshotErr } = await supabase
        .from('account_daily_snapshots')
        .upsert(
          {
            user_id: userId,
            trading_account_id: conn.trading_account_id,
            date: snapshot.date,
            balance: snapshot.balance,
            equity: snapshot.equity,
            daily_pnl: snapshot.daily_pnl,
            floating_pnl: snapshot.floating_pnl,
            drawdown: snapshot.drawdown,
            max_balance: snapshot.max_balance,
            used_daily_loss_pct: dailyLossPct,
            used_total_loss_pct: totalLossPct,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'trading_account_id,date',
          },
        );

      if (accountSnapshotErr) {
        fastify.log.error({
          event: 'metaapi_sync_account_snapshot_write_failed',
          connectionId,
          tradingAccountId: conn.trading_account_id,
          error: accountSnapshotErr.message,
        });
        return reply.status(500).send({
          error: 'Supabase upsert failed while writing account daily snapshot',
          code: 'supabase_upsert_failed',
          details: accountSnapshotErr.message,
        });
      }

      const { error: accountUpdateErr } = await supabase
        .from('trading_accounts')
        .update({
          start_balance: startBalance,
          current_balance: snapshot.balance,
          current_equity: snapshot.equity,
          highest_equity: Math.max(toNumber((tradingAccount as any).highest_equity), snapshot.max_balance),
          daily_loss_used: dailyLossUsed,
          total_loss_used: totalLossUsed,
          trading_days_count: allTradeDates.size,
          last_trading_date: lastTradingDate,
          mt5_connection_status: 'connected',
          mt5_last_sync_at: new Date().toISOString(),
          mt5_login: conn.mt5_login,
          mt5_server: conn.mt5_server,
          mt5_sync_error: null,
          detected_broker: syncDetection.detected_broker,
          detected_server: syncDetection.detected_server,
          detected_platform: syncDetection.detected_platform,
          detected_prop_firm: syncDetection.detected_prop_firm,
          detection_confidence: syncDetection.detection_confidence,
          detection_notes: syncDetection.detection_notes,
          ...(!isUuid((tradingAccount as any).rule_set_id)
            ? {
                rule_selection_status: 'unconfigured',
                account_size: startBalance,
              }
            : {}),
        })
        .eq('id', conn.trading_account_id)
        .eq('user_id', userId);

      if (accountUpdateErr) {
        fastify.log.error({
          event: 'metaapi_sync_trading_account_update_failed',
          connectionId,
          tradingAccountId: conn.trading_account_id,
          error: accountUpdateErr.message,
        });
        return reply.status(500).send({
          error: 'Supabase update failed while updating trading account',
          code: 'supabase_update_failed',
          details: accountUpdateErr.message,
        });
      }
    }

    let evaluation:
      | { evaluated: number; violated: string[]; warning: string[]; skipped: string[]; warningMessage: string | null }
      | null = null;

    try {
      evaluation = await evaluateRulesForConnection(connectionId, conn.trading_account_id, snapshot, mappedPositions);
    } catch (evaluationError: any) {
      const message = evaluationError?.message || 'Rule evaluation failed';
      fastify.log.error({
        event: 'metaapi_sync_rule_evaluation_failed',
        connectionId,
        tradingAccountId: conn.trading_account_id,
        error: message,
      });
      return reply.status(500).send({
        error: 'Rule evaluation failed after MT5 sync',
        code: 'rule_evaluation_failed',
        details: message,
      });
    }

    const { error: markCompletedErr } = await supabase
      .from('mt5_connections')
      .update({
        connection_status: 'connected',
        sync_status: 'success',
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (markCompletedErr) {
      fastify.log.error({
        event: 'metaapi_sync_completed_status_update_failed',
        connectionId,
        error: markCompletedErr.message,
      });
      return reply.status(500).send({
        error: 'Supabase update failed while marking sync as completed',
        code: 'supabase_update_failed',
        details: markCompletedErr.message,
      });
    }

    fastify.log.info({
      event: 'metaapi_sync_success',
      connectionId,
      positionsCount: mappedPositions.length,
      newTradesCount: newTrades.length,
      evaluatedRules: evaluation?.evaluated ?? 0,
    });

    return {
      success: true,
      positionsCount: mappedPositions.length,
      newTradesCount: newTrades.length,
      snapshot,
      evaluation,
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

fastify
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(async () => {
    fastify.log.info(`MetaApi gateway running on port ${PORT}`);
    await validateLoadedMetaApiToken();
  })
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });
