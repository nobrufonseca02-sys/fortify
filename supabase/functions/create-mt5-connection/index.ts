import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabase(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });
}

async function getUserIdOrThrow(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error("Unauthorized");
  return data.user.id;
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

    const supabase = getSupabase(req);
    const userId = await getUserIdOrThrow(supabase);

    const body = await req.json();
    const mt5Login = String(body?.mt5Login ?? "").trim();
    const serverName = String(body?.serverName ?? "").trim();
    const brokerName = body?.brokerName != null ? String(body.brokerName).trim() : null;
    const tradingAccountId = body?.tradingAccountId != null ? String(body.tradingAccountId) : null;

    if (!mt5Login || !serverName) {
      return new Response(JSON.stringify({ error: "mt5Login and serverName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretRef = crypto.randomUUID();

    const { data: inserted, error: insertError } = await supabase
      .from("mt5Connections")
      .insert({
        userId,
        mt5Login,
        serverName,
        brokerName,
        tradingAccountId,
        secretRef,
        status: "active",
      })
      .select("id, mt5Login, serverName, brokerName, tradingAccountId, status, createdAt, updatedAt")
      .single();

    if (insertError) {
      console.error("create-mt5-connection insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create connection" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Never expose secretRef to the browser
    return new Response(JSON.stringify({ success: true, connection: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    if (status === 500) console.error("create-mt5-connection error:", e);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
