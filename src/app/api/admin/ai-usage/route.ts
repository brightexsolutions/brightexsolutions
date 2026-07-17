import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getGeminiBudgetStatus } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [logsRes, budget] = await Promise.all([
    supabase.from("ai_usage_logs").select("feature, provider, model, is_free_tier, tokens_in, tokens_out, created_at").order("created_at", { ascending: false }).limit(500),
    getGeminiBudgetStatus(),
  ]);

  const logs = logsRes.data ?? [];

  const summarize = (rows: typeof logs) => ({
    calls: rows.length,
    tokensIn: rows.reduce((s, r) => s + (r.tokens_in ?? 0), 0),
    tokensOut: rows.reduce((s, r) => s + (r.tokens_out ?? 0), 0),
  });

  const todayLogs = logs.filter((l) => l.created_at >= todayStart);
  const weekLogs = logs.filter((l) => l.created_at >= weekStart);

  const byFeatureMap = new Map<string, { calls: number; tokensIn: number; tokensOut: number }>();
  for (const l of logs) {
    const existing = byFeatureMap.get(l.feature) ?? { calls: 0, tokensIn: 0, tokensOut: 0 };
    existing.calls += 1;
    existing.tokensIn += l.tokens_in ?? 0;
    existing.tokensOut += l.tokens_out ?? 0;
    byFeatureMap.set(l.feature, existing);
  }
  const byFeature = Array.from(byFeatureMap.entries())
    .map(([feature, stats]) => ({ feature, ...stats }))
    .sort((a, b) => b.calls - a.calls);

  const freeTierCalls = logs.filter((l) => l.provider === "gemini" && l.is_free_tier).length;
  const paidTierCalls = logs.filter((l) => l.provider === "gemini" && !l.is_free_tier).length;
  const anthropicCalls = logs.filter((l) => l.provider === "anthropic").length;

  return NextResponse.json({
    today: summarize(todayLogs),
    thisWeek: summarize(weekLogs),
    allTimeSampled: summarize(logs),
    byFeature,
    tierSplit: { free: freeTierCalls, paid: paidTierCalls, anthropic: anthropicCalls },
    budget,
    hasPaidKeyConfigured: !!process.env.GEMINI_PAID_API_KEY,
  });
}
