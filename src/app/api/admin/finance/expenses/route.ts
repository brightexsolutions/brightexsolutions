import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const ExpenseSchema = z.object({
  description: z.string().min(1).max(300).trim(),
  category: z.enum([
    "subcontractor", "subscription", "software", "equipment",
    "transport", "marketing", "office", "tax", "professional_fees", "other",
  ]),
  amount: z.coerce.number().min(0),
  currency: z.string().max(3).default("KES"),
  date: z.string().date(),
  vendor: z.string().max(200).trim().optional(),
  reference: z.string().max(200).trim().optional(),
  tax_deductible: z.boolean().default(true),
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
  const category = searchParams.get("category");

  let q = supabase.from("expenses").select("*").is("deleted_at", null).order("date", { ascending: false });
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  if (category && category !== "all") q = q.eq("category", category);

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
  const result = ExpenseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...result.data, added_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
