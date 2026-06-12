import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { generateReceiptPdf } from "@/lib/receipt-pdf-helper";

const SAMPLE_RECEIPT = {
  receipt_reference: "RCP-00017",
  amount: 85000,
  method: "mpesa_send_money",
  reference: "QJK3P7XR2F",
  date: new Date().toISOString(),
  invoice_number: "INV-00042",
  invoice_total: 85000,
  balance: 0,
  client: {
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

  const buffer = await generateReceiptPdf(SAMPLE_RECEIPT);
  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="receipt-preview.pdf"',
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
