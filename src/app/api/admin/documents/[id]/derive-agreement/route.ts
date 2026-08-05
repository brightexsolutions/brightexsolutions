/**
 * POST /api/admin/documents/[id]/derive-agreement
 *
 * Turns an accepted proposal into an agreement, deterministically. Replaces the
 * old "prepare agreement" flow, which flattened a proposal into prose and asked
 * a model to write a contract from it: the step where a number could drift, and
 * a drifted number in a contract is a dispute rather than a typo.
 *
 * Two things happen here that cannot happen anywhere else:
 *
 *   1. Figures are pinned. Where the proposal quoted ranges, the final agreed
 *      amount for each is supplied and recorded, and the derivation refuses if
 *      any range is left unresolved.
 *   2. Brightex countersigns. The agreement is signed on our side at creation,
 *      so a client never receives a contract that is blank on the other side.
 *
 * Body:
 *   figures?  [{ blockId, rowIndex, amount }]   required where ranges exist
 *   schedule? PaymentSchedule                    defaults to the client's choice
 *   specialTerms?, gated?
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { isBlockDocument, fmtMoney } from "@/lib/document-html/blocks";
import { deriveAgreement } from "@/lib/document-html/derive-agreement";
import { parseBlockDocument, PaymentScheduleSchema } from "@/lib/document-html/block-schema";
import type { PaymentSchedule } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const DeriveSchema = z.object({
  figures: z.array(z.object({
    blockId: z.string().min(1),
    rowIndex: z.number().int().min(0),
    amount: z.number().positive(),
  })).optional().default([]),
  schedule: PaymentScheduleSchema.optional(),
  specialTerms: z.string().max(4000).trim().optional(),
  gated: z.boolean().optional().default(false),
});

/** Countersignatory, from settings, with a sane fallback so a missing setting
 * never blocks an agreement: it is a name on a contract, not a secret. */
async function brightexSignatory(supabase: ReturnType<typeof createAdminClient>, documentId: string) {
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["signatory_name", "signatory_title", "signature_path"]);
  const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));

  // The image is served through the document's own signature route, which only
  // works once a signature row exists for it. The row is written below, so the
  // URL is valid by the time a client can open the document.
  return {
    name: map.signatory_name || "Godwin",
    title: map.signatory_title || "Lead at Brightex Solutions",
    imageUrl: map.signature_path ? `/api/public/documents/${documentId}/signature/brightex` : null,
    imagePath: map.signature_path || null,
  };
}

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const parsed = DeriveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: proposal, error } = await supabase
    .from("generated_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  if (proposal.type !== "proposal") {
    return NextResponse.json({ error: "Only a proposal can be turned into an agreement." }, { status: 400 });
  }
  if (!isBlockDocument(proposal.data)) {
    return NextResponse.json(
      { error: "This proposal predates section-based documents. Prepare its agreement manually." },
      { status: 409 }
    );
  }
  if (!proposal.accepted_at) {
    return NextResponse.json(
      { error: "This proposal has not been accepted yet. An agreement should follow acceptance, not precede it." },
      { status: 409 }
    );
  }

  // Refuse to create a second agreement for the same proposal: two live
  // contracts for one engagement is worse than none.
  const { data: existing } = await supabase
    .from("generated_documents")
    .select("id, reference_code")
    .eq("source_document_id", id)
    .eq("type", "agreement")
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `An agreement (${existing.reference_code}) already exists for this proposal.`, documentId: existing.id },
      { status: 409 }
    );
  }

  // The schedule the client chose is authoritative unless explicitly overridden.
  const schedule: PaymentSchedule | undefined =
    parsed.data.schedule ??
    (proposal.chosen_schedule as PaymentSchedule | null) ??
    proposal.data.schedule;
  if (!schedule) {
    return NextResponse.json({ error: "No payment schedule on this proposal, and none supplied." }, { status: 400 });
  }

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("generated_documents")
    .select("id", { count: "exact", head: true })
    .eq("type", "agreement")
    .gte("created_at", `${year}-01-01`);
  const referenceCode = `AGR-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  // The document id does not exist yet, so the signature URL is patched in
  // after the insert, below.
  const signatory = await brightexSignatory(supabase, "PENDING");

  const result = deriveAgreement(proposal.data, {
    referenceCode,
    schedule,
    locked: parsed.data.figures,
    brightexSignatory: signatory,
    specialTerms: parsed.data.specialTerms ?? null,
  });

  if (!result.ok || !result.doc) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // The derived document goes through the same validator as an imported one.
  // Deriving in code is not a reason to trust the output less carefully.
  const validated = parseBlockDocument(result.doc);
  if (!validated.ok || !validated.doc) {
    return NextResponse.json(
      { error: "The derived agreement failed validation.", problems: validated.errors },
      { status: 500 }
    );
  }

  const { data: created, error: insertError } = await supabase
    .from("generated_documents")
    .insert({
      type: "agreement",
      client_id: proposal.client_id,
      sale_id: proposal.sale_id,
      project_id: proposal.project_id,
      title: validated.doc.meta.title,
      reference_code: referenceCode,
      data: validated.doc,
      gated: parsed.data.gated,
      status: "draft",
      source: "derived",
      source_document_id: proposal.id,
      chosen_schedule: schedule,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Record the pinned figures on the PROPOSAL, so the document the client
  // accepted carries the note of what was finally agreed against it.
  if (parsed.data.figures.length > 0) {
    await supabase
      .from("generated_documents")
      .update({
        locked_figures: parsed.data.figures,
        figures_locked_at: new Date().toISOString(),
        figures_locked_by: user.id,
      })
      .eq("id", id);
  }

  // Countersignature, stamped now rather than when the client signs, with the
  // stored signature image attached where one is on file.
  const { error: sigError } = await supabase.from("document_signatures").insert({
    document_id: created.id,
    party: "brightex",
    signer_name: signatory.name,
    signer_title: signatory.title,
    method: signatory.imagePath ? "drawn" : "typed",
    image_path: signatory.imagePath,
    signed_at: new Date().toISOString(),
  });

  // Now the id exists, point the in-document signature at it.
  if (signatory.imagePath) {
    const withUrl = JSON.parse(
      JSON.stringify(validated.doc).replaceAll(
        "/api/public/documents/PENDING/signature/brightex",
        `/api/public/documents/${created.id}/signature/brightex`
      )
    );
    await supabase.from("generated_documents").update({ data: withUrl }).eq("id", created.id);
  }
  // Needs migration 039. An agreement without its countersignature row is
  // still a valid agreement, so this never blocks creation.
  if (sigError && !/relation|column|schema cache/i.test(sigError.message)) {
    console.error("[derive-agreement] countersignature:", sigError.message);
  }

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created",
    entity_type: "generated_document",
    entity_id: created.id,
    entity_label: `${validated.doc.meta.title} (${referenceCode})`,
    notes:
      `Derived from ${proposal.reference_code}. Total KES ${result.total ? fmtMoney(result.total) : "?"}. ` +
      `Schedule ${schedule.stages.map((s) => `${s.percent}%`).join("/")}.` +
      (parsed.data.figures.length ? ` ${parsed.data.figures.length} figure(s) pinned.` : ""),
  });

  return NextResponse.json(
    {
      data: created,
      summary: {
        reference_code: referenceCode,
        total: result.total ? fmtMoney(result.total) : null,
        schedule: schedule.stages.map((s) => ({ label: s.label, percent: s.percent, trigger: s.trigger })),
        countersigned_by: signatory.name,
        sections: validated.doc.sections.length,
      },
    },
    { status: 201 }
  );
}
