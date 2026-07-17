/**
 * GET /api/admin/suggested-actions
 *
 * Cross-module "what should I do next" surface for the admin dashboard.
 * Candidates come from lib/ops-candidates.ts (deterministic, built from real
 * rows) — AI here is only ever used to prioritise and sharpen the wording of
 * candidates that already exist; it never invents a candidate or a link, so
 * a hallucinated entity can't reach the UI.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { callAI, ADMIN_SYSTEM_PROMPT, AI_MODELS, isAIAvailable, GeminiRateLimitedError } from "@/lib/ai";
import { recordAiFailure, recordAiRecovery } from "@/lib/ai-monitor";
import { getActionCandidates, type ActionCandidate } from "@/lib/ops-candidates";
import type { AIProvider } from "@/types";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const candidates = await getActionCandidates(supabase);

  if (candidates.length === 0) {
    return NextResponse.json({
      headline: "Nothing urgent right now — no overdue invoices, stale leads, overdue tasks, quiet active clients, stuck projects, or unresolved alerts.",
      actions: [],
      source: "rule-based",
    });
  }

  const ruleBasedTop = candidates.slice(0, 6);

  // ── AI settings (same pattern as /api/admin/ai) ──────────────────────────
  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["ai_enabled", "ai_provider", "ai_model"]);
  const settingsMap: Record<string, string> = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );
  const aiEnabled = settingsMap.ai_enabled !== "false";
  const aiProvider: AIProvider = (settingsMap.ai_provider as AIProvider) ?? "anthropic";
  const aiModel: string = settingsMap.ai_model ?? AI_MODELS.haiku;

  if (!aiEnabled || !isAIAvailable(aiProvider)) {
    return NextResponse.json({
      headline: `${candidates.length} item${candidates.length === 1 ? "" : "s"} need attention, sorted by urgency.`,
      actions: ruleBasedTop,
      source: "rule-based",
    });
  }

  const candidateList = candidates
    .map((c) => `- id:"${c.id}" [${c.type}] ${c.title} — ${c.detail}`)
    .join("\n");

  const userPrompt = `Here is a grounded list of real, already-verified action candidates pulled directly from Brightex Solutions' database (clients, invoices, leads, tasks, projects, system alerts). Do NOT invent any new candidate, client, invoice, or link — only work with the ids listed below.

${candidateList}

Return JSON in exactly this shape:
{
  "headline": "<one direct sentence on the overall state — call out the single biggest concern, don't just say everything is fine unless it genuinely is>",
  "rankedIds": ["<id>", "<id>", ...up to 6, most important first],
  "notes": { "<id>": "<a sharper, more specific 1-sentence action recommendation for this item, referencing only the facts given>", ... }
}
"notes" is optional per id — only include it where you have something more specific to say than the given detail.`;

  try {
    const text = await callAI({
      messages: [{ role: "user", content: userPrompt }],
      system: ADMIN_SYSTEM_PROMPT,
      model: aiModel,
      maxTokens: 2000,
      provider: aiProvider,
      feature: "suggested_actions",
    });

    void recordAiRecovery();

    const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(clean) as { headline?: string; rankedIds?: string[]; notes?: Record<string, string> };

    const byId = new Map(candidates.map((c) => [c.id, c]));
    const ranked = (parsed.rankedIds ?? [])
      .map((id) => byId.get(id))
      .filter((c): c is ActionCandidate => !!c)
      .slice(0, 6)
      .map((c) => (parsed.notes?.[c.id] ? { ...c, detail: parsed.notes[c.id] } : c));

    if (ranked.length === 0) {
      return NextResponse.json({
        headline: `${candidates.length} item${candidates.length === 1 ? "" : "s"} need attention, sorted by urgency.`,
        actions: ruleBasedTop,
        source: "rule-based",
      });
    }

    return NextResponse.json({
      headline: parsed.headline ?? `${candidates.length} items need attention.`,
      actions: ranked,
      source: "ai",
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (!(err instanceof GeminiRateLimitedError)) {
      void recordAiFailure({ route: "/api/admin/suggested-actions", provider: aiProvider, reason: errorMessage });
    }
    return NextResponse.json({
      headline: `${candidates.length} item${candidates.length === 1 ? "" : "s"} need attention, sorted by urgency.`,
      actions: ruleBasedTop,
      source: "rule-based",
    });
  }
}
