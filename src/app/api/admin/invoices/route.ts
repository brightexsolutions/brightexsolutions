import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const LineItemSchema = z.object({
  description: z.string().min(1).max(200).trim(),
  qty: z.number().min(0),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

const InvoiceSchema = z.object({
  client_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  items: z.array(LineItemSchema).min(1),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  due_date: z.string().date().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const client_id = searchParams.get("client_id");

  let query = supabase
    .from("invoices")
    .select("*, clients(id, name, company, email), projects(id, name)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (client_id) query = query.eq("client_id", client_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = InvoiceSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  // Auto-generate invoice number
  const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true });
  const invoiceNumber = `BX-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...result.data, invoice_number: invoiceNumber })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
