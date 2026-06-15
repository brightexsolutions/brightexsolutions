import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  provider: z.string().max(100).trim().optional(),
  category: z.enum(["domain", "hosting", "tool", "software", "other"]).optional(),
  ownership: z.enum(["internal", "on_behalf", "client_managed"]).optional(),
  client_id: z.string().uuid().optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().max(3).optional(),
  billing_cycle: z.enum(["monthly", "yearly", "one_time"]).optional(),
  next_renewal_date: z.string().date().optional(),
  last_paid_date: z.string().date().optional(),
  auto_renew: z.boolean().optional(),
  login_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(500).trim().optional(),
  active: z.boolean().optional(),
});

// POST /api/admin/subscriptions/[id]/mark-paid is handled separately below

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = UpdateSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("subscriptions")
    .update(result.data)
    .eq("id", id)
    .select("*, clients(id, name, email, phone)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync calendar event when renewal date or billing cycle changes
  if ("next_renewal_date" in result.data || "billing_cycle" in result.data || "name" in result.data) {
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("entity_type", "subscription")
      .eq("entity_id", id)
      .eq("type", "subscription_renewal")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (result.data.next_renewal_date) {
        updates.start_at = new Date(result.data.next_renewal_date).toISOString();
      }
      if (result.data.name) {
        updates.title = `${result.data.name} renewal`;
      }
      if (result.data.billing_cycle) {
        updates.repeat_rule =
          result.data.billing_cycle === "monthly" ? "monthly" :
          result.data.billing_cycle === "yearly" ? "yearly" : null;
      }
      if (Object.keys(updates).length) {
        await supabase.from("calendar_events").update(updates).eq("id", existing.id);
      }
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from("subscriptions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Remove associated calendar events
  await supabase.from("calendar_events").delete().eq("entity_type", "subscription").eq("entity_id", id);

  return NextResponse.json({ ok: true });
}
