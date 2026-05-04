// MetaApi: provision a new MT5 account in MetaApi cloud and persist a row in mt5_connections.
// IMPORTANT: investor password is forwarded to MetaApi but NEVER stored in our DB.
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

  try {
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
    const accountName = String(body?.accountName ?? "").trim();
    const mt5Login = String(body?.mt5Login ?? "").trim();
    const mt5Server = String(body?.mt5Server ?? "").trim();
    const brokerName = String(body?.brokerName ?? "").trim();
    const mt5Password = String(body?.mt5Password ?? "");

    if (!accountName || !mt5Login || !mt5Server || !brokerName || !mt5Password) {
      return json(400, { error: "accountName, mt5Login, mt5Server, brokerName and mt5Password are required" });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) Provision MetaApi account
    const provUrl = `https://mt-provisioning-api-v1.${METAAPI_REGION}.agiliumtrade.ai/users/current/accounts`;
    const provRes = await fetch(provUrl, {
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
        // tags help correlate later; do NOT include the password anywhere we persist
        tags: [`fortify`, `user:${userId}`],
      }),
    });

    const provText = await provRes.text();
    let prov: any = {};
    try { prov = JSON.parse(provText); } catch { prov = { raw: provText }; }

    if (!provRes.ok) {
      console.error("metaapi provision failed", provRes.status, prov);
      // Persist a disconnected row so user can retry / inspect
      await admin.from("mt5_connections").insert({
        user_id: userId,
        account_name: accountName,
        mt5_login: mt5Login,
        mt5_server: mt5Server,
        broker_name: brokerName,
        provider: "metaapi",
        api_mode: "cloud",
        connection_status: "auth_error",
        sync_status: "error",
        sync_error: typeof prov?.message === "string" ? prov.message : `MetaApi error ${provRes.status}`,
      });
      return json(502, { error: "MetaApi provisioning failed", details: prov });
    }

    const providerAccountId = prov?.id as string | undefined;

    // 2) Persist connection
    const { data: row, error: insErr } = await admin.from("mt5_connections").insert({
      user_id: userId,
      account_name: accountName,
      mt5_login: mt5Login,
      mt5_server: mt5Server,
      broker_name: brokerName,
      provider: "metaapi",
      provider_account_id: providerAccountId ?? null,
      api_mode: "cloud",
      connection_status: "connecting",
      sync_status: "queued",
    }).select("*").single();

    if (insErr) {
      console.error("mt5_connections insert failed", insErr);
      return json(500, { error: "Failed to save connection", details: insErr.message });
    }

    return json(200, {
      success: true,
      message: `Conta provisionada no MetaApi (${providerAccountId ?? "sem id"}).`,
      connection: row,
    });
  } catch (e) {
    console.error("metaapi-connect fatal", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
