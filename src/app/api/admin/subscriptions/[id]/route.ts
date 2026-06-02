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
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  return NextResponse.json({ ok: true });
}
