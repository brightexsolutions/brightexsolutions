import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement, JSXElementConstructor } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { ReceiptPDFDocument, type ReceiptData } from "@/components/admin/receipt-pdf";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .select("*, invoices(invoice_number, total, clients(name, company, email, phone), payments(amount))")
    .eq("id", id)
    .maybeSingle();

  if (error || !payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const invoice = payment.invoices as { invoice_number: string; total: number; clients: ReceiptData["client"]; payments: { amount: number }[] } | null;
  const paidToDate = invoice?.payments?.reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0) ?? Number(payment.amount);
  const balance = invoice ? Math.max(0, Number(invoice.total) - paidToDate) : 0;

  const data: ReceiptData = {
    receipt_reference: `RCPT-${payment.id.slice(0, 8).toUpperCase()}`,
    amount: Number(payment.amount),
    method: payment.method,
    reference: payment.reference,
    date: payment.date,
    invoice_number: invoice?.invoice_number ?? null,
    invoice_total: invoice?.total ?? null,
    balance,
    client: invoice?.clients ?? null,
  };

  const element = createElement(ReceiptPDFDocument, { data }) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;
  const buffer = await renderToBuffer(element);
  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.receipt_reference}.pdf"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
