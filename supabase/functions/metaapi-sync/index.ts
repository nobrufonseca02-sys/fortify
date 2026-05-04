// MetaApi: pull current state for a connection — account info, positions, recent deals — and persist.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const METAAPI_TOKEN = Deno.env.get("METAAPI_TOKEN");
  const METAAPI_REGION = Deno.env.get("METAAPI_REGION") || "new-york";

  if (!METAAPI_TOKEN) return json(500, { error: "METAAPI_TOKEN not configured" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsErr || !claimsData?.claims) return json(401, { error: "Unauthorized" });
  const userId = claimsData.claims.sub as string;

  const body = await req.json().catch(() => ({}));
  const connectionId = String(body?.connectionId ?? "").trim();
  if (!connectionId) return json(400, { error: "connectionId is required" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: conn, error: connErr } = await admin
    .from("mt5_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .single();
  if (connErr || !conn) return json(404, { error: "Connection not found" });
  if ((conn as any).provider !== "metaapi") {
    return json(400, { error: "Sync supported only for provider=metaapi (use webhook for bridge)" });
  }
  const providerAccountId = (conn as any).provider_account_id as string | null;
  if (!providerAccountId) return json(409, { error: "Connection missing provider_account_id" });

  await admin.from("mt5_connections").update({
    connection_status: "syncing",
    sync_status: "running",
    sync_error: null,
  }).eq("id", connectionId);

  const clientBase = `https://mt-client-api-v1.${METAAPI_REGION}.agiliumtrade.ai/users/current/accounts/${providerAccountId}`;
  const headers = { "auth-token": METAAPI_TOKEN, "Content-Type": "application/json" };

  const finishWithError = async (msg: string, status = 502, details?: unknown) => {
    await admin.from("mt5_connections").update({
      connection_status: "auth_error",
      sync_status: "error",
      sync_error: msg.slice(0, 500),
      last_sync_at: new Date().toISOString(),
    }).eq("id", connectionId);
    return json(status, { error: msg, details });
  };

  try {
    // 1) account info
    const accRes = await fetch(`${clientBase}/account-information`, { headers });
    if (!accRes.ok) {
      const t = await accRes.text();
      return await finishWithError(`account-information ${accRes.status}`, 502, t);
    }
    const acc = await accRes.json();

    // 2) positions
    const posRes = await fetch(`${clientBase}/positions`, { headers });
    const positions = posRes.ok ? await posRes.json() : [];

    // 3) deals last 7 days (closed trades)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const until = new Date().toISOString();
    const dealsRes = await fetch(
      `${clientBase}/history-deals/time/${encodeURIComponent(since)}/${encodeURIComponent(until)}`,
      { headers },
    );
    const deals = dealsRes.ok ? await dealsRes.json() : [];

    const today = new Date().toISOString().slice(0, 10);
    const balance = Number(acc?.balance ?? 0);
    const equity = Number(acc?.equity ?? balance);
    const floatingPnl = Number(acc?.profit ?? (equity - balance));

    // Snapshot upsert (one per connection per day)
    await admin.from("mt5_account_snapshots").upsert({
      connection_id: connectionId,
      date: today,
      balance,
      equity,
      floating_pnl: floatingPnl,
      daily_pnl: 0, // computed downstream by rule engine
      drawdown: Math.max(0, Number(acc?.maxBalance ?? balance) - equity),
      max_balance: Number(acc?.maxBalance ?? balance),
    }, { onConflict: "connection_id,date" } as any);

    // Replace open positions
    await admin.from("mt5_positions").delete().eq("connection_id", connectionId);
    if (Array.isArray(positions) && positions.length) {
      await admin.from("mt5_positions").insert(
        positions.map((p: any) => ({
          connection_id: connectionId,
          ticket: Number(p.id ?? p.positionId ?? 0),
          symbol: String(p.symbol ?? ""),
          volume: Number(p.volume ?? 0),
          open_price: Number(p.openPrice ?? 0),
          current_price: Number(p.currentPrice ?? p.openPrice ?? 0),
          floating_pnl: Number(p.profit ?? 0),
          stop_loss: p.stopLoss != null ? Number(p.stopLoss) : null,
          take_profit: p.takeProfit != null ? Number(p.takeProfit) : null,
        })),
      );
    }

    // Insert closed deals as trades (skip duplicates by ticket)
    if (Array.isArray(deals) && deals.length) {
      const closed = deals.filter((d: any) => d?.entryType === "DEAL_ENTRY_OUT" || d?.type === "DEAL_TYPE_BALANCE" ? false : (d?.entryType === "DEAL_ENTRY_OUT"));
      // Simpler: persist all deals representing closed trades (entryType OUT)
      const rows = deals
        .filter((d: any) => d?.entryType === "DEAL_ENTRY_OUT")
        .map((d: any) => ({
          connection_id: connectionId,
          ticket: Number(d.id ?? d.orderId ?? 0),
          symbol: String(d.symbol ?? ""),
          side: d.type === "DEAL_TYPE_BUY" ? "buy" : "sell",
          volume: Number(d.volume ?? 0),
          open_time: d.time ?? new Date().toISOString(),
          close_time: d.time ?? new Date().toISOString(),
          open_price: Number(d.price ?? 0),
          close_price: Number(d.price ?? 0),
          profit: Number(d.profit ?? 0),
          swap: Number(d.swap ?? 0),
          commission: Number(d.commission ?? 0),
        }));
      if (rows.length) {
        // best-effort upsert by (connection_id, ticket) — fall back to insert ignore on duplicates
        await admin.from("mt5_trades").upsert(rows as any, { onConflict: "connection_id,ticket" } as any);
      }
    }

    await admin.from("mt5_connections").update({
      connection_status: "connected",
      sync_status: "success",
      sync_error: null,
      last_sync_at: new Date().toISOString(),
    }).eq("id", connectionId);

    return json(200, {
      success: true,
      message: `Sync OK — balance ${balance.toFixed(2)}, equity ${equity.toFixed(2)}, ${positions?.length ?? 0} posições.`,
    });
  } catch (e) {
    return await finishWithError(e instanceof Error ? e.message : "Sync failed", 500);
  }
});
