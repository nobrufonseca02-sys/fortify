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

    const accountName = String(body?.accountName ?? "").trim();
    const mt5Login = String(body?.mt5Login ?? "").trim();
    const mt5Server = String(body?.mt5Server ?? "").trim();
    const brokerName = String(body?.brokerName ?? "").trim();
    const mt5Password = String(body?.mt5Password ?? "");
    const tradingAccountIdRaw = body?.tradingAccountId ?? null;
    const tradingAccountId =
      typeof tradingAccountIdRaw === "string" && tradingAccountIdRaw.trim().length > 0
        ? tradingAccountIdRaw.trim()
        : null;

    if (!accountName || !mt5Login || !mt5Server || !mt5Password) {
      return json(400, {
        error: "accountName, mt5Login, mt5Server and mt5Password are required",
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const provisioningBaseUrl =
      `https://mt-provisioning-api-v1.${METAAPI_REGION}.agiliumtrade.ai`;
    const provisioningUrl = `${provisioningBaseUrl}/users/current/accounts`;

    console.log("[metaapi-connect] region:", METAAPI_REGION);
    console.log("[metaapi-connect] provisioningBaseUrl:", provisioningBaseUrl);
    console.log(
      "[metaapi-connect] request body:",
      JSON.stringify({
        name: accountName,
        login: mt5Login,
        server: mt5Server,
        platform: "mt5",
        type: "cloud",
        brokerName,
        tradingAccountId,
      }),
    );

    const provRes = await fetch(provisioningUrl, {
      method: "POST",
      headers: {
        "auth-token": METAAPI_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: accountName,
        type: "cloud",
        login: mt5Login,
        password: mt5Password,
        server: mt5Server,
        platform: "mt5",
        application: "MetaApi",
        magic: 0,
        tags: ["fortify", `user:${userId}`],
      }),
    });

    const provText = await provRes.text();
    console.log("[metaapi-connect] provisioning status:", provRes.status);
    console.log("[metaapi-connect] provisioning response body:", provText);

    let prov: Record<string, unknown> = {};
    try {
      prov = JSON.parse(provText);
    } catch {
      prov = { raw: provText };
    }

    if (!provRes.ok) {
      let errorMessage = "MetaApi provisioning failed";

      if (typeof prov?.message === "string") {
        errorMessage = prov.message;
      } else if (typeof prov?.error === "string") {
        errorMessage = prov.error;
      } else if (provRes.status >= 400 && provRes.status < 500) {
        errorMessage = `Invalid MT5 credentials or server (HTTP ${provRes.status})`;
      } else if (provRes.status >= 500) {
        errorMessage = `MetaApi server error (HTTP ${provRes.status})`;
      }

      // Registra tentativa com erro para inspeção posterior
      await admin.from("mt5_connections").insert({
        user_id: userId,
        trading_account_id: tradingAccountId,
        account_name: accountName,
        mt5_login: mt5Login,
        mt5_server: mt5Server,
        broker_name: brokerName || null,
        provider: "metaapi",
        provider_account_id: null,
        api_mode: "cloud",
        connection_status: "auth_error",
        sync_status: "error",
        sync_error: errorMessage,
        last_sync_at: null,
      });

      return json(502, {
        error: "MetaApi provisioning failed",
        details: prov,
      });
    }

    const providerAccountId =
      typeof prov?.id === "string"
        ? prov.id
        : typeof prov?.["_id"] === "string"
        ? String(prov["_id"])
        : null;

    const { data: row, error: insertErr } = await admin
      .from("mt5_connections")
      .insert({
        user_id: userId,
        trading_account_id: tradingAccountId,
        account_name: accountName,
        mt5_login: mt5Login,
        mt5_server: mt5Server,
        broker_name: brokerName || null,
        provider: "metaapi",
        provider_account_id: providerAccountId,
        api_mode: "cloud",
        connection_status: "connecting",
        sync_status: "queued",
        sync_error: null,
        last_sync_at: null,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("[metaapi-connect] mt5_connections insert failed:", insertErr);
      return json(500, {
        error: "Failed to save connection",
        details: insertErr.message,
      });
    }

    return json(200, {
      success: true,
      message: "Conta provisionada no MetaApi com sucesso.",
      connection: row,
      providerAccountId,
    });
  } catch (e) {
    console.error("[metaapi-connect] fatal error:", e);
    return json(500, {
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
});