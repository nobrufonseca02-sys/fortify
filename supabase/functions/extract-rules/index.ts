import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_CONTENT_CHARS = 30000;
const MAX_RAW_TEXT_CHARS = 100000;

// Blocks SSRF: refuses to let the edge function fetch internal/cloud-metadata
// hosts (169.254.169.254 and friends) on behalf of an attacker-supplied URL.
function isForbiddenIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true; // RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 0) return true; // "this" network
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 192 && b === 0 && parts[2] === 0) return true; // IETF protocol assignments
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isForbiddenIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  if (lower.startsWith("::ffff:")) return isForbiddenIPv4(lower.slice(7)); // IPv4-mapped
  return false;
}

async function assertUrlIsFetchable(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("URL host is not allowed");
  }

  // Reject IP-literal hosts that fall in a private/reserved range directly.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) && isForbiddenIPv4(hostname)) {
    throw new Error("URL host is not allowed");
  }
  if (hostname.includes(":") && isForbiddenIPv6(hostname)) {
    throw new Error("URL host is not allowed");
  }

  // Resolve DNS and re-check every returned address, so a public hostname
  // that resolves (or rebinds) to an internal/metadata IP is also blocked.
  try {
    const [aRecords, aaaaRecords] = await Promise.all([
      Deno.resolveDns(hostname, "A").catch(() => [] as string[]),
      Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[]),
    ]);
    if (aRecords.length === 0 && aaaaRecords.length === 0) {
      throw new Error("Could not resolve URL host");
    }
    for (const ip of aRecords) {
      if (isForbiddenIPv4(ip)) throw new Error("URL host resolves to a disallowed address");
    }
    for (const ip of aaaaRecords) {
      if (isForbiddenIPv6(ip)) throw new Error("URL host resolves to a disallowed address");
    }
  } catch (e) {
    if (e instanceof Error && (e.message.includes("disallowed") || e.message.includes("Could not resolve"))) {
      throw e;
    }
    // DNS resolution itself failing (unsupported in this runtime, NXDOMAIN,
    // etc.) is not treated as a bypass signal, but we don't silently allow
    // it either — the subsequent fetch will fail naturally if the host is
    // unreachable, so we only log here instead of hard-failing legitimate
    // requests on platform quirks.
    console.error("DNS pre-check skipped:", e);
  }

  return parsed;
}

const SYSTEM_PROMPT = `You are a prop firm rules extraction expert. Given the terms and conditions text of a prop trading firm, extract ALL trading rules and limits.

Return ONLY a JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "firmName": "Name of the prop firm",
  "rules": [
    {
      "type": "MAX_DAILY_LOSS" | "MAX_TOTAL_LOSS" | "TRAILING_MAX_LOSS" | "PROFIT_TARGET" | "MIN_TRADING_DAYS" | "CONSISTENCY_BEST_DAY_CAP" | "INACTIVITY_LIMIT" | "NEWS_RESTRICTION_WINDOW" | "SCALPING_RULE" | "MAX_STACKING_TRADES" | "PROFIT_CAP_PAYOUT",
      "name": "Human readable name in Portuguese",
      "severity": "hard" | "soft",
      "defaultValue": number,
      "unit": "%" | "$" | "days" | "min",
      "enabled": true,
      "description": "Brief description of the rule in Portuguese"
    }
  ],
  "summary": "Brief summary of the firm's rules in Portuguese (2-3 sentences)",
  "accountTypes": ["Challenge Phase 1", "Funded", etc]
}

Rules to extract:
- MAX_DAILY_LOSS: Maximum daily loss limit (% or $)
- MAX_TOTAL_LOSS: Maximum total/overall loss limit (% or $)
- TRAILING_MAX_LOSS: Trailing drawdown (% or $)
- PROFIT_TARGET: Profit target to pass challenge (% or $)
- MIN_TRADING_DAYS: Minimum number of trading days required
- CONSISTENCY_BEST_DAY_CAP: Best day profit cap as % of total
- INACTIVITY_LIMIT: Max consecutive days without trading
- NEWS_RESTRICTION_WINDOW: Minutes before/after high-impact news where trading is restricted
- SCALPING_RULE: Minimum trade duration in minutes
- MAX_STACKING_TRADES: Maximum simultaneous positions
- PROFIT_CAP_PAYOUT: Maximum payout per cycle (% or $)

Guidelines:
- severity "hard" = violation causes account failure; "soft" = warning/advisory
- If a value is a percentage, use "%" as unit. If absolute dollar amount, use "$"
- If min trading days, use "days". If time window, use "min"
- Only include rules that are clearly stated in the text
- If trailing drawdown exists, use TRAILING_MAX_LOSS instead of MAX_TOTAL_LOSS
- Names should be in Portuguese`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let contentText = typeof text === "string" ? text.slice(0, MAX_RAW_TEXT_CHARS) : "";

    // If URL provided, fetch the page content
    if (url && !text) {
      let safeUrl: URL;
      try {
        safeUrl = await assertUrlIsFetchable(url);
      } catch (validationErr) {
        return new Response(
          JSON.stringify({ error: validationErr instanceof Error ? validationErr.message : "Invalid URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        console.log("Fetching URL:", safeUrl.toString());
        const pageResp = await fetch(safeUrl, {
          redirect: "error", // don't silently follow a redirect into a private host
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Fortify/1.0)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        if (!pageResp.ok) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch URL" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const html = await pageResp.text();
        // Strip HTML tags to get plain text
        contentText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch (fetchErr) {
        console.error("Error fetching URL:", fetchErr);
        return new Response(
          JSON.stringify({ error: "Failed to fetch URL content" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    contentText = contentText.slice(0, MAX_CONTENT_CHARS);

    if (!contentText) {
      return new Response(
        JSON.stringify({ error: "No content provided. Send 'url' or 'text'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending to AI, content length:", contentText.length);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extract all trading rules from the following terms and conditions:\n\n${contentText}`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits insufficient. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response (strip markdown code blocks if present)
    let parsed;
    try {
      const jsonStr = rawContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: rawContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-rules error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
