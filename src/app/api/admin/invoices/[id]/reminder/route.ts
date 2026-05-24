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
    .select("*, clients(name, email)")
    .eq("id", id)
    .single();

  if (error || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!invoice.clients?.email) return NextResponse.json({ error: "Client has no email" }, { status: 422 });

  const client = invoice.clients as { name: string; email: string };
  const daysOverdue = invoice.due_date
    ? Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000)
    : 0;

  const html = `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#152238;padding:32px;text-align:center;">
        <h1 style="color:#f9a825;font-size:24px;margin:0;font-family:Georgia,serif;">Brightex Solutions</h1>
        <p style="color:#94a3b8;margin:8px 0 0;">Payment Reminder</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#1e293b;">Dear <strong>${client.name}</strong>,</p>
        <div style="padding:16px;background:#fff3cd;border-left:4px solid #f9a825;margin:16px 0;">
          <p style="color:#856404;margin:0;font-weight:bold;">Invoice ${invoice.invoice_number} is ${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue` : "due"}</p>
        </div>
        <p style="color:#64748b;">Amount due: <strong style="color:#152238;">KES ${Number(invoice.total).toLocaleString()}</strong></p>
        ${invoice.due_date ? `<p style="color:#64748b;">Due date: <strong>${new Date(invoice.due_date).toLocaleDateString("en-KE")}</strong></p>` : ""}
        <div style="margin-top:24px;padding:16px;background:#fff8e1;border-radius:4px;">
          <p style="color:#152238;font-weight:bold;margin:0 0 8px;">Payment Details</p>
          <p style="color:#64748b;margin:0;font-size:14px;">M-Pesa: +254 741 980 127 (Godwin B.)<br/>Bank details available on request.</p>
        </div>
        <p style="color:#64748b;margin-top:24px;">Please process payment at your earliest convenience. Reply to this email or WhatsApp us at +254 741 980 127 if you have any questions.</p>
        <p style="color:#64748b;">— Brightex Solutions</p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: `"Brightex Solutions" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: `Payment Reminder: Invoice ${invoice.invoice_number}`,
      html,
    });
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  await supabase.from("communications").insert({
    client_id: invoice.client_id,
    type: "email",
    subject: `Payment reminder sent for invoice ${invoice.invoice_number}`,
    direction: "out",
    status: "sent",
  });

  return NextResponse.json({ success: true });
}
