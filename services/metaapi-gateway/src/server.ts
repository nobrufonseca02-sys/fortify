import Fastify from 'fastify';
import dotenv from 'dotenv';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import cors from '@fastify/cors';

const gatewayEnvPath = path.resolve(__dirname, '../.env');
const gatewayEnvResult = dotenv.config({ path: gatewayEnvPath, override: true });

const fastify = Fastify({ logger: true });

fastify.register(cors, {
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:5173'],
  credentials: true,
});

const PORT = Number(process.env.PORT || 3001);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN!;
const METAAPI_REGION = process.env.METAAPI_REGION || 'new-york';
const METAAPI_PROVISIONING_MAX_ATTEMPTS = Number(process.env.METAAPI_PROVISIONING_MAX_ATTEMPTS || 4);
const METAAPI_PROVISIONING_MAX_WAIT_MS = Number(process.env.METAAPI_PROVISIONING_MAX_WAIT_MS || 30000);

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
  progress_pct: number | null;
  message: string;
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
  if (!ruleSetVersionId) {
    return {
      rules: [],
      warning: 'Trading account has no resolvable active rule set version',
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
    rules: (data ?? []) as RuleInstance[],
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
  switch (key) {
    case 'max_daily_loss':
      return calcMaxDailyLoss(snapshot, tradingAccount, rule);
    case 'max_total_loss':
      return calcMaxTotalLoss(snapshot, tradingAccount, rule);
    case 'trailing_drawdown':
      return calcTrailingDrawdown(snapshot, snapshots, tradingAccount, rule);
    case 'floating_loss_limit':
      return calcFloatingLossLimit(positions, tradingAccount, rule);
    case 'profit_target':
      return calcProfitTarget(snapshot, tradingAccount, rule);
    case 'min_trading_days':
      return calcMinTradingDays(trades, rule);
    case 'profitable_days':
      return calcProfitableDays(snapshots, rule);
    case 'consistency_best_day_cap':
      return calcConsistencyBestDayCap(snapshots, rule);
    case 'inactivity_limit':
      return calcInactivity(trades, rule);
    default:
      return null;
  }
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
          progress_pct: result.progress_pct,
          message: result.message,
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

fastify.post('/metaapi/connect', async (request, reply) => {
  try {
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

    const url = `${provisioningBaseUrl}/users/current/accounts`;

    fastify.log.info({
      event: 'metaapi_connect_request',
      url,
      tokenPresent: !!METAAPI_TOKEN,
      accountName,
      mt5Login: maskForLog(mt5Login),
      mt5Server,
      brokerName,
      tradingAccountId: maskForLog(tradingAccountId),
      userId: maskForLog(userId),
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

    if (!effectiveTradingAccountId) {
      const { data: existingTradingAccount, error: existingTradingAccountError } = await supabase
        .from('trading_accounts')
        .select('id')
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
      }
    }

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

    const { error: accountUpdateError } = await supabase
      .from('trading_accounts')
      .update({
        mt5_connection_status: connectionStatus,
        mt5_login: mt5Login,
        mt5_server: mt5Server,
        mt5_sync_error: null,
      })
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
        userId,
        error: connErr?.message,
      });
      return reply.status(404).send({ error: 'Connection not found' });
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
      const startBalance = toNumber((tradingAccount as any).start_balance, snapshot.balance);
      const totalLossUsed = Math.max(0, startBalance - snapshot.equity);
      const dailyLossUsed = Math.max(0, -snapshot.daily_pnl);
      const totalLossPct = startBalance > 0 ? (totalLossUsed / startBalance) * 100 : null;
      const dailyLossLimit = toNumber((tradingAccount as any).daily_loss_limit);
      const dailyLossPct = dailyLossLimit > 0 ? (dailyLossUsed / dailyLossLimit) * 100 : null;

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
