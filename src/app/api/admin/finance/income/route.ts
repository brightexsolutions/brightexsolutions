import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const IncomeSchema = z.object({
  source: z.enum(["invoice_payment", "retainer", "other"]).default("other"),
  description: z.string().max(300).trim().optional(),
  client_id: z.string().uuid().optional(),
  gross_amount: z.coerce.number().min(0).optional(),    // gross before WHT
  amount: z.coerce.number().min(0),                     // net received (after WHT)
  withholding_type: z.string().max(50).default("none"),
  withholding_tax: z.coerce.number().min(0).default(0),
  withholding_rate: z.coerce.number().min(0).max(100).default(0),
  currency: z.string().max(3).default("KES"),
  date: z.string().date(),
  category: z.enum(["service_revenue", "retainer", "consulting", "other"]).default("service_revenue"),
  tax_applicable: z.boolean().default(true),
  notes: z.string().max(1000).trim().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let q = supabase.from("income_records").select("*, clients(id, name)").is("deleted_at", null).order("date", { ascending: false });
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = IncomeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("income_records")
    .insert({ ...result.data, added_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
