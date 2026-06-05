import Fastify from 'fastify';
import dotenv from 'dotenv';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import cors from '@fastify/cors';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const fastify = Fastify({ logger: true });

// Register CORS to allow requests from frontend
fastify.register(cors, {
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  credentials: true,
});

const PORT = Number(process.env.PORT || 3001);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN!;
const METAAPI_REGION = process.env.METAAPI_REGION || 'new-york';

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

type ProvisioningFailure = {
  code:
    | 'invalid_metaapi_token'
    | 'wrong_mt5_server'
    | 'wrong_mt5_credentials'
    | 'metaapi_provisioning_failed';
  error: string;
  httpStatus: number;
};

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

function extractMetaApiMessage(body: Record<string, any>, fallback: string): string {
  if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  if (typeof body?.details === 'string' && body.details.trim()) return body.details;
  if (typeof body?.raw === 'string' && body.raw.trim()) return body.raw;
  return fallback;
}

function classifyProvisioningFailure(status: number, body: Record<string, any>): ProvisioningFailure {
  const message = extractMetaApiMessage(body, `MetaApi provisioning failed (HTTP ${status})`);
  const normalized = message.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
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

function clampSyncError(message: string): string {
  return message.length > 500 ? message.slice(0, 500) : message;
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
      tokenPresent: !!METAAPI_TOKEN,
      accountName,
      mt5Login,
      mt5Server,
      brokerName,
      tradingAccountId,
      userId,
    });

    let provRes: Response;
    try {
      provRes = await fetch(url, {
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

    const provText = await provRes.text();

    fastify.log.info({
      event: 'metaapi_connect_response',
      url,
      status: provRes.status,
    });

    let prov: Record<string, any> = {};
    try {
      prov = JSON.parse(provText);
    } catch {
      prov = { raw: provText };
    }

    if (!provRes.ok) {
      const failure = classifyProvisioningFailure(provRes.status, prov);

      fastify.log.error({
        event: 'metaapi_connect_provisioning_failed',
        url,
        status: provRes.status,
        code: failure.code,
        body: provText,
      });

      if (failure.code !== 'invalid_metaapi_token') {
        const { error: failureInsertError } = await supabase.from('mt5_connections').insert({
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
        details: prov,
      });
    }

    const providerAccountId =
      typeof prov?.id === 'string'
        ? prov.id
        : typeof prov?._id === 'string'
        ? prov._id
        : null;

    if (!providerAccountId) {
      fastify.log.error({
        event: 'metaapi_connect_missing_provider_account_id',
        status: provRes.status,
        body: prov,
      });
      return reply.status(502).send({
        error: 'MetaApi provisioning response did not include an account id',
        code: 'metaapi_provisioning_failed',
        details: prov,
      });
    }

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
      fastify.log.error({
        event: 'metaapi_connect_insert_failed',
        error: error.message,
      });
      return reply.status(500).send({
        error: 'Supabase insert failed while saving MT5 connection',
        code: 'supabase_insert_failed',
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

    fastify.log.info({
      event: 'metaapi_sync_request',
      connectionId,
      userId,
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

    fastify.log.info({
      event: 'metaapi_sync_connection_found',
      connectionId,
      provider_account_id: conn.provider_account_id,
      mt5_login: conn.mt5_login,
      mt5_server: conn.mt5_server,
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

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
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

    let accountInfo: Record<string, any> = {};
    let positionsRaw: any[] = [];
    let dealsRaw: any[] = [];

    try { accountInfo = JSON.parse(accountInfoText); } catch {}
    try { positionsRaw = JSON.parse(positionsText); } catch {}
    try { dealsRaw = JSON.parse(dealsText); } catch {}

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

      return reply.status(502).send({
        error: message,
        details: {
          accountInformation: accountInfoText,
          positions: positionsText,
          deals: dealsText,
        },
      });
    }

    fastify.log.info({
      event: 'metaapi_sync_writing_snapshot',
      connectionId,
      balance: accountInfo.balance,
      equity: accountInfo.equity,
    });

    const { error: snapshotErr } = await supabase.from('mt5_account_snapshots').insert({
      connection_id: connectionId,
      snapshot_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
      account_balance: accountInfo.balance ?? null,
      equity: accountInfo.equity ?? null,
      free_margin: accountInfo.freeMargin ?? null,
      profit: accountInfo.profit ?? null,
    });

    if (snapshotErr) {
      fastify.log.error({
        event: 'metaapi_sync_snapshot_write_failed',
        connectionId,
        error: snapshotErr.message,
      });
      return reply.status(500).send({ error: snapshotErr.message });
    }

    fastify.log.info({
      event: 'metaapi_sync_deleting_positions',
      connectionId,
    });

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

    if (Array.isArray(positionsRaw) && positionsRaw.length > 0) {
      const mappedPositions = positionsRaw
        .map((p) => ({
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
        }))
        .filter((p) => p.ticket !== null);

      fastify.log.info({
        event: 'metaapi_sync_writing_positions',
        connectionId,
        positionsCount: mappedPositions.length,
        skippedPositions: positionsRaw.length - mappedPositions.length,
      });

      if (mappedPositions.length > 0) {
        const { error: posErr } = await supabase.from('mt5_positions').insert(mappedPositions);
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
    }

    fastify.log.info({
      event: 'metaapi_sync_writing_trades',
      connectionId,
      totalDeals: dealsRaw.length,
    });

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

    fastify.log.info({
      event: 'metaapi_sync_writing_trades',
      connectionId,
      totalDeals: dealsRaw.length,
      newTrades: mappedTrades.length,
    });

    if (mappedTrades.length > 0) {
      const { error: tradeErr } = await supabase.from('mt5_trades').insert(mappedTrades);
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

    fastify.log.info({
      event: 'metaapi_sync_updating_connection_status',
      connectionId,
      status: 'connected',
    });

    const { error: markCompletedErr } = await supabase
      .from('mt5_connections')
      .update({
        connection_status: 'connected',
        sync_status: 'completed',
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
      positionsCount: positionsRaw.length,
      newTradesCount: mappedTrades.length,
    });

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
