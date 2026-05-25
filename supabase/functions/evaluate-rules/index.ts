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

interface RuleEvaluationResult {
  status: "APPROVING" | "WARNING" | "VIOLATED" | "NOT_MET";
  current_value: number | null;
  limit_value: number | null;
  progress_pct: number | null;
  message: string | null;
  computation_window: "daily" | "total" | "phase" | "payoutWindow";
  reference_date: string | null;
}

interface Mt5AccountSnapshot {
  id: string;
  connection_id: string;
  account_balance: number | null;
  equity: number | null;
  free_margin: number | null;
  profit: number | null;
  date: string | null;
  start_of_day_balance: number | null;
  trades_count_today: number | null;
  is_trading_day: boolean | null;
  created_at: string;
}

interface Mt5Trade {
  id: string;
  connection_id: string;
  symbol: string | null;
  volume: number | null;
  price: number | null;
  side: string | null;
  type: string | null;
  profit: number | null;
  commission: number | null;
  swap: number | null;
  created_at: string;
}

interface RuleInstance {
  id: string;
  rule_definition_id: string;
  mode: "percent" | "value";
  base_calculation: string;
  includes_floating: boolean;
  daily_reset: boolean;
  limit_value: number;
  severity: string;
  enabled: boolean;
  params: Record<string, unknown>;
}

interface RuleDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
}

interface TradingAccount {
  id: string;
  user_id: string;
  start_balance: number;
  current_balance: number;
  current_equity: number;
  highest_equity: number;
  status: string;
}

// Calculator functions

function calcMaxDailyLoss(
  todaySnapshot: Mt5AccountSnapshot | null,
  startBalance: number,
  limitPct: number,
  includesFloating: boolean
): RuleEvaluationResult {
  if (!todaySnapshot) {
    return {
      status: "NOT_MET",
      current_value: null,
      limit_value: limitPct,
      progress_pct: null,
      message: "No snapshot data available for today",
      computation_window: "daily",
      reference_date: new Date().toISOString().split("T")[0],
    };
  }

  const dailyPnl = todaySnapshot.profit || 0;
  const floatingPnl = includesFloating ? (todaySnapshot.profit || 0) : 0;
  const totalLoss = -(dailyPnl + floatingPnl);
  const limitAmount = (startBalance * limitPct) / 100;
  const progressPct = (totalLoss / limitAmount) * 100;

  let status: "APPROVING" | "WARNING" | "VIOLATED" | "NOT_MET" = "APPROVING";
  if (totalLoss >= limitAmount) {
    status = "VIOLATED";
  } else if (progressPct >= 80) {
    status = "WARNING";
  }

  return {
    status,
    current_value: totalLoss,
    limit_value: limitAmount,
    progress_pct: Math.min(progressPct, 100),
    message: `Daily loss: ${totalLoss.toFixed(2)} (${progressPct.toFixed(1)}% of limit)`,
    computation_window: "daily",
    reference_date: todaySnapshot.date || new Date().toISOString().split("T")[0],
  };
}

function calcMaxTotalLoss(
  currentBalance: number,
  currentEquity: number,
  startBalance: number,
  limitPct: number,
  includesFloating: boolean
): RuleEvaluationResult {
  const floor = startBalance - (startBalance * limitPct) / 100;
  const currentValue = includesFloating ? currentEquity : currentBalance;
  const lossFromStart = startBalance - currentValue;
  const maxAllowedLoss = startBalance - floor;
  const progressPct = (lossFromStart / maxAllowedLoss) * 100;

  let status: "APPROVING" | "WARNING" | "VIOLATED" | "NOT_MET" = "APPROVING";
  if (currentValue <= floor) {
    status = "VIOLATED";
  } else if (progressPct >= 75) {
    status = "WARNING";
  }

  return {
    status,
    current_value: currentValue,
    limit_value: floor,
    progress_pct: Math.min(progressPct, 100),
    message: `Current ${includesFloating ? "equity" : "balance"}: ${currentValue.toFixed(2)}, Floor: ${floor.toFixed(2)}`,
    computation_window: "total",
    reference_date: null,
  };
}

function calcTrailingDrawdown(
  snapshots: Mt5AccountSnapshot[],
  currentEquity: number,
  limitPct: number,
  startBalance: number
): RuleEvaluationResult {
  const allEquities = snapshots
    .map((s) => s.equity || 0)
    .filter((e) => e > 0);
  allEquities.push(currentEquity, startBalance);

  const hwm = Math.max(...allEquities);
  const floor = hwm - (hwm * limitPct) / 100;
  const progressPct = ((hwm - currentEquity) / (hwm - floor)) * 100;

  let status: "APPROVING" | "WARNING" | "VIOLATED" | "NOT_MET" = "APPROVING";
  if (currentEquity <= floor) {
    status = "VIOLATED";
  } else if (progressPct >= 75) {
    status = "WARNING";
  }

  return {
    status,
    current_value: currentEquity,
    limit_value: floor,
    progress_pct: Math.min(progressPct, 100),
    message: `HWM: ${hwm.toFixed(2)}, Current equity: ${currentEquity.toFixed(2)}, Floor: ${floor.toFixed(2)}`,
    computation_window: "total",
    reference_date: null,
  };
}

function calcProfitTarget(
  currentBalance: number,
  startBalance: number,
  targetPct: number
): RuleEvaluationResult {
  const profit = currentBalance - startBalance;
  const targetAmount = (startBalance * targetPct) / 100;
  const progressPct = (profit / targetAmount) * 100;

  const status: "APPROVING" | "WARNING" | "VIOLATED" | "NOT_MET" =
    profit >= targetAmount ? "APPROVING" : "NOT_MET";

  return {
    status,
    current_value: profit,
    limit_value: targetAmount,
    progress_pct: Math.min(progressPct, 100),
    message: `Profit: ${profit.toFixed(2)} (${progressPct.toFixed(1)}% of target)`,
    computation_window: "total",
    reference_date: null,
  };
}

function calcMinTradingDays(
  snapshots: Mt5AccountSnapshot[],
  minDays: number
): RuleEvaluationResult {
  const tradingDays = snapshots.filter(
    (s) => s.is_trading_day === true || (s.trades_count_today || 0) > 0
  ).length;

  const status: "APPROVING" | "WARNING" | "VIOLATED" | "NOT_MET" =
    tradingDays >= minDays ? "APPROVING" : "NOT_MET";

  return {
    status,
    current_value: tradingDays,
    limit_value: minDays,
    progress_pct: (tradingDays / minDays) * 100,
    message: `Trading days: ${tradingDays}/${minDays}`,
    computation_window: "total",
    reference_date: null,
  };
}

function calcConsistencyBestDayCap(
  snapshots: Mt5AccountSnapshot[],
  capPct: number
): RuleEvaluationResult {
  if (snapshots.length === 0) {
    return {
      status: "NOT_MET",
      current_value: null,
      limit_value: capPct,
      progress_pct: null,
      message: "No snapshot data available",
      computation_window: "total",
      reference_date: null,
    };
  }

  const dailyProfits = snapshots
    .map((s) => {
      if (s.start_of_day_balance && s.account_balance) {
        return s.account_balance - s.start_of_day_balance;
      }
      return s.profit || 0;
    })
    .filter((p) => p > 0);

  if (dailyProfits.length === 0) {
    return {
      status: "NOT_MET",
      current_value: null,
      limit_value: capPct,
      progress_pct: null,
      message: "No profitable days found",
      computation_window: "total",
      reference_date: null,
    };
  }

  const bestDayProfit = Math.max(...dailyProfits);
  const totalProfit = dailyProfits.reduce((sum, p) => sum + p, 0);
  const bestDayPct = (bestDayProfit / totalProfit) * 100;

  const status: "APPROVING" | "WARNING" | "VIOLATED" | "NOT_MET" =
    bestDayPct > capPct ? "VIOLATED" : "APPROVING";

  return {
    status,
    current_value: bestDayPct,
    limit_value: capPct,
    progress_pct: bestDayPct,
    message: `Best day: ${bestDayPct.toFixed(1)}% of total profit (cap: ${capPct}%)`,
    computation_window: "total",
    reference_date: null,
  };
}

function calcInactivity(
  snapshots: Mt5AccountSnapshot[],
  maxDays: number
): RuleEvaluationResult {
  if (snapshots.length === 0) {
    return {
      status: "NOT_MET",
      current_value: null,
      limit_value: maxDays,
      progress_pct: null,
      message: "No snapshot data available",
      computation_window: "total",
      reference_date: null,
    };
  }

  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime()
  );

  let consecutiveDays = 0;
  for (const snapshot of sortedSnapshots) {
    const hasTrading =
      snapshot.is_trading_day === true || (snapshot.trades_count_today || 0) > 0;
    if (hasTrading) {
      break;
    }
    consecutiveDays++;
  }

  const progressPct = (consecutiveDays / maxDays) * 100;
  let status: "APPROVING" | "WARNING" | "VIOLATED" | "NOT_MET" = "APPROVING";
  if (consecutiveDays >= maxDays) {
    status = "VIOLATED";
  } else if (progressPct >= 70) {
    status = "WARNING";
  }

  return {
    status,
    current_value: consecutiveDays,
    limit_value: maxDays,
    progress_pct: Math.min(progressPct, 100),
    message: `Consecutive inactive days: ${consecutiveDays}/${maxDays}`,
    computation_window: "total",
    reference_date: null,
  };
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: "Supabase environment variables not configured" });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const connectionId = String(body?.connectionId ?? "").trim();
    const tradingAccountId = String(body?.tradingAccountId ?? "").trim();

    if (!connectionId || !tradingAccountId) {
      return json(400, { error: "connectionId and tradingAccountId are required" });
    }

    // 1. Fetch trading account
    const { data: tradingAccount, error: accountError } = await admin
      .from("trading_accounts")
      .select("*")
      .eq("id", tradingAccountId)
      .single();

    if (accountError || !tradingAccount) {
      return json(404, { error: "Trading account not found" });
    }

    // 2. Fetch rule instances with rule definitions (only enabled)
    const { data: ruleInstances, error: rulesError } = await admin
      .from("rule_instances")
      .select(`
        *,
        rule_definitions (*)
      `)
      .eq("enabled", true);

    if (rulesError) {
      console.error("[evaluate-rules] Error fetching rule instances:", rulesError);
      return json(500, { error: "Failed to fetch rule instances" });
    }

    if (!ruleInstances || ruleInstances.length === 0) {
      return json(200, { evaluated: 0, violated: [], warning: [] });
    }

    // 3. Fetch MT5 trades from connection (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: trades, error: tradesError } = await admin
      .from("mt5_trades")
      .select("*")
      .eq("connection_id", connectionId)
      .gte("created_at", ninetyDaysAgo);

    if (tradesError) {
      console.error("[evaluate-rules] Error fetching trades:", tradesError);
      return json(500, { error: "Failed to fetch trades" });
    }

    // 4. Fetch MT5 account snapshots from connection (all, ordered by date)
    const { data: snapshots, error: snapshotsError } = await admin
      .from("mt5_account_snapshots")
      .select("*")
      .eq("connection_id", connectionId)
      .order("date", { ascending: true, nullsFirst: false });

    if (snapshotsError) {
      console.error("[evaluate-rules] Error fetching snapshots:", snapshotsError);
      return json(500, { error: "Failed to fetch snapshots" });
    }

    const violated: string[] = [];
    const warning: string[] = [];
    let evaluated = 0;

    // 5. For each rule instance, call the appropriate calculator
    for (const instance of ruleInstances) {
      const ruleDef = instance.rule_definitions as RuleDefinition;
      if (!ruleDef) continue;

      const ruleKey = ruleDef.key;
      let result: RuleEvaluationResult | null = null;

      const today = new Date().toISOString().split("T")[0];
      const todaySnapshot = snapshots?.find((s) => s.date === today) || null;

      switch (ruleKey) {
        case "max_daily_loss":
          result = calcMaxDailyLoss(
            todaySnapshot,
            tradingAccount.start_balance,
            instance.limit_value,
            instance.includes_floating
          );
          break;

        case "max_total_loss":
          result = calcMaxTotalLoss(
            tradingAccount.current_balance,
            tradingAccount.current_equity,
            tradingAccount.start_balance,
            instance.limit_value,
            instance.includes_floating
          );
          break;

        case "trailing_drawdown":
          result = calcTrailingDrawdown(
            snapshots || [],
            tradingAccount.current_equity,
            instance.limit_value,
            tradingAccount.start_balance
          );
          break;

        case "profit_target":
          result = calcProfitTarget(
            tradingAccount.current_balance,
            tradingAccount.start_balance,
            instance.limit_value
          );
          break;

        case "min_trading_days":
          result = calcMinTradingDays(
            snapshots || [],
            instance.limit_value
          );
          break;

        case "consistency_best_day_cap":
          result = calcConsistencyBestDayCap(
            snapshots || [],
            instance.limit_value
          );
          break;

        case "inactivity_limit":
          result = calcInactivity(
            snapshots || [],
            instance.limit_value
          );
          break;

        default:
          console.log(`[evaluate-rules] Unknown rule key: ${ruleKey}`);
          continue;
      }

      if (!result) continue;

      // 6. Upsert into rule_evaluations
      const { error: upsertError } = await admin
        .from("rule_evaluations")
        .upsert(
          {
            trading_account_id: tradingAccountId,
            rule_instance_id: instance.id,
            connection_id: connectionId,
            status: result.status,
            current_value: result.current_value,
            limit_value: result.limit_value,
            progress_pct: result.progress_pct,
            message: result.message,
            computation_window: result.computation_window,
            reference_date: result.reference_date,
            computed_at: new Date().toISOString(),
          },
          {
            onConflict: "trading_account_id,rule_instance_id,reference_date",
          }
        );

      if (upsertError) {
        console.error("[evaluate-rules] Error upserting evaluation:", upsertError);
        continue;
      }

      evaluated++;

      if (result.status === "VIOLATED") {
        violated.push(ruleDef.name);
      } else if (result.status === "WARNING") {
        warning.push(ruleDef.name);
      }
    }

    // 7. If any violations, update trading account status
    if (violated.length > 0) {
      await admin
        .from("trading_accounts")
        .update({ status: "violated" })
        .eq("id", tradingAccountId);
    }

    return json(200, {
      evaluated,
      violated,
      warning,
    });
  } catch (e) {
    console.error("[evaluate-rules] fatal error:", e);
    return json(500, {
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
});
