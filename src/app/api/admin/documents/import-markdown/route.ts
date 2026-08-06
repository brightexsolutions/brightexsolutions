/**
 * GET  /api/admin/documents/import-markdown?clientId=&intakeId=   the prompt
 * POST /api/admin/documents/import-markdown                        the import
 *
 * Closes the loop on drafting a proposal outside the app.
 *
 * GET returns a prompt: the client's brief, the house copy rules, and the exact
 * markdown contract this route parses. Paste it wherever the drafting happens.
 *
 * POST takes the markdown that comes back and turns it into a real document:
 * validated, section based, gateable, editable, signable. The point is that
 * house rules are applied by CODE at the boundary rather than remembered by
 * whoever was drafting. Two real hand-authored proposals are kept in
 * docs/fixtures and both arrived with em dashes, no A4 print rule and no
 * responsive layout. That is not carelessness, it is what happens to any rule
 * that lives only in someone's head on a deadline.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { DOCUMENT_COPY_RULES } from "@/lib/document-copy-rules";
import { buildIntakeBrief } from "@/lib/intake-schema";
import { getClientJourneySummary } from "@/lib/client-journey";
import { parseMarkdownSections, MARKDOWN_CONTRACT } from "@/lib/document-html/markdown-import";
import { parseBlockDocument } from "@/lib/document-html/block-schema";
import { documentTotal, needsFigureLock, fmtMoney } from "@/lib/document-html/blocks";
import type { BlockDocument } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

// ─── The prompt ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  const intakeId = request.nextUrl.searchParams.get("intakeId");
  const supabase = createAdminClient();

  let clientLabel = "the client";
  let brief = "";
  let journey = "";

  if (clientId) {
    const { data: client } = await supabase
      .from("clients").select("name, company").eq("id", clientId).maybeSingle();
    if (client) clientLabel = client.company?.trim() || client.name;
    journey = await getClientJourneySummary(supabase, clientId);
  }

  const { data: intake } = intakeId
    ? await supabase.from("client_intakes").select("*").eq("id", intakeId).maybeSingle()
    : clientId
      ? await supabase.from("client_intakes").select("*").eq("client_id", clientId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle()
      : { data: null };

  if (intake) brief = buildIntakeBrief(intake);

  const prompt = [
    `Draft a Brightex Solutions proposal for ${clientLabel}.`,
    "",
    brief ? `WHAT THE CLIENT TOLD US\n${brief}` : "No intake on file: work from the notes below.",
    journey ? `\nTHEIR HISTORY WITH BRIGHTEX (factual, do not contradict)\n${journey}` : "",
    "",
    DOCUMENT_COPY_RULES,
    "",
    "OUTPUT FORMAT",
    MARKDOWN_CONTRACT,
  ].filter(Boolean).join("\n");

  return NextResponse.json({ prompt, clientLabel, hasIntake: !!intake });
}

// ─── The import ─────────────────────────────────────────────────────────────

const ImportSchema = z.object({
  markdown: z.string().min(40).max(200_000),
  clientId: z.string().uuid(),
  type: z.enum(["proposal", "techdoc"]).optional().default("proposal"),
  title: z.string().max(200).trim().optional(),
  coverTagline: z.string().max(240).trim().optional(),
  referenceCode: z.string().max(40).trim().optional(),
  gated: z.boolean().optional().default(false),
  /** Preview only: parse and report, store nothing. */
  dryRun: z.boolean().optional().default(false),
});

function refPrefix(type: string): string {
  return type === "proposal" ? "PROP" : "TECH";
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const parsed = ImportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("clients").select("id, name, company, email, phone")
    .eq("id", parsed.data.clientId).is("deleted_at", null).maybeSingle();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const result = parseMarkdownSections(parsed.data.markdown);
  if (result.sections.length === 0) {
    return NextResponse.json(
      { error: "Nothing readable in that markdown.", warnings: result.warnings },
      { status: 422 }
    );
  }

  const clientLabel = client.company?.trim() || client.name;
  const year = new Date().getFullYear();
  let referenceCode = parsed.data.referenceCode;
  if (!referenceCode) {
    const { count } = await supabase
      .from("generated_documents").select("id", { count: "exact", head: true })
      .eq("type", parsed.data.type).gte("created_at", `${year}-01-01`);
    referenceCode = `${refPrefix(parsed.data.type)}-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;
  }

  const title = parsed.data.title?.trim() || `Proposal: ${clientLabel}`;
  const total = (() => {
    const draft = { sections: result.sections } as unknown as BlockDocument;
    try { return documentTotal(draft); } catch { return null; }
  })();

  const doc: BlockDocument = {
    version: 2,
    type: parsed.data.type,
    meta: {
      title,
      coverTag: parsed.data.type === "proposal" ? "Project proposal" : "Technical documentation",
      coverTitle: parsed.data.coverTagline?.trim() || title,
      reference_code: referenceCode,
      created_at: new Date().toISOString(),
      client: { name: client.name, company: client.company, email: client.email, phone: client.phone },
      badges: total ? [{ label: "Investment", value: `KES ${fmtMoney(total)}` }] : undefined,
      confidentialFor: clientLabel,
    },
    sections: result.sections,
    ...(result.schedule ? { schedule: result.schedule } : {}),
  };

  const validated = parseBlockDocument(doc);
  if (!validated.ok || !validated.doc) {
    return NextResponse.json(
      {
        error: "The markdown parsed, but the result is not a valid document.",
        problems: validated.errors,
        warnings: result.warnings,
      },
      { status: 422 }
    );
  }

  const summary = {
    sections: validated.doc.sections.map((s) => ({ id: s.id, title: s.title, blocks: s.blocks.length, indicative: !!s.indicative })),
    total: total ? fmtMoney(total) : null,
    needs_figure_lock: needsFigureLock(validated.doc),
    schedule: result.schedule?.stages.map((s) => `${s.percent}% ${s.trigger}`) ?? null,
    unrecognised_headings: result.unrecognised,
    warnings: result.warnings,
  };

  // Dry run: everything above, nothing stored. Lets the editor show what would
  // be created before anything exists.
  if (parsed.data.dryRun) {
    return NextResponse.json({ preview: validated.doc, summary });
  }

  const { data: created, error } = await supabase
    .from("generated_documents")
    .insert({
      type: parsed.data.type,
      client_id: client.id,
      title,
      reference_code: referenceCode,
      data: validated.doc,
      gated: parsed.data.gated,
      gate_mode: parsed.data.gated ? "manual" : "off",
      status: "draft",
      source: "import",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created",
    entity_type: "generated_document",
    entity_id: created.id,
    entity_label: `${title} (${referenceCode})`,
    notes:
      `Imported from markdown: ${validated.doc.sections.length} sections` +
      (result.unrecognised.length ? `, ${result.unrecognised.length} unrecognised heading(s)` : "") +
      (result.warnings.length ? `, ${result.warnings.length} warning(s)` : ""),
  });

  return NextResponse.json({ data: created, summary }, { status: 201 });
}
