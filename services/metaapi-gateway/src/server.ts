import Fastify from 'fastify';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const fastify = Fastify({ logger: true });

const PORT = Number(process.env.PORT || 3001);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN!;
const METAAPI_REGION = process.env.METAAPI_REGION || 'new-york';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !METAAPI_TOKEN) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const provisioningBaseUrl = `https://mt-provisioning-api-v1.${METAAPI_REGION}.agiliumtrade.ai`;
const clientBaseUrl = `https://mt-client-api-v1.${METAAPI_REGION}.agiliumtrade.ai`;

function toSafeTicket(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function sideFromType(type: unknown): string | null {
  const t = String(type ?? '').toUpperCase();
  if (t.includes('BUY')) return 'buy';
  if (t.includes('SELL')) return 'sell';
  return null;
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
    const brokerName = String(body?.brokerName ?? '').trim();
    const mt5Password = String(body?.mt5Password ?? '');
    const tradingAccountId =
      typeof body?.tradingAccountId === 'string' && body.tradingAccountId.trim().length > 0
        ? body.tradingAccountId.trim()
        : null;
    const userId = String(body?.userId ?? '').trim();

    if (!accountName || !mt5Login || !mt5Server || !mt5Password || !userId) {
      return reply.status(400).send({
        error: 'accountName, mt5Login, mt5Server, mt5Password and userId are required',
      });
    }

    const url = `${provisioningBaseUrl}/users/current/accounts`;

    fastify.log.info({
      event: 'metaapi_connect_request',
      url,
      accountName,
      mt5Login,
      mt5Server,
      brokerName,
      tradingAccountId,
      userId,
    });

    const provRes = await fetch(url, {
      method: 'POST',
      headers: {
        'auth-token': METAAPI_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: accountName,
        type: 'cloud',
        login: mt5Login,
        password: mt5Password,
        server: mt5Server,
        platform: 'mt5',
        application: 'MetaApi',
        magic: 0,
        tags: ['fortify', `user:${userId}`],
      }),
    });

    const provText = await provRes.text();

    fastify.log.info({
      event: 'metaapi_connect_response',
      status: provRes.status,
      body: provText,
    });

    let prov: Record<string, any> = {};
    try {
      prov = JSON.parse(provText);
    } catch {
      prov = { raw: provText };
    }

    if (!provRes.ok) {
      const errorMessage =
        typeof prov?.message === 'string'
          ? prov.message
          : typeof prov?.error === 'string'
          ? prov.error
          : `MetaApi provisioning failed (HTTP ${provRes.status})`;

      await supabase.from('mt5_connections').insert({
        user_id: userId,
        trading_account_id: tradingAccountId,
        account_name: accountName,
        mt5_login: mt5Login,
        mt5_server: mt5Server,
        broker_name: brokerName || null,
        provider: 'metaapi',
        provider_account_id: null,
        api_mode: 'cloud',
        connection_status: 'auth_error',
        sync_status: 'error',
        sync_error: errorMessage,
        last_sync_at: null,
      });

      return reply.status(502).send({
        error: 'MetaApi provisioning failed',
        details: prov,
      });
    }

    const providerAccountId =
      typeof prov?.id === 'string'
        ? prov.id
        : typeof prov?._id === 'string'
        ? prov._id
        : null;

    const { data, error } = await supabase
      .from('mt5_connections')
      .insert({
        user_id: userId,
        trading_account_id: tradingAccountId,
        account_name: accountName,
        mt5_login: mt5Login,
        mt5_server: mt5Server,
        broker_name: brokerName || null,
        provider: 'metaapi',
        provider_account_id: providerAccountId,
        api_mode: 'cloud',
        connection_status: 'connecting',
        sync_status: 'queued',
        sync_error: null,
        last_sync_at: null,
      })
      .select('*')
      .single();

    if (error) {
      return reply.status(500).send({
        error: 'Failed to save connection',
        details: error.message,
      });
    }

    return {
      success: true,
      connection: data,
      providerAccountId,
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
      return reply.status(404).send({ error: 'Connection not found' });
    }

    if (!conn.provider_account_id) {
      return reply.status(409).send({ error: 'Missing provider_account_id' });
    }

    await supabase
      .from('mt5_connections')
      .update({
        connection_status: 'syncing',
        sync_status: 'running',
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    const headers = {
      'auth-token': METAAPI_TOKEN,
      'Content-Type': 'application/json',
    };

    const accountInfoUrl = `${clientBaseUrl}/users/current/accounts/${conn.provider_account_id}/account-information`;
    const positionsUrl = `${clientBaseUrl}/users/current/accounts/${conn.provider_account_id}/positions`;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const until = new Date().toISOString();
    const dealsUrl =
      `${clientBaseUrl}/users/current/accounts/${conn.provider_account_id}/history-deals/time/` +
      `${encodeURIComponent(since)}/${encodeURIComponent(until)}`;

    const [accountInfoRes, positionsRes, dealsRes] = await Promise.all([
      fetch(accountInfoUrl, { headers }),
      fetch(positionsUrl, { headers }),
      fetch(dealsUrl, { headers }),
    ]);

    const accountInfoText = await accountInfoRes.text();
    const positionsText = await positionsRes.text();
    const dealsText = await dealsRes.text();

    let accountInfo: Record<string, any> = {};
    let positionsRaw: any[] = [];
    let dealsRaw: any[] = [];

    try { accountInfo = JSON.parse(accountInfoText); } catch {}
    try { positionsRaw = JSON.parse(positionsText); } catch {}
    try { dealsRaw = JSON.parse(dealsText); } catch {}

    if (!accountInfoRes.ok || !positionsRes.ok || !dealsRes.ok) {
      const message = `MetaApi sync failed: account=${accountInfoRes.status}, positions=${positionsRes.status}, deals=${dealsRes.status}`;

      await supabase
        .from('mt5_connections')
        .update({
          connection_status: 'auth_error',
          sync_status: 'error',
          sync_error: message,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      return reply.status(502).send({
        error: message,
        details: {
          accountInformation: accountInfoText,
          positions: positionsText,
          deals: dealsText,
        },
      });
    }

    await supabase.from('mt5_account_snapshots').insert({
      connection_id: connectionId,
      snapshot_time: new Date().toISOString(),
      account_balance: accountInfo.balance ?? null,
      equity: accountInfo.equity ?? null,
      free_margin: accountInfo.freeMargin ?? null,
      profit: accountInfo.profit ?? null,
    });

    await supabase.from('mt5_positions').delete().eq('connection_id', connectionId);

    if (Array.isArray(positionsRaw) && positionsRaw.length > 0) {
      const mappedPositions = positionsRaw.map((p) => ({
        connection_id: connectionId,
        ticket: toSafeTicket(p.id ?? p.ticket),
        symbol: p.symbol ?? null,
        volume: p.volume ?? null,
        price: p.openPrice ?? p.price ?? null,
        side: sideFromType(p.type),
        type: p.type ?? null,
        profit: p.profit ?? null,
        commission: p.commission ?? null,
        swap: p.swap ?? null,
        created_at: p.time ?? new Date().toISOString(),
      }));

      const { error: posErr } = await supabase.from('mt5_positions').insert(mappedPositions);
      if (posErr) {
        return reply.status(500).send({ error: posErr.message });
      }
    }

    const { data: existingTrades } = await supabase
      .from('mt5_trades')
      .select('ticket')
      .eq('connection_id', connectionId);

    const existingTickets = new Set(
      (existingTrades ?? []).map((r: any) => r.ticket).filter(Boolean),
    );

    const mappedTrades = (Array.isArray(dealsRaw) ? dealsRaw : [])
      .map((d) => ({
        connection_id: connectionId,
        ticket: toSafeTicket(d.id ?? d.ticket),
        symbol: d.symbol ?? null,
        volume: d.volume ?? null,
        price: d.price ?? null,
        side: sideFromType(d.type),
        type: d.type ?? null,
        profit: d.profit ?? null,
        commission: d.commission ?? null,
        swap: d.swap ?? null,
        created_at: d.time ?? new Date().toISOString(),
      }))
      .filter((t) => t.ticket !== null && !existingTickets.has(t.ticket));

    if (mappedTrades.length > 0) {
      const { error: tradeErr } = await supabase.from('mt5_trades').insert(mappedTrades);
      if (tradeErr) {
        return reply.status(500).send({ error: tradeErr.message });
      }
    }

    await supabase
      .from('mt5_connections')
      .update({
        connection_status: 'connected',
        sync_status: 'completed',
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return {
      success: true,
      positionsCount: positionsRaw.length,
      newTradesCount: mappedTrades.length,
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

fastify.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => {
    fastify.log.info(`MetaApi gateway running on port ${PORT}`);
  })
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });