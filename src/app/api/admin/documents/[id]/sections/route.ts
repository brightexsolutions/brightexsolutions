/**
 * PATCH /api/admin/documents/[id]/sections
 *
 * The editor's save. Handles the four things a section can have done to it:
 * reordered, hidden, gated, or its content changed.
 *
 * Every write goes through the full document validator rather than trusting the
 * client that sent it, because the editor is a browser and a browser is not a
 * source of truth. A save that would leave the document unrenderable is
 * rejected whole: half-applied edits are worse than a refused one.
 *
 * Refuses to touch a document a client has already accepted. At that point it
 * is a record of what was agreed, not a draft, and editing it after the fact is
 * the one thing that would make every signature on the system worthless.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { isBlockDocument } from "@/lib/document-html/blocks";
import { parseBlockDocument, normaliseCopy } from "@/lib/document-html/block-schema";
import type { BlockDocument, DocSection } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
  /** Full section ids in their new order. Must be a permutation of the current
   * ids: a reorder cannot add or remove sections. */
  order: z.array(z.string()).optional(),
  /** Per-section flags, applied by id. */
  flags: z.record(z.string(), z.object({
    hidden: z.boolean().optional(),
    gated: z.boolean().optional(),
    indicative: z.boolean().optional(),
  })).optional(),
  /** A replaced section, whole. */
  section: z.unknown().optional(),
  /** Remove a section by id. */
  removeId: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("generated_documents")
    .select("id, title, data, accepted_at")
    .eq("id", id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!isBlockDocument(doc.data)) {
    return NextResponse.json({ error: "This document is not section based." }, { status: 409 });
  }
  if (doc.accepted_at) {
    return NextResponse.json(
      { error: "This document has been accepted and can no longer be edited." },
      { status: 409 }
    );
  }

  const document = doc.data as BlockDocument;
  let sections = [...document.sections];
  const changes: string[] = [];

  // ── Replace one section ──────────────────────────────────────────────────
  if (parsed.data.section) {
    const incoming = parsed.data.section as DocSection;
    const index = sections.findIndex((s) => s.id === incoming.id);
    if (index === -1) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    if (sections[index].locked) {
      return NextResponse.json(
        { error: `"${sections[index].title}" is fixed and cannot be edited.` },
        { status: 409 }
      );
    }
    sections[index] = normaliseCopy({ ...incoming, locked: sections[index].locked });
    changes.push(`edited "${sections[index].title}"`);
  }

  // ── Remove ───────────────────────────────────────────────────────────────
  if (parsed.data.removeId) {
    const target = sections.find((s) => s.id === parsed.data.removeId);
    if (!target) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    if (target.locked) {
      return NextResponse.json({ error: `"${target.title}" is fixed and cannot be removed.` }, { status: 409 });
    }
    sections = sections.filter((s) => s.id !== parsed.data.removeId);
    changes.push(`removed "${target.title}"`);
  }

  // ── Flags ────────────────────────────────────────────────────────────────
  if (parsed.data.flags) {
    for (const [sectionId, flags] of Object.entries(parsed.data.flags)) {
      const index = sections.findIndex((s) => s.id === sectionId);
      if (index === -1) continue;
      sections[index] = { ...sections[index], ...flags };
      const described = Object.entries(flags).map(([k, v]) => `${k}=${v}`).join(", ");
      changes.push(`${sections[index].title}: ${described}`);
    }
  }

  // ── Reorder ──────────────────────────────────────────────────────────────
  if (parsed.data.order) {
    const current = new Set(sections.map((s) => s.id));
    const incoming = new Set(parsed.data.order);
    if (current.size !== incoming.size || [...current].some((x) => !incoming.has(x))) {
      return NextResponse.json(
        { error: "The new order does not match the document's sections. Reload and try again." },
        { status: 409 }
      );
    }
    const byId = new Map(sections.map((s) => [s.id, s]));
    sections = parsed.data.order.map((sectionId) => byId.get(sectionId)!);
    changes.push("reordered sections");
  }

  const next: BlockDocument = { ...document, sections };
  const validated = parseBlockDocument(next);
  if (!validated.ok || !validated.doc) {
    return NextResponse.json(
      { error: "That change would have broken the document, so nothing was saved.", problems: validated.errors },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from("generated_documents")
    .update({ data: validated.doc, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "edited_document",
    entity_type: "generated_document",
    entity_id: id,
    entity_label: doc.title,
    notes: changes.join("; ").slice(0, 400),
  });

  return NextResponse.json({ data: validated.doc });
}
