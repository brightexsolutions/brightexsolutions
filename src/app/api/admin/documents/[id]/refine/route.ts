/**
 * POST /api/admin/documents/[id]/refine
 *
 * Lets Godwin refine an already-generated document with a plain-English
 * instruction while previewing it ("lower the price by 10%", "add a scope
 * item for ongoing maintenance", "make the deposit 30% instead of 50%")
 * instead of only having "regenerate from scratch" or manual field editing.
 *
 * AI receives the full current `data` JSON and returns the full updated
 * JSON in the same shape. Identity/reference fields (reference code, dates,
 * client) are restored from the original after parsing so the AI can never
 * drift those, mirroring the discipline in documents/generate/route.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { callAI, ADMIN_SYSTEM_PROMPT, AI_MODELS, isAIAvailable, GeminiRateLimitedError } from "@/lib/ai";
import { recordAiFailure, recordAiRecovery } from "@/lib/ai-monitor";
import { logAction } from "@/lib/audit";
import { DOCUMENT_COPY_RULES } from "@/lib/document-copy-rules";
import type { AIProvider } from "@/types";

type Params = { params: Promise<{ id: string }> };

const RefineSchema = z.object({
  instruction: z.string().min(3).max(1000).trim(),
});

// Fields the AI must never be allowed to drift — restored from the original
// document after every refine, regardless of what the AI returns for them.
const LOCKED_FIELDS: Record<string, string[]> = {
  proposal: ["proposal_number", "created_at", "valid_until", "client"],
  agreement: ["agreement_number", "created_at", "client"],
  sop: ["sop_number", "effective_date", "revision"],
};

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = RefineSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const supabase = createAdminClient();
  const { data: doc, error: docError } = await supabase
    .from("generated_documents")
    .select("id, type, data, title")
    .eq("id", id)
    .maybeSingle();

  if (docError || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

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

  const userPrompt = `${DOCUMENT_COPY_RULES}

You are refining an existing Brightex Solutions ${doc.type} document. Here is its current content as JSON:

\`\`\`json
${JSON.stringify(doc.data)}
\`\`\`

The business owner's instruction for this revision:
"""
${result.data.instruction}
"""

Apply ONLY what the instruction asks for. Leave every other field exactly as it was. Return the COMPLETE updated JSON object in the exact same shape as the input (same keys, same structure) — not a diff, not just the changed fields.`;

  try {
    const text = await callAI({
      messages: [{ role: "user", content: userPrompt }],
      system: ADMIN_SYSTEM_PROMPT,
      model: aiModel,
      maxTokens: 2500,
      provider: aiProvider,
      feature: `document_refine:${doc.type}`,
    });
    void recordAiRecovery();

    const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const refined = JSON.parse(clean);
    if (typeof refined !== "object" || refined === null || Array.isArray(refined)) {
      throw new Error("AI did not return a document object");
    }

    const original = doc.data as Record<string, unknown>;
    const locked = LOCKED_FIELDS[doc.type] ?? [];
    const merged: Record<string, unknown> = { ...original, ...refined };
    for (const key of locked) {
      if (key in original) merged[key] = original[key];
    }

    const { data: updated, error: updateError } = await supabase
      .from("generated_documents")
      .update({ data: merged, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await logAction({
      actor_id: user.id,
      actor_name: user.email ?? user.id,
      action: "refined_document",
      entity_type: "generated_document",
      entity_id: id,
      entity_label: doc.title,
      notes: `Instruction: ${result.data.instruction.slice(0, 200)}`,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (!(err instanceof GeminiRateLimitedError)) {
      void recordAiFailure({ route: "/api/admin/documents/[id]/refine", intent: doc.type, provider: aiProvider, reason: errorMessage });
    }
    return NextResponse.json({ error: "Refinement failed. Try rephrasing the instruction, or try again shortly." }, { status: 500 });
  }
}
