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

const SAMPLE_INVOICE = {
  invoice_number: "INV-00042",
  created_at: "2026-06-12T09:00:00Z",
  due_date: "2026-06-30",
  total: 85000,
  subtotal: 85000,
  tax: 0,
  payment_method: "all",
  notes: null,
  items: [
    { description: "Website Design & Development", qty: 1, unit_price: 70000 },
    { description: "SEO Setup & Configuration", qty: 1, unit_price: 15000 },
  ],
  clients: {
    name: "Jane Njoroge",
    company: "Njoroge Enterprises Ltd",
    email: "jane@example.com",
    phone: "+254 712 345 678",
  },
};

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", PAYMENT_SETTING_KEYS as string[]);

  const paymentSettings: InvoicePaymentSettings = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  ) as InvoicePaymentSettings;

  const element = createElement(
    InvoicePDFDocument,
    { invoice: SAMPLE_INVOICE, paymentSettings }
  ) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;

  const buffer = await renderToBuffer(element);
  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="invoice-preview.pdf"',
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
