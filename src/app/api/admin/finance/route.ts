import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const ExpenseSchema = z.object({
  description: z.string().min(1).max(300).trim(),
  category: z.enum([
    "subcontractor", "subscription", "software", "equipment",
    "transport", "marketing", "office", "tax", "professional_fees", "other",
  ]),
  amount: z.number().min(0),
  currency: z.string().max(3).default("KES"),
  date: z.string().date(),
  vendor: z.string().max(200).trim().optional(),
  reference: z.string().max(200).trim().optional(),
  tax_deductible: z.boolean().default(true),
  notes: z.string().max(1000).trim().optional(),
});

const IncomeSchema = z.object({
  source: z.enum(["invoice_payment", "retainer", "other"]),
  description: z.string().max(300).trim().optional(),
  client_id: z.string().uuid().optional(),
  amount: z.number().min(0),
  currency: z.string().max(3).default("KES"),
  date: z.string().date(),
  category: z.enum(["service_revenue", "retainer", "consulting", "other"]).default("service_revenue"),
  notes: z.string().max(1000).trim().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "summary";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (type === "income") {
    let q = supabase.from("income_records").select("*, clients(id, name)").order("date", { ascending: false });
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (type === "expenses") {
    let q = supabase.from("expenses").select("*").order("date", { ascending: false });
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // Summary: aggregate income and expenses
  const [incomeRes, expenseRes] = await Promise.all([
    supabase.from("income_records").select("amount, date"),
    supabase.from("expenses").select("amount, date, tax_deductible"),
  ]);

  const totalIncome = (incomeRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = (expenseRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

  return NextResponse.json({
    data: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_profit: totalIncome - totalExpenses,
    },
  });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "expense";

  const body = await request.json().catch(() => ({}));

  if (type === "income") {
    const result = IncomeSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

    const { data, error } = await supabase.from("income_records").insert({ ...result.data, added_by: user.id }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  }

  const result = ExpenseSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from("expenses").insert({ ...result.data, added_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
