import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement, JSXElementConstructor } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { InvoicePDFDocument, type InvoicePaymentSettings } from "@/components/admin/invoice-pdf";

const PAYMENT_SETTING_KEYS: (keyof InvoicePaymentSettings)[] = [
  "invoice_mpesa_number", "invoice_mpesa_name",
  "invoice_till_number", "invoice_till_name",
  "invoice_paypal_email",
  "invoice_bank_name", "invoice_bank_account_name",
  "invoice_bank_account_number", "invoice_bank_branch",
  "invoice_footer_note",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: invoice, error }, { data: settingsRows }, { data: payments }] = await Promise.all([
    supabase.from("invoices").select("*, clients(id, name, company, email, phone)").eq("id", id).single(),
    supabase.from("settings").select("key, value").in("key", PAYMENT_SETTING_KEYS as string[]),
    supabase.from("payments").select("amount").eq("invoice_id", id).is("deleted_at", null),
  ]);

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const paidAmount = (payments ?? []).reduce((s, p: { amount: number }) => s + Number(p.amount), 0);

  const paymentSettings: InvoicePaymentSettings = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  ) as InvoicePaymentSettings;

  const element = createElement(InvoicePDFDocument, {
    invoice: { ...invoice, paid_amount: paidAmount },
    paymentSettings,
  }) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;
  const buffer = await renderToBuffer(element);

  const dateStr = new Date(invoice.created_at).toISOString().slice(0, 10);
  const filename = `invoice-${invoice.invoice_number ?? dateStr}.pdf`;
  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
