/**
 * POST /api/admin/documents/generate
 *
 * AI-assisted document drafting for proposals, client agreements, and
 * internal SOPs. Split of responsibility, deliberately:
 *   - AI only ever fills in the CONTENT fields it's asked for (scope,
 *     pricing narrative, procedure steps, etc.) from Godwin's engagement
 *     summary.
 *   - Every deterministic field — reference numbers, dates, client contact
 *     details — is looked up/computed by this route, never invented by AI.
 *   - Agreement legal clauses (IP, confidentiality, termination, liability,
 *     governing law) are FIXED text in document-html/agreement.ts, never
 *     AI-drafted — only the commercial specifics (scope/fees/timeline) are
 *     AI-assisted.
 * The document itself is rendered on demand from the saved `data` — see
 * /api/admin/documents/[id]/view and /api/public/documents/[id].
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { callAI, ADMIN_SYSTEM_PROMPT, AI_MODELS, isAIAvailable, GeminiRateLimitedError } from "@/lib/ai";
import { recordAiFailure, recordAiRecovery } from "@/lib/ai-monitor";
import { logAction } from "@/lib/audit";
import { DOCUMENT_COPY_RULES } from "@/lib/document-copy-rules";
import { getClientJourneySummary } from "@/lib/client-journey";
import type { AIProvider } from "@/types";

const GenerateSchema = z.object({
  type: z.enum(["proposal", "agreement", "sop"]),
  clientId: z.string().uuid().optional(),
  engagementSummary: z.string().min(10).max(4000).trim(),
  totalBudget: z.number().positive().optional(),
  timeline: z.string().max(100).trim().optional(),
  depositPercent: z.number().min(0).max(100).optional(),
  saleId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  gated: z.boolean().optional(),
  /** The proposal (or other document) this one was prepared from — e.g. an
   * agreement generated from an accepted proposal. Purely a reference for
   * cross-navigation; content is always freshly drafted, never copied. */
  sourceDocumentId: z.string().uuid().optional(),
});

const COPY_RULES = DOCUMENT_COPY_RULES;

function refPrefix(type: string): string {
  return type === "proposal" ? "PROP" : type === "agreement" ? "AGR" : "SOP";
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = GenerateSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  const payload = result.data;

  const supabase = createAdminClient();

  if (payload.type !== "sop" && !payload.clientId) {
    return NextResponse.json({ error: "A client is required for a proposal or agreement." }, { status: 400 });
  }

  let client: { id: string; name: string; company: string | null; email: string | null; phone: string | null } | null = null;
  if (payload.clientId) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id, name, company, email, phone")
      .eq("id", payload.clientId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!clientRow) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    client = clientRow;
  }

  // Ground the draft in what's actually true about this client's history with
  // Brightex — existing projects, outstanding balances, prior documents —
  // so a fresh proposal/agreement never contradicts known facts.
  const journeyContext = payload.clientId ? await getClientJourneySummary(supabase, payload.clientId) : "";
  const journeyBlock = journeyContext
    ? `\n\nKnown context on this client's history with Brightex (factual, from real records — use to avoid contradicting it, don't restate unless relevant to the instruction):\n${journeyContext}`
    : "";

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("generated_documents")
    .select("*", { count: "exact", head: true })
    .eq("type", payload.type)
    .gte("created_at", `${year}-01-01`);
  const referenceCode = `${refPrefix(payload.type)}-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

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
    return NextResponse.json({ error: "AI is currently unavailable — enable it in Admin → Settings → AI, or try again shortly." }, { status: 503 });
  }

  let userPrompt: string;
  if (payload.type === "proposal") {
    userPrompt = `${COPY_RULES}

Draft the content for a Brightex Solutions project proposal, based on this engagement summary from the business owner. Match the depth of a real, hand-written client proposal, not a generic template: name the client's actual problem, show you understand it, and only go deep on a deliverable when the engagement summary actually gives you enough to say something specific and true about it.

"""
${payload.engagementSummary}
"""

Client: ${client!.company?.trim() || client!.name}${payload.totalBudget ? `\nTarget budget: KES ${payload.totalBudget.toLocaleString()}` : ""}${payload.timeline ? `\nTimeline: ${payload.timeline}` : ""}${journeyBlock}

Return JSON in exactly this shape:
{
  "project_title": "<short, specific project name>",
  "cover_tagline": "<optional: a short, punchy cover headline capturing the outcome, e.g. 'Turning every enquiry into a booked sale.' — omit if nothing better than the title fits>",
  "intro": "<2-4 sentence executive summary: what the client actually asked for, and what's broken or missing today>",
  "problem_points": ["<optional: 2-5 concrete, specific pain points named in the engagement summary>", ...] or omit entirely if the summary doesn't support it,
  "solution_points": ["<optional: 2-4 points on what changes / what this fixes, paired with problem_points — omit if problem_points is omitted>", ...],
  "scope_items": [
    {
      "title": "<deliverable>",
      "description": "<1-2 sentences — always include this>",
      "tag": "<optional: only when this deliverable deserves its own full section, e.g. 'Part 1 · The website' — omit for a simple one-line deliverable>",
      "problem_points": ["<optional, only if tag is set: what's wrong today specific to this deliverable>"],
      "solution_points": ["<optional, only if tag is set: what this specifically does>"],
      "included": ["<optional, only if tag is set: what's included, be specific>"],
      "excluded": ["<optional, only if tag is set: what's explicitly out of scope>"],
      "needed_from_client": ["<optional, only if tag is set: what you need from the client to deliver this>"]
    }, ... 3-6 items. Do not set "tag" (or any of the fields below it) on every item — only the ones that genuinely warrant a deep dive; the rest should just have title + description.
  ],
  "line_items": [{ "description": "<line item, matching a scope_items title where relevant>", "qty": <number>, "unit_price": <number, KES> }, ... amounts must sum sensibly toward the target budget if one was given],
  "recommended_bundle": { "label": "<e.g. 'Recommended starting package'>", "item_titles": ["<line_items description(s) that make up this bundle>"], "amount": <number, sum of those line items>, "note": "<optional one-line reason>" } — ONLY include this if the line items naturally split into "core recommended now" vs "optional add later"; omit entirely if the whole list is meant to be delivered together,
  "payment_terms": { "deposit_percent": ${payload.depositPercent ?? 50}, "note": "<one sentence on what happens after deposit>" },
  "timeline": "<short summary e.g. '4-6 weeks' — always include>",
  "phased_timeline": [{ "period": "<e.g. 'Weeks 1-2'>", "title": "<phase name>", "description": "<what happens>", "is_launch": <true only on the final/launch phase> }, ...] — ONLY if the engagement summary gives enough to break the work into real phases; omit for a simple one-shot delivery,
  "retainer_tiers": [{ "name": "<tier name>", "price": <number, KES/mo>, "features": ["<...>"], "featured": <true for the one you'd recommend> }, ... 2-3 tiers] — ONLY if an ongoing monthly plan makes sense for this engagement (e.g. a website, app, or system needing upkeep); omit for a one-off deliverable with no ongoing component,
  "next_steps": [{ "title": "<step>", "description": "<what it involves>" }, ... 2-4 steps specific to this engagement] — omit to use a sensible default,
  "notes": "<optional: anything else worth noting (what's explicitly not included, e.g. domain/hosting/ad spend if relevant), or omit this field>"
}`;
  } else if (payload.type === "agreement") {
    userPrompt = `${COPY_RULES}

Draft the commercial specifics for a Brightex Solutions services agreement, based on this engagement summary from the business owner. Do NOT draft any legal clauses (IP, confidentiality, termination, liability, governing law) — those are fixed and added separately. Only draft the scope and commercial terms below.

"""
${payload.engagementSummary}
"""

Client: ${client!.company?.trim() || client!.name}${payload.totalBudget ? `\nAgreed fees: KES ${payload.totalBudget.toLocaleString()}` : ""}${payload.timeline ? `\nTimeline: ${payload.timeline}` : ""}${journeyBlock}

Return JSON in exactly this shape:
{
  "project_title": "<short, specific project name>",
  "scope_summary": "<2-3 sentence description of the work being agreed to>",
  "deliverables": ["<deliverable 1>", "<deliverable 2>", ...],
  "total_fees": <number, KES${payload.totalBudget ? `, use ${payload.totalBudget}` : ""}>,
  "payment_milestones": [{ "label": "<e.g. Deposit>", "amount": <number>, "due": "<e.g. On signing>" }, ... amounts must sum to total_fees],
  "timeline": "<e.g. '6 weeks'>",
  "special_terms": "<optional: any unusual terms specific to this engagement, or omit this field>"
}`;
  } else {
    userPrompt = `You are drafting an internal Standard Operating Procedure for Brightex Solutions. This is an internal document, not client-facing, so be specific and practical rather than marketing-toned. Never invent steps, roles, or tools not implied by the description given — this is a factual internal reference, not a generic template.

Business owner's description of this process:
"""
${payload.engagementSummary}
"""

Return JSON in exactly this shape:
{
  "title": "<short SOP title>",
  "area": "<e.g. 'Client Onboarding', 'Invoicing', 'Project Delivery'>",
  "purpose": "<1-2 sentences on why this SOP exists>",
  "scope": "<1-2 sentences on what this SOP covers and does not cover>",
  "responsibilities": [{ "role": "<role/person actually mentioned or clearly implied>", "responsibility": "<what they own>" }, ...],
  "procedure_steps": [{ "step": "<short step title>", "description": "<what to do>" }, ... in order],
  "tools_systems": ["<only tools/systems explicitly named in the description above — leave this array empty if none are named, do NOT suggest generic examples like Salesforce, Jira, or DocuSign>"],
  "escalation": "<what to do if something goes wrong or is unclear, grounded in what was described>"
}`;
  }

  try {
    const text = await callAI({
      messages: [{ role: "user", content: userPrompt }],
      system: ADMIN_SYSTEM_PROMPT,
      model: aiModel,
      maxTokens: 4000,
      provider: aiProvider,
      feature: `document_generate:${payload.type}`,
    });
    void recordAiRecovery();

    const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const aiContent = JSON.parse(clean);

    const now = new Date().toISOString();
    let data: Record<string, unknown>;
    let title: string;

    if (payload.type === "proposal") {
      data = {
        proposal_number: referenceCode,
        created_at: now,
        valid_until: new Date(Date.now() + 14 * 86400000).toISOString(),
        client: { name: client!.name, company: client!.company, email: client!.email, phone: client!.phone },
        ...aiContent,
      };
      title = aiContent.project_title ?? "Proposal";
    } else if (payload.type === "agreement") {
      data = {
        agreement_number: referenceCode,
        created_at: now,
        client: { name: client!.name, company: client!.company, email: client!.email, phone: client!.phone },
        ...aiContent,
      };
      title = aiContent.project_title ?? "Services Agreement";
    } else {
      data = {
        sop_number: referenceCode,
        effective_date: now,
        revision: "1.0",
        ...aiContent,
      };
      title = aiContent.title ?? "Standard Operating Procedure";
    }

    const { data: saved, error } = await supabase
      .from("generated_documents")
      .insert({
        type: payload.type,
        client_id: payload.clientId ?? null,
        sale_id: payload.saleId ?? null,
        project_id: payload.projectId ?? null,
        title,
        reference_code: referenceCode,
        data,
        status: "draft",
        source: "ai",
        gated: payload.gated ?? false,
        source_document_id: payload.sourceDocumentId ?? null,
        engagement_summary: payload.engagementSummary,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAction({
      actor_id: user.id,
      actor_name: user.email ?? user.id,
      action: "generated_document",
      entity_type: "generated_document",
      entity_id: saved.id,
      entity_label: `${referenceCode} — ${title}`,
      notes: `Type: ${payload.type} · AI-drafted`,
    });

    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (!(err instanceof GeminiRateLimitedError)) {
      void recordAiFailure({ route: "/api/admin/documents/generate", intent: payload.type, provider: aiProvider, reason: errorMessage });
    }
    return NextResponse.json({ error: "Document generation failed. Try again shortly." }, { status: 500 });
  }
}
