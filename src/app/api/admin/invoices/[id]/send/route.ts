import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, clients(id, name, email), projects(id, name)")
    .eq("id", id)
    .single();

  if (error || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!invoice.clients?.email) return NextResponse.json({ error: "Client has no email address" }, { status: 422 });

  const client = invoice.clients as { name: string; email: string };
  const itemsHtml = (invoice.items as Array<{ description: string; qty: number; unit_price: number; total: number }>)
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">KES ${Number(item.unit_price).toLocaleString()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">KES ${Number(item.total).toLocaleString()}</td>
    </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#152238;padding:32px;text-align:center;">
        <h1 style="color:#f9a825;font-size:24px;margin:0;font-family:Georgia,serif;">Brightex Solutions</h1>
        <p style="color:#94a3b8;margin:8px 0 0;">Invoice ${invoice.invoice_number}</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#1e293b;">Dear <strong>${client.name}</strong>,</p>
        <p style="color:#64748b;">Please find your invoice details below.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;">Description</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#64748b;">Qty</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#64748b;">Unit Price</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#64748b;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="border-top:2px solid #152238;padding-top:16px;text-align:right;">
          ${invoice.tax > 0 ? `<p style="color:#64748b;margin:4px 0;">Subtotal: KES ${Number(invoice.subtotal).toLocaleString()}</p>
          <p style="color:#64748b;margin:4px 0;">Tax (${invoice.tax}%): KES ${(Number(invoice.subtotal) * invoice.tax / 100).toLocaleString()}</p>` : ""}
          <p style="color:#152238;font-size:18px;font-weight:bold;margin:8px 0;">Total: KES ${Number(invoice.total).toLocaleString()}</p>
          ${invoice.due_date ? `<p style="color:#e09000;margin:4px 0;">Due Date: ${new Date(invoice.due_date).toLocaleDateString("en-KE")}</p>` : ""}
        </div>
        ${invoice.notes ? `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:4px;"><p style="color:#64748b;margin:0;font-size:14px;">${invoice.notes}</p></div>` : ""}
        <div style="margin-top:32px;padding:16px;background:#fff8e1;border-radius:4px;">
          <p style="color:#152238;font-weight:bold;margin:0 0 8px;">Payment Details</p>
          <p style="color:#64748b;margin:0;font-size:14px;">M-Pesa: +254 741 980 127 (Godwin B.)<br/>Bank details available on request.</p>
        </div>
        <p style="color:#64748b;margin-top:24px;">For any questions, reply to this email or WhatsApp us at +254 741 980 127.</p>
        <p style="color:#64748b;">— Brightex Solutions</p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">Brightex Solutions · Nairobi, Kenya · info.brightexsolutions@gmail.com</p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: `"Brightex Solutions" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: `Invoice ${invoice.invoice_number} from Brightex Solutions`,
      html,
    });
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Mark as sent and log communication
  await supabase.from("invoices").update({ status: "sent" }).eq("id", id);
  await supabase.from("communications").insert({
    client_id: invoice.client_id,
    type: "email",
    subject: `Invoice ${invoice.invoice_number} sent`,
    direction: "out",
    status: "sent",
  });

  return NextResponse.json({ success: true });
}
