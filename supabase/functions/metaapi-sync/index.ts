import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function toSafeTicket(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function sideFromType(type: unknown): string | null {
  const t = String(type ?? "").toUpperCase();
  if (t.includes("BUY")) return "buy";
  if (t.includes("SELL")) return "sell";
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const METAAPI_TOKEN = Deno.env.get("METAAPI_TOKEN");
    const METAAPI_REGION = Deno.env.get("METAAPI_REGION") || "new-york";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: "Supabase environment variables not configured" });
    }

    if (!METAAPI_TOKEN) {
      return json(500, { error: "METAAPI_TOKEN not configured" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const accessToken = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(accessToken);

    if (userErr || !userData?.user) {
      return json(401, { error: "Unauthorized" });
    }

    const userId = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const connectionId = String(body?.connectionId ?? "").trim();

    if (!connectionId) {
      return json(400, { error: "connectionId is required" });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: conn, error: connErr } = await admin
      .from("mt5_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", userId)
      .single();

    if (connErr || !conn) {
      return json(404, { error: "Connection not found" });
    }

    if (conn.provider !== "metaapi") {
      return json(400, { error: "Sync supported only for provider=metaapi" });
    }

    if (!conn.provider_account_id) {
      return json(409, { error: "Connection missing provider_account_id" });
    }

    const clientBaseUrl =
      `https://mt-client-api-v1.${METAAPI_REGION}.agiliumtrade.ai/users/current/accounts/${conn.provider_account_id}`;

    console.log("[metaapi-sync] region:", METAAPI_REGION);
    console.log("[metaapi-sync] clientBaseUrl:", clientBaseUrl);

    const headers = {
      "auth-token": METAAPI_TOKEN,
      "Content-Type": "application/json",
    };

    const finishWithError = async (
      message: string,
      status = 502,
      details?: unknown,
    ) => {
      await admin
        .from("mt5_connections")
        .update({
          connection_status: "auth_error",
          sync_status: "error",
          sync_error: message.slice(0, 500),
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      return json(status, { error: message, details });
    };

    await admin
      .from("mt5_connections")
      .update({
        connection_status: "syncing",
        sync_status: "running",
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    // 1) Account information
    const accountInfoRes = await fetch(`${clientBaseUrl}/account-information`, {
      method: "GET",
      headers,
    });

    const accountInfoText = await accountInfoRes.text();
    console.log("[metaapi-sync] account-information status:", accountInfoRes.status);
    console.log("[metaapi-sync] account-information body:", accountInfoText);

    let accountInfo: Record<string, unknown> = {};
    try {
      accountInfo = JSON.parse(accountInfoText);
    } catch {
      accountInfo = { raw: accountInfoText };
    }

    if (!accountInfoRes.ok) {
      return await finishWithError(
        `MetaApi account-information failed (HTTP ${accountInfoRes.status})`,
        502,
        accountInfo,
      );
    }

    // 2) Positions
    const positionsRes = await fetch(`${clientBaseUrl}/positions`, {
      method: "GET",
      headers,
    });

    const positionsText = await positionsRes.text();
    console.log("[metaapi-sync] positions status:", positionsRes.status);
    console.log("[metaapi-sync] positions body:", positionsText);

    let positionsRaw: any[] = [];
    try {
      positionsRaw = JSON.parse(positionsText);
    } catch {
      positionsRaw = [];
    }

    if (!positionsRes.ok) {
      return await finishWithError(
        `MetaApi positions failed (HTTP ${positionsRes.status})`,
        502,
        positionsText,
      );
    }

    // 3) Deals (last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const until = new Date().toISOString();

    const dealsRes = await fetch(
      `${clientBaseUrl}/history-deals/time/${encodeURIComponent(since)}/${encodeURIComponent(until)}`,
      {
        method: "GET",
        headers,
      },
    );

    const dealsText = await dealsRes.text();
    console.log("[metaapi-sync] deals status:", dealsRes.status);
    console.log("[metaapi-sync] deals body:", dealsText);

    let dealsRaw: any[] = [];
    try {
      dealsRaw = JSON.parse(dealsText);
    } catch {
      dealsRaw = [];
    }

    if (!dealsRes.ok) {
      return await finishWithError(
        `MetaApi deals failed (HTTP ${dealsRes.status})`,
        502,
        dealsText,
      );
    }

    // 4) Persist snapshot
    await admin.from("mt5_account_snapshots").insert({
      connection_id: connectionId,
      snapshot_time: new Date().toISOString(),
      account_balance: accountInfo.balance ?? null,
      equity: accountInfo.equity ?? null,
      free_margin: accountInfo.freeMargin ?? null,
      profit: accountInfo.profit ?? null,
    });

    // 5) Persist positions (replace current open positions)
    await admin.from("mt5_positions").delete().eq("connection_id", connectionId);

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

      const { error: posInsertErr } = await admin
        .from("mt5_positions")
        .insert(mappedPositions);

      if (posInsertErr) {
        return await finishWithError(
          "Failed to persist MT5 positions",
          500,
          posInsertErr.message,
        );
      }
    }

    // 6) Persist trades (avoid duplicate tickets already stored)
    const existingTradesRes = await admin
      .from("mt5_trades")
      .select("ticket")
      .eq("connection_id", connectionId);

    const existingTickets = new Set(
      (existingTradesRes.data ?? [])
        .map((r: any) => r.ticket)
        .filter((t: unknown) => t !== null && t !== undefined),
    );

    const mappedTrades = Array.isArray(dealsRaw)
      ? dealsRaw
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
          .filter((t) => t.ticket !== null && !existingTickets.has(t.ticket))
      : [];

    if (mappedTrades.length > 0) {
      const { error: tradesInsertErr } = await admin
        .from("mt5_trades")
        .insert(mappedTrades);

      if (tradesInsertErr) {
        return await finishWithError(
          "Failed to persist MT5 trades",
          500,
          tradesInsertErr.message,
        );
      }
    }

    // 7) Mark connection as synced
    await admin
      .from("mt5_connections")
      .update({
        connection_status: "connected",
        sync_status: "completed",
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    return json(200, {
      success: true,
      message: "Sync completed successfully",
      snapshotInserted: true,
      positionsCount: Array.isArray(positionsRaw) ? positionsRaw.length : 0,
      newTradesCount: mappedTrades.length,
    });
  } catch (e) {
    console.error("[metaapi-sync] fatal error:", e);
    return json(500, {
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
});