/**
 * POST /api/admin/clients/[id]/intakes/analyze?intakeId=xxx
 *
 * AI analysis of a client intake submission — sharpens "mark as reviewed"
 * into an actual read: what the client needs, what to clarify, and whether
 * a proposal is worth drafting now. Advisory only; nothing here writes
 * anything except the analysis result itself (human decides what to act on).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { callAI, ADMIN_SYSTEM_PROMPT, AI_MODELS, isAIAvailable, GeminiRateLimitedError } from "@/lib/ai";
import { recordAiFailure, recordAiRecovery } from "@/lib/ai-monitor";
import { getClientJourneySummary } from "@/lib/client-journey";
import type { AIProvider } from "@/types";

const SERVICE_LABELS: Record<string, string> = {
  website: "Website / Web App",
  mobile: "Mobile App",
  erp: "Software / ERP System",
  design: "Design & Branding",
  consultancy: "Business Consultancy",
  ai_automation: "AI & Automation",
  other: "General Enquiry",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: clientId } = await params;
  const intakeId = new URL(request.url).searchParams.get("intakeId");
  if (!intakeId) return NextResponse.json({ error: "intakeId required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: intake, error: intakeError } = await supabase
    .from("client_intakes")
    .select("*")
    .eq("id", intakeId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (intakeError || !intake) return NextResponse.json({ error: "Intake not found" }, { status: 404 });

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
    return NextResponse.json({ error: "AI is currently unavailable — enable it in Admin → Settings → AI, or try again shortly." }, { status: 503 });
  }

  const journeyContext = await getClientJourneySummary(supabase, clientId);
  const serviceLabel = SERVICE_LABELS[intake.service_type] ?? intake.service_type;

  const userPrompt = `You are a sharp business analyst for Brightex Solutions, a Nairobi web/software agency. Review this client intake submission and give the business owner a fast, useful read before he responds — not a summary of what's already visible, but an actual assessment.

Service requested: ${serviceLabel}
Project title: ${intake.project_title ?? "(not given)"}
Description: ${intake.description}
${intake.problem_statement ? `Problem / challenge: ${intake.problem_statement}\n` : ""}${intake.specifics ? `Project specifics: ${JSON.stringify(intake.specifics)}\n` : ""}${intake.timeline ? `Desired timeline: ${intake.timeline}\n` : ""}${intake.budget_range ? `Budget range: ${intake.budget_range}\n` : ""}${intake.additional_notes ? `Additional notes: ${intake.additional_notes}\n` : ""}
${journeyContext ? `\nThis client's existing history with Brightex:\n${journeyContext}\n` : "\nThis is this client's first submission on record.\n"}

Return JSON in exactly this shape:
{
  "summary": "<2-4 sentences: what this client actually needs, and a sharp read on fit/priority, not a restatement of the form>",
  "considerations": ["<specific thing to clarify or watch out for before quoting/committing>", ... 2-4 items],
  "action_items": [{ "label": "<short specific action, e.g. 'Draft a proposal for the 5-page site rebuild'>", "type": "generate_proposal" }, { "label": "<other useful next step>", "type": "note" }, ... 2-4 items total, include exactly one "generate_proposal" item only if a proposal is actually warranted now]
}`;

  try {
    const text = await callAI({
      messages: [{ role: "user", content: userPrompt }],
      system: ADMIN_SYSTEM_PROMPT,
      model: aiModel,
      maxTokens: 900,
      provider: aiProvider,
      feature: "intake_analyze",
    });
    void recordAiRecovery();

    const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const analysis = JSON.parse(clean);

    // Persist so the analysis survives closing/reopening the panel and isn't
    // silently re-billed on every view — degrade gracefully if migration
    // 028_intake_ai_analysis.sql hasn't been applied yet.
    await supabase
      .from("client_intakes")
      .update({ ai_analysis: analysis, ai_analyzed_at: new Date().toISOString() })
      .eq("id", intakeId)
      .then(({ error: saveError }) => {
        if (saveError && !/column/i.test(saveError.message)) {
          console.error("[intake-analyze] Failed to persist analysis:", saveError);
        }
      });

    return NextResponse.json({ data: analysis, source: "ai" });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (!(err instanceof GeminiRateLimitedError)) {
      void recordAiFailure({ route: "/api/admin/clients/[id]/intakes/analyze", provider: aiProvider, reason: errorMessage });
    }
    return NextResponse.json({ error: "Analysis failed. Try again shortly." }, { status: 500 });
  }
}
