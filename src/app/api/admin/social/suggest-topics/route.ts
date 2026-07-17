/**
 * GET /api/admin/social/suggest-topics
 *
 * AI acting as a senior social media/marketing manager, proposing concrete
 * post ideas grounded in real recent business activity (newly-live
 * projects) where available, plus general authority-building angles for a
 * Nairobi digital agency. AI-first, deterministic fallback list.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { callAI, ADMIN_SYSTEM_PROMPT, AI_MODELS, isAIAvailable, GeminiRateLimitedError } from "@/lib/ai";
import { recordAiFailure, recordAiRecovery } from "@/lib/ai-monitor";
import { getActionCandidates } from "@/lib/ops-candidates";
import type { AIProvider } from "@/types";

const FALLBACK_TOPICS = [
  { topic: "Before/after of a recent website redesign", angle: "Visual proof of quality — strongest for engagement." },
  { topic: "A common mistake Kenyan businesses make with their website", angle: "Positions Brightex as the expert, invites comments." },
  { topic: "Behind the scenes of how a project gets built at Brightex", angle: "Builds trust and shows process." },
  { topic: "Client win or testimonial spotlight", angle: "Social proof, drives DMs from similar businesses." },
];

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const candidates = await getActionCandidates(supabase);
  const contentOpportunities = candidates.filter((c) => c.type === "content_opportunity");

  const { data: settingsRows } = await supabase.from("settings").select("key, value").in("key", ["ai_enabled", "ai_provider", "ai_model"]);
  const settingsMap: Record<string, string> = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const aiEnabled = settingsMap.ai_enabled !== "false";
  const aiProvider: AIProvider = (settingsMap.ai_provider as AIProvider) ?? "anthropic";
  const aiModel: string = settingsMap.ai_model ?? AI_MODELS.haiku;

  if (!aiEnabled || !isAIAvailable(aiProvider)) {
    return NextResponse.json({ topics: FALLBACK_TOPICS, source: "rule-based" });
  }

  const realActivity = contentOpportunities.length
    ? contentOpportunities.map((c) => `- ${c.detail}`).join("\n")
    : "No newly-launched projects on record right now.";

  const userPrompt = `You are a senior social media and marketing manager with 10+ years running high-converting campaigns for service businesses, now working for Brightex Solutions, a Nairobi-based web/software agency. Suggest 5 concrete, specific social media post topics for the next two weeks — not generic "post about your services" advice, but ideas someone could act on today.

Real recent business activity to draw from (use if relevant, don't force it):
${realActivity}

Return JSON array in exactly this shape:
[{ "topic": "<specific, concrete post idea>", "angle": "<one sentence on why this works / what it achieves>" }, ... 5 items]
Mix grounded ideas (from real activity above, if any) with general authority-building/engagement angles appropriate for a digital agency audience in Kenya.`;

  try {
    const text = await callAI({
      messages: [{ role: "user", content: userPrompt }],
      system: ADMIN_SYSTEM_PROMPT,
      model: aiModel,
      maxTokens: 800,
      provider: aiProvider,
      feature: "social_suggest_topics",
    });
    void recordAiRecovery();

    const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const topics = JSON.parse(clean);
    if (!Array.isArray(topics) || topics.length === 0) throw new Error("Empty topic list");

    return NextResponse.json({ topics, source: "ai" });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (!(err instanceof GeminiRateLimitedError)) {
      void recordAiFailure({ route: "/api/admin/social/suggest-topics", provider: aiProvider, reason: errorMessage });
    }
    return NextResponse.json({ topics: FALLBACK_TOPICS, source: "rule-based" });
  }
}
