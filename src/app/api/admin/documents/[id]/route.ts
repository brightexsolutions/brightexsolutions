import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
  status: z.enum(["draft", "sent", "final"]).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  title: z.string().max(200).trim().optional(),
  gated: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("generated_documents")
    .select("*, clients(id, name, company, email)")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = PatchSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = { ...result.data, updated_at: new Date().toISOString() };
  if (result.data.status === "sent") updates.sent_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("generated_documents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: doc } = await supabase.from("generated_documents").select("reference_code, title").eq("id", id).maybeSingle();
  const { error } = await supabase.from("generated_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (doc) {
    await logAction({
      actor_id: user.id,
      actor_name: user.email ?? user.id,
      action: "deleted_document",
      entity_type: "generated_document",
      entity_label: `${doc.reference_code} — ${doc.title}`,
    });
  }

  return NextResponse.json({ success: true });
}
