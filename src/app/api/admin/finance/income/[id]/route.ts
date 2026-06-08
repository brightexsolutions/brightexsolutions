import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const UpdateSchema = z.object({
  source: z.enum(["invoice_payment", "retainer", "other"]).optional(),
  description: z.string().max(300).trim().optional(),
  client_id: z.string().uuid().optional(),
  gross_amount: z.coerce.number().min(0).optional(),
  amount: z.coerce.number().min(0).optional(),          // net received
  withholding_type: z.string().max(50).optional(),
  withholding_tax: z.coerce.number().min(0).optional(),
  withholding_rate: z.coerce.number().min(0).max(100).optional(),
  currency: z.string().max(3).optional(),
  date: z.string().date().optional(),
  category: z.enum(["service_revenue", "retainer", "consulting", "other"]).optional(),
  tax_applicable: z.boolean().optional(),
  notes: z.string().max(1000).trim().optional(),
});

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
    .from("income_records")
    .update(result.data)
    .eq("id", id)
    .select("*, clients(id, name)")
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
  const { error } = await supabase.from("income_records").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
