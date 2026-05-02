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
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabase(req);
    const userId = await getUserIdOrThrow(supabase);

    const { data: connections, error: connError } = await supabase
      .from("mt5Connections")
      .select("id, mt5Login, serverName, brokerName, tradingAccountId, status, createdAt, updatedAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (connError) {
      console.error("get-mt5-dashboard connections error:", connError);
      return new Response(JSON.stringify({ error: "Failed to load connections" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: runs, error: runsError } = await supabase
      .from("mt5SyncRuns")
      .select("id, connectionId, status, source, requestId, startedAt, finishedAt, errorMessage")
      .eq("userId", userId)
      .order("startedAt", { ascending: false })
      .limit(50);

    if (runsError) {
      console.error("get-mt5-dashboard runs error:", runsError);
      return new Response(JSON.stringify({ error: "Failed to load sync runs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, connections: connections ?? [], runs: runs ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    if (status === 500) console.error("get-mt5-dashboard error:", e);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
