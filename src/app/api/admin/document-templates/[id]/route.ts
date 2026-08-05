/**
 * POST   /api/admin/document-templates/[id]/use   create a document from it
 * PATCH  /api/admin/document-templates/[id]       rename, redescribe, set default
 * DELETE /api/admin/document-templates/[id]       soft delete
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { documentFromTemplate } from "@/lib/document-html/templates";
import { parseBlockDocument } from "@/lib/document-html/block-schema";
import type { BlockDocument } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UseSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(2).max(200).trim(),
  coverTitle: z.string().max(240).trim().optional(),
});

function refPrefix(type: string): string {
  return type === "proposal" ? "PROP" : type === "agreement" ? "AGR" : type === "techdoc" ? "TECH" : "SOP";
}

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const parsed = UseSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: template } = await supabase
    .from("document_templates").select("id, name, type, blocks")
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const { data: client } = await supabase
    .from("clients").select("id, name, company, email, phone")
    .eq("id", parsed.data.clientId).is("deleted_at", null).maybeSingle();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("generated_documents").select("id", { count: "exact", head: true })
    .eq("type", template.type).gte("created_at", `${year}-01-01`);
  const referenceCode = `${refPrefix(template.type)}-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const doc = documentFromTemplate(template.blocks as BlockDocument, {
    referenceCode,
    title: parsed.data.title,
    coverTitle: parsed.data.coverTitle,
    client: { name: client.name, company: client.company, email: client.email, phone: client.phone },
  });

  const validated = parseBlockDocument(doc);
  if (!validated.ok || !validated.doc) {
    return NextResponse.json(
      { error: "This template no longer produces a valid document.", problems: validated.errors },
      { status: 422 }
    );
  }

  const { data: created, error } = await supabase
    .from("generated_documents")
    .insert({
      type: template.type,
      client_id: client.id,
      title: parsed.data.title,
      reference_code: referenceCode,
      data: validated.doc,
      gated: false,
      gate_mode: "off",
      status: "draft",
      source: "template",
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
    entity_label: `${parsed.data.title} (${referenceCode})`,
    notes: `From template "${template.name}". Placeholder content: needs writing before it is sent.`,
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

const PatchSchema = z.object({
  name: z.string().min(2).max(120).trim().optional(),
  description: z.string().max(400).trim().optional(),
  serviceTypes: z.array(z.string().max(40)).max(8).optional(),
  isDefault: z.boolean().optional(),
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
  const { data: template } = await supabase
    .from("document_templates").select("id, name, type").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  if (parsed.data.isDefault) {
    await supabase.from("document_templates")
      .update({ is_default: false }).eq("type", template.type).is("deleted_at", null);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.serviceTypes !== undefined) updates.service_types = parsed.data.serviceTypes;
  if (parsed.data.isDefault !== undefined) updates.is_default = parsed.data.isDefault;

  const { data, error } = await supabase
    .from("document_templates").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id, actor_name: user.email ?? user.id,
    action: "updated", entity_type: "document_template", entity_id: id, entity_label: data.name,
  });

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: template } = await supabase
    .from("document_templates").select("id, name, is_seeded").eq("id", id).maybeSingle();
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  // Seeded templates come back on the next deploy, so deleting one is a
  // temporary act that looks permanent. Say so rather than surprising anyone.
  if (template.is_seeded) {
    return NextResponse.json(
      { error: "This is a built-in template and would return on the next deploy. Edit it instead, or make your own." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("document_templates").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id, actor_name: user.email ?? user.id,
    action: "deleted", entity_type: "document_template", entity_id: id, entity_label: template.name,
  });

  return NextResponse.json({ ok: true });
}
