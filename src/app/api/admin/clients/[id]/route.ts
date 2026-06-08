import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const UpdateClientSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  email: z.string().email().max(200).trim().optional().or(z.literal("")),
  phone: z.string().max(50).trim().optional(),
  company: z.string().max(200).trim().optional(),
  classification: z.enum(["lead", "qualified", "unqualified", "ghost", "active", "past"]).optional(),
  source: z.enum(["contact_form", "referral", "social", "direct", "other"]).optional(),
  notes: z.string().max(2000).trim().optional(),
  last_contacted_at: z.string().datetime().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase.from("clients").select("*, projects(*), invoices(*), communications(*)").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = UpdateClientSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data: before } = await supabase.from("clients").select("*").eq("id", id).single();
  const { data, error } = await supabase.from("clients").update(result.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const changedFields = Object.keys(result.data) as (keyof typeof result.data)[];
  const changes = changedFields.reduce<Record<string, { from: unknown; to: unknown }>>((acc, field) => {
    const prev = before?.[field as keyof typeof before];
    const next = result.data[field];
    if (prev !== next) acc[field] = { from: prev, to: next };
    return acc;
  }, {});

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "updated",
    entity_type: "client",
    entity_id: id,
    entity_label: data.name,
    changes: Object.keys(changes).length ? changes : undefined,
  });

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { data: client } = await supabase.from("clients").select("name").eq("id", id).single();
  const { error } = await supabase.from("clients").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "deleted",
    entity_type: "client",
    entity_id: id,
    entity_label: client?.name ?? id,
  });

  return NextResponse.json({ success: true });
}
