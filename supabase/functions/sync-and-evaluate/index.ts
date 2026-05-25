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

    // 2. Fetch mt5_connections where id=connectionId AND user_id=userId
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

    // 3. Mark connection_status='syncing', sync_status='running'
    await admin
      .from("mt5_connections")
      .update({
        connection_status: "syncing",
        sync_status: "running",
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    const clientBaseUrl =
      `https://mt-client-api-v1.${METAAPI_REGION}.agiliumtrade.ai/users/current/accounts/${conn.provider_account_id}`;

    console.log("[sync-and-evaluate] region:", METAAPI_REGION);
    console.log("[sync-and-evaluate] clientBaseUrl:", clientBaseUrl);

    const headers = {
      "auth-token": METAAPI_TOKEN,
      "Content-Type": "application/json",
    };

    // 4. Make 3 parallel calls to MetaApi REST API
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const until = new Date().toISOString();

    const [accountInfoRes, positionsRes, dealsRes] = await Promise.all([
      fetch(`${clientBaseUrl}/account-information`, { method: "GET", headers }),
      fetch(`${clientBaseUrl}/positions`, { method: "GET", headers }),
      fetch(
        `${clientBaseUrl}/history-deals/time/${encodeURIComponent(since)}/${encodeURIComponent(until)}`,
        { method: "GET", headers },
      ),
    ]);

    // Parse account information
    const accountInfoText = await accountInfoRes.text();
    console.log("[sync-and-evaluate] account-information status:", accountInfoRes.status);
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

    // Parse positions
    const positionsText = await positionsRes.text();
    console.log("[sync-and-evaluate] positions status:", positionsRes.status);
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

    // Parse deals
    const dealsText = await dealsRes.text();
    console.log("[sync-and-evaluate] deals status:", dealsRes.status);
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

    const today = new Date().toISOString().split("T")[0];
    const todayStartUTC = new Date(today).toISOString();

    // 5. Calculate and UPSERT to mt5_account_snapshots for today
    // Fetch yesterday's snapshot for start_of_day_balance
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: yesterdaySnapshot } = await admin
      .from("mt5_account_snapshots")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("date", yesterday)
      .single();

    const currentBalance = Number(accountInfo.balance ?? 0);
    const currentEquity = Number(accountInfo.equity ?? 0);
    const startOfDayBalance = Number(yesterdaySnapshot?.account_balance ?? currentBalance);
    const dailyPnl = currentBalance - startOfDayBalance;
    const floatingPnl = currentEquity - currentBalance;

    // Calculate max_balance from all snapshots
    const { data: allSnapshots } = await admin
      .from("mt5_account_snapshots")
      .select("account_balance")
      .eq("connection_id", connectionId);

    const allBalances = (allSnapshots || [])
      .map((s: any) => Number(s.account_balance || 0))
      .filter((b: number) => !isNaN(b) && b > 0);
    allBalances.push(currentBalance);
    const maxBalance = Math.max(...allBalances, currentBalance);

    const drawdown = maxBalance > 0 ? ((maxBalance - currentEquity) / maxBalance) * 100 : 0;

    // Count trades from today
    const tradesCountToday = Array.isArray(dealsRaw)
      ? dealsRaw.filter((d: any) => {
          const dealTime = d.time || d.createdAt;
          return dealTime && dealTime >= todayStartUTC;
        }).length
      : 0;

    const isTradingDay = tradesCountToday > 0;

    await admin.from("mt5_account_snapshots").upsert(
      {
        connection_id: connectionId,
        date: today,
        account_balance: currentBalance,
        equity: currentEquity,
        free_margin: accountInfo.freeMargin ?? null,
        profit: accountInfo.profit ?? null,
        start_of_day_balance: startOfDayBalance,
        trades_count_today: tradesCountToday,
        is_trading_day: isTradingDay,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "connection_id,date",
      },
    );

    // 6. DELETE + INSERT in mt5_positions
    await admin.from("mt5_positions").delete().eq("connection_id", connectionId);

    let positionsCount = 0;
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
        updated_at: new Date().toISOString(),
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

      positionsCount = mappedPositions.length;
    }

    // 7. INSERT in mt5_trades only new tickets (deduplicate)
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
            updated_at: new Date().toISOString(),
          }))
          .filter((t) => t.ticket !== null && !existingTickets.has(t.ticket))
      : [];

    let newTradesCount = 0;
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

      newTradesCount = mappedTrades.length;
    }

    // 8. Mark connection_status='connected', sync_status='completed'
    await admin
      .from("mt5_connections")
      .update({
        connection_status: "connected",
        sync_status: "completed",
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    // 9. Update trading_account current_balance + current_equity
    if (conn.trading_account_id) {
      // First fetch current highest_equity
      const { data: currentAccount } = await admin
        .from("trading_accounts")
        .select("highest_equity")
        .eq("id", conn.trading_account_id)
        .single();

      const newHighestEquity = Math.max(
        currentAccount?.highest_equity || 0,
        currentEquity
      );

      await admin
        .from("trading_accounts")
        .update({
          current_balance: currentBalance,
          current_equity: currentEquity,
          highest_equity: newHighestEquity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.trading_account_id);
    }

    // 10. Call internal evaluate-rules function
    let evaluationResult: any = null;
    if (conn.trading_account_id) {
      try {
        const evalRes = await fetch(
          `${SUPABASE_URL}/functions/v1/evaluate-rules`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              connectionId,
              tradingAccountId: conn.trading_account_id,
            }),
          },
        );

        if (evalRes.ok) {
          evaluationResult = await evalRes.json();
        } else {
          console.error("[sync-and-evaluate] evaluate-rules failed:", evalRes.status);
        }
      } catch (evalErr) {
        console.error("[sync-and-evaluate] evaluate-rules error:", evalErr);
      }
    }

    // 11. Return response
    return json(200, {
      success: true,
      sync: {
        snapshotInserted: true,
        positionsCount,
        newTradesCount,
        currentBalance,
        currentEquity,
        dailyPnl,
        floatingPnl,
        drawdown,
        tradesCountToday,
      },
      evaluation: evaluationResult || { evaluated: 0, violated: [], warning: [] },
    });
  } catch (e) {
    console.error("[sync-and-evaluate] fatal error:", e);
    return json(500, {
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
});
