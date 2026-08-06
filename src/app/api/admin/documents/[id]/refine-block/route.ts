/**
 * POST /api/admin/documents/[id]/refine-block
 *
 * Improves ONE section of a block document with a plain-English instruction.
 *
 * The whole-document refine route cannot be used here and refuses to try: it
 * works by handing the entire `data` object to a model and writing back what
 * comes out, which on a block document means the model has to reproduce every
 * section, id and nested array exactly. Any drift silently rewrites or drops
 * part of a document that may already be with a client.
 *
 * Sending one section instead makes the blast radius the section. The rest of
 * the document is never in the request, so it cannot be changed by accident,
 * and block ids and kinds are restored from the original afterwards so the
 * model cannot renumber or retype anything even within the section it was
 * given.
 *
 * Sections marked `locked` are refused outright: fixed legal clauses, computed
 * milestone tables and the derived fee section are not prose to be improved.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { callAI, ADMIN_SYSTEM_PROMPT, AI_MODELS, isAIAvailable, GeminiRateLimitedError } from "@/lib/ai";
import { recordAiFailure, recordAiRecovery } from "@/lib/ai-monitor";
import { logAction } from "@/lib/audit";
import { DOCUMENT_COPY_RULES } from "@/lib/document-copy-rules";
import { isBlockDocument } from "@/lib/document-html/blocks";
import { parseBlockDocument, normaliseCopy } from "@/lib/document-html/block-schema";
import type { AIProvider } from "@/types";
import type { BlockDocument, DocSection } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

/** Names the offending field. A bare "Invalid input" sends whoever hits it
 * reading source to work out which one was wrong. */
function invalid(error: z.ZodError): NextResponse {
  const problems = error.issues.map((i) => `${i.path.join(".") || "request"}: ${i.message}`);
  return NextResponse.json({ error: problems.join("; "), problems }, { status: 400 });
}

type Params = { params: Promise<{ id: string }> };

const RefineBlockSchema = z.object({
  sectionId: z.string().min(1).max(80),
  instruction: z.string().min(3).max(1000).trim(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const parsed = RefineBlockSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("generated_documents")
    .select("id, type, title, data, accepted_at")
    .eq("id", id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!isBlockDocument(doc.data)) {
    return NextResponse.json({ error: "This document is not section based." }, { status: 409 });
  }
  // A document a client has already accepted or signed is a record, not a draft.
  if (doc.accepted_at) {
    return NextResponse.json(
      { error: "This document has been accepted and can no longer be edited. Create a new version instead." },
      { status: 409 }
    );
  }

  const document = doc.data as BlockDocument;
  const index = document.sections.findIndex((s) => s.id === parsed.data.sectionId);
  if (index === -1) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const section = document.sections[index];
  if (section.locked) {
    return NextResponse.json(
      { error: `"${section.title}" is fixed: legal clauses and computed figures are not AI-editable.` },
      { status: 409 }
    );
  }

  const { data: settingsRows } = await supabase
    .from("settings").select("key, value").in("key", ["ai_enabled", "ai_provider", "ai_model"]);
  const settings: Record<string, string> = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );
  const provider: AIProvider = (settings.ai_provider as AIProvider) ?? "anthropic";
  if (settings.ai_enabled === "false" || !isAIAvailable(provider)) {
    return NextResponse.json({ error: "AI is currently unavailable: enable it in Admin, Settings, AI." }, { status: 503 });
  }

  const prompt = `${DOCUMENT_COPY_RULES}

You are revising ONE section of a Brightex Solutions ${document.type}. Here is that section as JSON:

\`\`\`json
${JSON.stringify({ title: section.title, tag: section.tag, blocks: section.blocks })}
\`\`\`

The business owner's instruction:
"""
${parsed.data.instruction}
"""

Return the COMPLETE section object in exactly the same shape: the same keys, the same block ids, the same block kinds, the same array structure. Change only what the instruction asks for. Return JSON only, no commentary and no code fence.`;

  try {
    const text = await callAI({
      messages: [{ role: "user", content: prompt }],
      system: ADMIN_SYSTEM_PROMPT,
      model: settings.ai_model ?? AI_MODELS.haiku,
      maxTokens: 2000,
      provider,
      feature: `document_refine_block:${document.type}`,
    });
    void recordAiRecovery();

    const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const returned = JSON.parse(clean) as Partial<DocSection>;
    if (typeof returned !== "object" || returned === null || !Array.isArray(returned.blocks)) {
      throw new Error("AI did not return a section object");
    }

    // Structural identity is restored from the original, never taken from the
    // model: ids address blocks for editing and gating, and kinds decide which
    // builder renders them. Only content is allowed through.
    const originalBlocks = new Map(section.blocks.map((b) => [b.id, b]));
    const mergedBlocks = returned.blocks
      .map((incoming) => {
        const original = originalBlocks.get((incoming as { id?: string }).id ?? "");
        if (!original) return null;
        return { ...incoming, id: original.id, kind: original.kind };
      })
      .filter(Boolean);

    // A model that dropped blocks would silently delete content. Keep the
    // original if the shape does not match.
    if (mergedBlocks.length !== section.blocks.length) {
      throw new Error("AI returned a different set of blocks");
    }

    const revised: DocSection = normaliseCopy({
      ...section,
      title: typeof returned.title === "string" && returned.title.trim() ? returned.title.trim() : section.title,
      tag: typeof returned.tag === "string" && returned.tag.trim() ? returned.tag.trim() : section.tag,
      blocks: mergedBlocks as DocSection["blocks"],
    });

    const next: BlockDocument = {
      ...document,
      sections: document.sections.map((s, i) => (i === index ? revised : s)),
    };

    // Validated as a whole: a revision that breaks the document is not saved.
    const validated = parseBlockDocument(next);
    if (!validated.ok || !validated.doc) {
      return NextResponse.json(
        { error: "The revision would have broken the document, so nothing was changed.", problems: validated.errors },
        { status: 422 }
      );
    }

    const { error: updateError } = await supabase
      .from("generated_documents")
      .update({ data: validated.doc, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await logAction({
      actor_id: user.id,
      actor_name: user.email ?? user.id,
      action: "refined_section",
      entity_type: "generated_document",
      entity_id: id,
      entity_label: doc.title,
      notes: `Section "${section.title}": ${parsed.data.instruction.slice(0, 200)}`,
    });

    return NextResponse.json({ section: revised, data: validated.doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!(err instanceof GeminiRateLimitedError)) {
      void recordAiFailure({ route: "/api/admin/documents/[id]/refine-block", intent: document.type, provider, reason: message });
    }
    return NextResponse.json(
      { error: "That revision could not be applied. Try rephrasing the instruction, or edit the section directly." },
      { status: 500 }
    );
  }
}
