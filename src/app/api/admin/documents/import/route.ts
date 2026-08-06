/**
 * POST /api/admin/documents/import
 *
 * Brings a document authored elsewhere into the system as a real, section-based
 * document: reference code, public link, per-section gating, acceptance,
 * signing and audit trail, all the same as one drafted in-app.
 *
 * This is the counterpart to the upload route. Upload stores a finished HTML
 * file verbatim, which is the right answer for a genuinely bespoke one-off but
 * gives up everything afterwards: it cannot be edited, cannot have a section
 * hidden, cannot generate its own teaser, and cannot be signed. Import instead
 * takes the document's CONTENT and renders it through the house builders, so it
 * inherits the responsive link view, A4 print output, table collapsing and the
 * copy rules whether or not whoever authored it remembered them.
 *
 * Everything is validated before it is stored. An invalid document that stores
 * successfully and renders a blank section is discovered by the client, which
 * is the one failure mode worth spending code to prevent.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { parseBlockDocument } from "@/lib/document-html/block-schema";
import { documentTotal, needsFigureLock, fmtMoney } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

const ImportSchema = z.object({
  /** The block document. Validated by parseBlockDocument, not here. */
  document: z.unknown(),
  clientId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  gated: z.boolean().optional().default(false),
  /** Keeps the reference code the document was authored with (e.g. an existing
   * BX-CHANF-0826 already quoted to a client) instead of allocating a new one. */
  keepReferenceCode: z.boolean().optional().default(true),
  originalFilename: z.string().max(255).trim().optional(),
});

function refPrefix(type: string): string {
  return type === "proposal" ? "PROP" : type === "agreement" ? "AGR" : type === "techdoc" ? "TECH" : "SOP";
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const parsed = ImportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const validated = parseBlockDocument(parsed.data.document);
  if (!validated.ok || !validated.doc) {
    return NextResponse.json(
      {
        error: "This document could not be imported. Fix the problems listed and try again.",
        problems: validated.errors,
      },
      { status: 422 }
    );
  }
  const doc = validated.doc;

  const supabase = createAdminClient();

  // A proposal or agreement without a client cannot be sent, signed, invoiced
  // or chased, so it is refused rather than stored as an orphan.
  if (doc.type !== "sop" && doc.type !== "techdoc" && !parsed.data.clientId) {
    return NextResponse.json({ error: "A client is required for a proposal or agreement." }, { status: 400 });
  }

  if (parsed.data.clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", parsed.data.clientId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Reference code: keep the authored one where asked (it may already be in a
  // client's inbox), otherwise allocate the next in sequence.
  let referenceCode = doc.meta.reference_code;
  if (!parsed.data.keepReferenceCode) {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("generated_documents")
      .select("id", { count: "exact", head: true })
      .eq("type", doc.type)
      .gte("created_at", `${year}-01-01`);
    referenceCode = `${refPrefix(doc.type)}-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;
    doc.meta.reference_code = referenceCode;
  }

  const total = documentTotal(doc);

  const row: Record<string, unknown> = {
    type: doc.type,
    client_id: parsed.data.clientId ?? null,
    sale_id: parsed.data.saleId ?? null,
    project_id: parsed.data.projectId ?? null,
    title: doc.meta.title,
    reference_code: referenceCode,
    data: doc,
    gated: parsed.data.gated,
    gate_mode: parsed.data.gated ? "manual" : "off",
    status: "draft",
    source: "import",
    original_filename: parsed.data.originalFilename ?? null,
    created_by: user.id,
  };

  let { data: created, error } = await supabase.from("generated_documents").insert(row).select().single();

  // original_filename needs migration 034. Never lose an import over one
  // metadata column.
  if (error && /column|schema cache/i.test(error.message)) {
    delete row.original_filename;
    ({ data: created, error } = await supabase.from("generated_documents").insert(row).select().single());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created",
    entity_type: "generated_document",
    entity_id: created.id,
    entity_label: `${doc.meta.title} (${referenceCode})`,
    notes:
      `Imported ${doc.type} with ${doc.sections.length} sections` +
      (total ? `, total KES ${fmtMoney(total)}` : "") +
      (needsFigureLock(doc) ? " (figures need confirming before an agreement)" : ""),
  });

  return NextResponse.json(
    {
      data: created,
      summary: {
        sections: doc.sections.length,
        visible_sections: doc.sections.filter((s) => !s.hidden).length,
        gated_sections: doc.sections.filter((s) => s.gated).map((s) => s.title),
        indicative_sections: doc.sections.filter((s) => s.indicative).map((s) => s.title),
        total: total ? fmtMoney(total) : null,
        needs_figure_lock: needsFigureLock(doc),
      },
    },
    { status: 201 }
  );
}
