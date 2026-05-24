import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

const PaymentSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  amount: z.number().min(0),
  method: z.enum(["mpesa", "bank", "paypal", "cash"]),
  reference: z.string().max(200).trim().optional(),
  date: z.string().date().optional(),
  notes: z.string().max(1000).trim().optional(),
  send_receipt: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await supabase
    .from("payments")
    .select("*, invoices(id, invoice_number, total, client_id, clients(name, email))")
    .order("created_at", { ascending: false });

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
  const result = PaymentSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { send_receipt, ...paymentData } = result.data;

  const { data: payment, error } = await supabase
    .from("payments")
    .insert(paymentData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if invoice is fully paid and update status
  if (paymentData.invoice_id) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("total, payments(amount)")
      .eq("id", paymentData.invoice_id)
      .single();

    if (invoice) {
      const totalPaid = (invoice.payments as Array<{ amount: number }>)
        .reduce((sum, p) => sum + Number(p.amount), 0) + Number(paymentData.amount);

      if (totalPaid >= Number(invoice.total)) {
        await supabase.from("invoices").update({ status: "paid" }).eq("id", paymentData.invoice_id);
      }
    }

    // Send receipt if requested
    if (send_receipt) {
      const { data: fullInvoice } = await supabase
        .from("invoices")
        .select("invoice_number, total, client_id, clients(name, email)")
        .eq("id", paymentData.invoice_id)
        .single();

      const client = fullInvoice?.clients as { name: string; email: string } | undefined;
      if (client?.email) {
        const html = `
          <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:600px;margin:0 auto;background:#fff;">
            <div style="background:#152238;padding:32px;text-align:center;">
              <h1 style="color:#f9a825;font-size:24px;margin:0;font-family:Georgia,serif;">Brightex Solutions</h1>
              <p style="color:#94a3b8;margin:8px 0 0;">Payment Received</p>
            </div>
            <div style="padding:32px;">
              <p>Dear <strong>${client.name}</strong>,</p>
              <div style="padding:16px;background:#d1fae5;border-left:4px solid #10b981;margin:16px 0;">
                <p style="color:#065f46;margin:0;font-weight:bold;">Payment of KES ${Number(paymentData.amount).toLocaleString()} received</p>
              </div>
              <p style="color:#64748b;">Invoice: <strong>${fullInvoice?.invoice_number}</strong></p>
              <p style="color:#64748b;">Method: <strong>${paymentData.method.toUpperCase()}</strong></p>
              ${paymentData.reference ? `<p style="color:#64748b;">Reference: <strong>${paymentData.reference}</strong></p>` : ""}
              <p style="color:#64748b;">Date: <strong>${paymentData.date ?? new Date().toLocaleDateString("en-KE")}</strong></p>
              <p style="color:#64748b;margin-top:24px;">Thank you for your payment. — Brightex Solutions</p>
            </div>
          </div>`;

        await transporter.sendMail({
          from: `"Brightex Solutions" <${process.env.SMTP_USER}>`,
          to: client.email,
          subject: `Payment Confirmation — ${fullInvoice?.invoice_number}`,
          html,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ data: payment }, { status: 201 });
}
