import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { forbidTeamMember } from "@/lib/role-guard";

const UpdateInvoiceSchema = z.object({
  client_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(200).trim(),
    qty: z.number().min(0),
    unit_price: z.number().min(0),
    total: z.number().min(0),
  })).optional(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
  payment_method: z.enum(["all", "mpesa_send_money", "mpesa_till", "paypal", "bank", "cash"]).optional(),
  due_date: z.string().date().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("invoices")
    .select("*, clients(id, name, company, email, phone), projects(id, name), payments(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const blocked = forbidTeamMember(user); if (blocked) return blocked;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = UpdateInvoiceSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data: before } = await supabase.from("invoices").select("*").eq("id", id).single();
  const { data, error } = await supabase.from("invoices").update(result.data).eq("id", id).select().single();
  if (error) {
    console.error("[invoices PATCH]", id, error.message);
    await logAction({ actor_id: user.id, actor_name: user.email ?? user.id, action: "update_failed", entity_type: "invoice", entity_id: id, notes: error.message });
    return NextResponse.json({ error: "Failed to save. Changes not applied." }, { status: 500 });
  }

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
    entity_type: "invoice",
    entity_id: id,
    entity_label: data.invoice_number ?? id,
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
  const blocked = forbidTeamMember(user); if (blocked) return blocked;

  const { id } = await params;
  const { data: invoice } = await supabase.from("invoices").select("invoice_number").eq("id", id).single();
  const { error } = await supabase.from("invoices").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    console.error("[invoices DELETE]", id, error.message);
    return NextResponse.json({ error: "Failed to delete invoice." }, { status: 500 });
  }

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "deleted",
    entity_type: "invoice",
    entity_id: id,
    entity_label: invoice?.invoice_number ?? id,
  });

  return NextResponse.json({ success: true });
}
