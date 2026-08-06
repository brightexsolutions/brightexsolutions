/**
 * PATCH /api/admin/documents/[id]/gating
 *
 * Controls what a client sees on the public link.
 *
 *   off     the whole document
 *   manual  gated sections blurred until you decide otherwise, typically after
 *           a walkthrough call. This is the common case and stays the default.
 *   fee     gated sections blurred until an unlock invoice is paid
 *
 * Fee mode is deliberately NOT automatic. Creating the unlock invoice is done
 * here; unlocking happens when that invoice is marked paid, by a human, the
 * same way every other payment in this system is confirmed. Wiring a payment
 * webhook for a rare event would be building the hard half of a feature for
 * the easy half of a use case, and a webhook that silently fails to unlock is
 * worse than a person clicking a button.
 *
 * `gated` is kept in step with `gate_mode` rather than replaced by it: every
 * existing query, badge and renderer reads `gated`, and two sources of truth
 * would be worse than one slightly redundant one.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { isBlockDocument } from "@/lib/document-html/blocks";
import type { BlockDocument } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const GatingSchema = z.object({
  mode: z.enum(["off", "manual", "fee"]),
  /** Required for fee mode: what unlocking costs. */
  unlockFee: z.number().positive().max(10_000_000).optional(),
  /** Sections to blur. Ignored when mode is off. */
  gatedSectionIds: z.array(z.string()).max(40).optional(),
  /** Mark the unlock as paid and open the document. */
  unlock: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const parsed = GatingSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("generated_documents")
    .select("id, type, title, reference_code, data, client_id, gate_mode, unlock_invoice_id, accepted_at")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  if (doc.accepted_at && !parsed.data.unlock) {
    return NextResponse.json(
      { error: "This document has been accepted. Changing what the client can see now would change the record." },
      { status: 409 }
    );
  }

  const updates: Record<string, unknown> = {};
  const notes: string[] = [];

  // ── Which sections are gated ─────────────────────────────────────────────
  if (parsed.data.gatedSectionIds && isBlockDocument(doc.data)) {
    const document = doc.data as BlockDocument;
    const wanted = new Set(parsed.data.gatedSectionIds);
    const next: BlockDocument = {
      ...document,
      sections: document.sections.map((s) => ({ ...s, gated: wanted.has(s.id) })),
    };
    // A document with every section gated shows a client nothing but a cover
    // and a paywall, which reads as a trick rather than a teaser.
    if (next.sections.every((s) => s.gated || s.hidden)) {
      return NextResponse.json(
        { error: "At least one section must stay visible: a client needs to see what they would be paying for." },
        { status: 422 }
      );
    }
    updates.data = next;
    notes.push(`gated sections: ${parsed.data.gatedSectionIds.length}`);
  }

  // ── Unlock ───────────────────────────────────────────────────────────────
  if (parsed.data.unlock) {
    updates.unlocked_at = new Date().toISOString();
    updates.unlocked_by = user.id;
    updates.gated = false;
    updates.gate_mode = "off";
    notes.push("unlocked");

    const { data, error } = await supabase
      .from("generated_documents").update(updates).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAction({
      actor_id: user.id, actor_name: user.email ?? user.id,
      action: "unlocked_document", entity_type: "generated_document",
      entity_id: id, entity_label: `${doc.title} (${doc.reference_code})`,
      notes: "Full document released to the client.",
    });
    return NextResponse.json({ data });
  }

  // ── Mode ─────────────────────────────────────────────────────────────────
  updates.gate_mode = parsed.data.mode;
  updates.gated = parsed.data.mode !== "off";
  notes.push(`mode ${doc.gate_mode} to ${parsed.data.mode}`);

  let unlockInvoice: { id: string; invoice_number: string; total: number } | null = null;

  if (parsed.data.mode === "fee") {
    if (!parsed.data.unlockFee) {
      return NextResponse.json({ error: "Fee gating needs an unlock fee." }, { status: 400 });
    }
    if (!doc.client_id) {
      return NextResponse.json({ error: "Fee gating needs a client to invoice." }, { status: 400 });
    }
    updates.unlock_fee = parsed.data.unlockFee;

    // Reuse the existing unlock invoice rather than issuing a second one for
    // the same document.
    if (doc.unlock_invoice_id) {
      const { data: existing } = await supabase
        .from("invoices").select("id, invoice_number, total").eq("id", doc.unlock_invoice_id).maybeSingle();
      unlockInvoice = existing ?? null;
    }

    if (!unlockInvoice) {
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("invoices").select("id", { count: "exact", head: true }).gte("created_at", `${year}-01-01`);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          client_id: doc.client_id,
          document_id: id,
          invoice_number: `INV-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`,
          items: [{ description: `Scoping fee: ${doc.title}`, qty: 1, unit_price: parsed.data.unlockFee }],
          subtotal: parsed.data.unlockFee,
          tax: 0,
          total: parsed.data.unlockFee,
          status: "draft",
          due_date: dueDate.toISOString().slice(0, 10),
          notes: `Unlocks the full ${doc.reference_code}. Marking this paid releases the document.`,
        })
        .select("id, invoice_number, total")
        .single();

      if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 });
      unlockInvoice = invoice;
      updates.unlock_invoice_id = invoice.id;
      notes.push(`unlock invoice ${invoice.invoice_number}`);
    }
  }

  const { data, error } = await supabase
    .from("generated_documents").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "changed_gating",
    entity_type: "generated_document",
    entity_id: id,
    entity_label: `${doc.title} (${doc.reference_code})`,
    notes: notes.join("; "),
  });

  return NextResponse.json({ data, unlockInvoice });
}
