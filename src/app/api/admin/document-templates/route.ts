/**
 * GET  /api/admin/document-templates          list
 * POST /api/admin/document-templates          save a document as a template
 *
 * A template stores STRUCTURE, never a previous client's prose.
 *
 * That distinction is the whole point. Every proposal so far has been started
 * by copying the last one, which means one client's wording travels into
 * another's document and someone has to notice. Stripping the prose on save
 * makes that impossible: what is reused is the shape, which is a house
 * standard, and what is written fresh is the content, which never is.
 *
 * Numbers are stripped for the same reason and a stronger one: a template
 * carrying a real fee would eventually put one client's price in front of
 * another.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { isBlockDocument } from "@/lib/document-html/blocks";
import { stripToSkeleton } from "@/lib/document-html/templates";
import type { BlockDocument } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

/** Names the offending field. A bare "Invalid input" sends whoever hits it
 * reading source to work out which one was wrong. */
function invalid(error: z.ZodError): NextResponse {
  const problems = error.issues.map((i) => `${i.path.join(".") || "request"}: ${i.message}`);
  return NextResponse.json({ error: problems.join("; "), problems }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const type = request.nextUrl.searchParams.get("type");
  const supabase = createAdminClient();

  let query = supabase
    .from("document_templates")
    .select("id, name, description, type, service_types, is_default, is_seeded, created_at, blocks")
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("name");
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Section titles are useful in a picker ("what will I get?"); the full
  // skeleton is not, and is dropped from the list response.
  const templates = (data ?? []).map((t) => {
    const blocks = t.blocks as BlockDocument | null;
    return {
      ...t,
      blocks: undefined,
      sections: blocks?.sections?.map((s) => s.title) ?? [],
      section_count: blocks?.sections?.length ?? 0,
    };
  });

  return NextResponse.json({ data: templates });
}

const SaveSchema = z.object({
  documentId: z.string().uuid(),
  name: z.string().min(2).max(120).trim(),
  description: z.string().max(400).trim().optional(),
  serviceTypes: z.array(z.string().max(40)).max(8).optional().default([]),
  isDefault: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const parsed = SaveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("generated_documents").select("id, type, title, data")
    .eq("id", parsed.data.documentId).maybeSingle();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!isBlockDocument(doc.data)) {
    return NextResponse.json({ error: "Only section-based documents can become templates." }, { status: 409 });
  }

  const skeleton = stripToSkeleton(doc.data as BlockDocument);

  // Only one default per type. Cleared here rather than relying on the unique
  // index to reject the write, so setting a new default just works.
  if (parsed.data.isDefault) {
    await supabase.from("document_templates")
      .update({ is_default: false }).eq("type", doc.type).is("deleted_at", null);
  }

  const { data: created, error } = await supabase
    .from("document_templates")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      type: doc.type,
      service_types: parsed.data.serviceTypes,
      blocks: skeleton,
      is_default: parsed.data.isDefault,
      is_seeded: false,
      created_by: user.id,
    })
    .select("id, name, type, is_default")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created",
    entity_type: "document_template",
    entity_id: created.id,
    entity_label: created.name,
    notes: `Saved from "${doc.title}", ${skeleton.sections.length} sections, prose and figures stripped.`,
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
