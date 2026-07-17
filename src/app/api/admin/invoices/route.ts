import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { INVOICE_PREFIX } from "@/lib/constants";
import { forbidTeamMember } from "@/lib/role-guard";

const LineItemSchema = z.object({
  description: z.string().min(1).max(200).trim(),
  qty: z.coerce.number().min(0),
  unit_price: z.coerce.number().min(0),
  total: z.coerce.number().min(0).optional(),
});

const InvoiceSchema = z.object({
  client_id: z.string().uuid().optional(),
  client_name: z.string().max(200).trim().optional(),
  client_company: z.string().max(200).trim().optional(),
  client_email: z.string().email().max(200).trim().optional(),
  client_phone: z.string().max(30).trim().optional(),
  project_id: z.string().uuid().optional(),
  items: z.array(LineItemSchema).min(1),
  subtotal: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  payment_method: z.enum(["all", "mpesa_send_money", "mpesa_till", "paypal", "bank", "cash"]).default("all"),
  due_date: z.string().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const client_id = searchParams.get("client_id");

  let query = supabase
    .from("invoices")
    .select("*, clients(id, name, company, email), projects(id, name), payments(amount, date)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (client_id) query = query.eq("client_id", client_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Merge per-invoice send stats from communications table
  const invoiceIds = (data ?? []).map((inv) => inv.id);
  const commStats: Record<string, { send_count: number; last_comm_at: string }> = {};
  if (invoiceIds.length > 0) {
    const { data: comms } = await supabase
      .from("communications")
      .select("invoice_id, sent_at")
      .in("invoice_id", invoiceIds)
      .order("sent_at", { ascending: false });
    for (const c of (comms ?? [])) {
      const cRow = c as { invoice_id: string; sent_at: string };
      if (!commStats[cRow.invoice_id]) {
        commStats[cRow.invoice_id] = { send_count: 0, last_comm_at: cRow.sent_at };
      }
      commStats[cRow.invoice_id].send_count += 1;
    }
  }

  // Attach any proposal/agreement generated for the same client — preferring
  // one tied to the same project when this invoice has one — so the invoice
  // list can show and act on ("View" / "Resend") the document it grew out of.
  const clientIds = [...new Set((data ?? []).map((inv) => inv.client_id).filter(Boolean))];
  let docsByClient: Record<string, Array<Record<string, unknown>>> = {};
  if (clientIds.length > 0) {
    const { data: docs } = await supabase
      .from("generated_documents")
      .select("id, type, title, reference_code, status, gated, accepted_at, created_at, project_id, client_id")
      .in("client_id", clientIds)
      .in("type", ["proposal", "agreement"])
      .order("accepted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    docsByClient = (docs ?? []).reduce<Record<string, Array<Record<string, unknown>>>>((acc, d) => {
      const key = d.client_id as string;
      (acc[key] ??= []).push(d);
      return acc;
    }, {});
  }

  const enriched = (data ?? []).map((inv) => {
    const candidates = docsByClient[inv.client_id as string] ?? [];
    const generated_documents = [...candidates]
      .sort((a, b) => {
        const aProj = inv.project_id && a.project_id === inv.project_id ? 1 : 0;
        const bProj = inv.project_id && b.project_id === inv.project_id ? 1 : 0;
        return bProj - aProj;
      })
      .slice(0, 3);
    return {
      ...inv,
      send_count: commStats[inv.id]?.send_count ?? 0,
      last_comm_at: commStats[inv.id]?.last_comm_at ?? null,
      generated_documents,
    };
  });

  return NextResponse.json({ data: enriched });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const blocked = forbidTeamMember(user); if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const result = InvoiceSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { client_name, client_company, client_email, client_phone, ...invoiceData } = result.data;

  // Resolve client_id: look up by email, or create a new client record
  let client_id = invoiceData.client_id;
  if (!client_id && (client_name || client_company)) {
    if (client_email) {
      const { data: existing } = await supabase.from("clients").select("id").eq("email", client_email).maybeSingle();
      if (existing) {
        client_id = existing.id;
      }
    }
    if (!client_id) {
      const { data: newClient } = await supabase
        .from("clients")
        .insert({
          name: client_name ?? client_company ?? "Unknown",
          company: client_company ?? null,
          email: client_email ?? null,
          phone: client_phone ?? null,
          classification: "active",
        })
        .select("id").single();
      if (newClient) client_id = newClient.id;
    }
  }

  // Ensure line item totals
  const items = invoiceData.items.map((it) => ({
    ...it,
    total: it.total ?? it.qty * it.unit_price,
  }));

  // Auto-generate invoice number — {PREFIX}-{YEAR}-{SEQUENCE}, sequence resets each year
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .gte("created_at", yearStart);
  const invoiceNumber = `${INVOICE_PREFIX}-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...invoiceData, items, client_id: client_id ?? null, invoice_number: invoiceNumber })
    .select("*, clients(id, name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
