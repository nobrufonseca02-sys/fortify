import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAdminSupabase() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticated only (verify_jwt = true). This also prevents anonymous webhook usage.
    // Additionally, require a shared secret header to avoid exposing anything to browsers.
    const expected = Deno.env.get("MT5_WEBHOOK_SECRET") ?? "";
    const provided = req.headers.get("x-mt5-webhook-secret") ?? "";
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getAdminSupabase();

    const body = await req.json();
    const connectionId = String(body?.connectionId ?? "").trim();
    const requestId = body?.requestId != null ? String(body.requestId) : null;
    const status = String(body?.status ?? "").trim();
    const errorMessage = body?.errorMessage != null ? String(body.errorMessage) : null;
    const meta = body?.meta != null && typeof body.meta === "object" ? body.meta : {};

    if (!connectionId || !status) {
      return new Response(JSON.stringify({ error: "connectionId and status are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn, error: connError } = await supabase
      .from("mt5Connections")
      .select("id, userId")
      .eq("id", connectionId)
      .single();

    if (connError || !conn) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log every webhook sync attempt
    const finishedAt = status === "success" || status === "failed" ? new Date().toISOString() : null;

    const { error: runError } = await supabase.from("mt5SyncRuns").insert({
      userId: conn.userId,
      connectionId: conn.id,
      status,
      source: "webhook",
      requestId,
      finishedAt,
      errorMessage,
      meta,
    });

    if (runError) {
      console.error("sync-mt5-webhook insert error:", runError);
      return new Response(JSON.stringify({ error: "Failed to log sync run" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-mt5-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
