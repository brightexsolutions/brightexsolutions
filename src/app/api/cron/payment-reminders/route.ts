import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Find all overdue sent invoices with a client email
  const { data: overdueInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, due_date, client_id, clients(name, email)")
    .eq("status", "sent")
    .lt("due_date", today);

  if (!overdueInvoices?.length) {
    return NextResponse.json({ status: "ok", reminders_sent: 0 });
  }

  let sent = 0;
  for (const invoice of overdueInvoices) {
    const client = (invoice.clients as unknown) as { name: string; email: string } | null;
    if (!client?.email) continue;

    const daysOverdue = Math.floor(
      (Date.now() - new Date(invoice.due_date).getTime()) / 86400000
    );

    try {
      await transporter.sendMail({
        from: `"Brightex Solutions" <${process.env.SMTP_USER}>`,
        to: client.email,
        subject: `Payment Reminder: Invoice ${invoice.invoice_number} is ${daysOverdue} days overdue`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <p>Dear <strong>${client.name}</strong>,</p>
          <p>Invoice <strong>${invoice.invoice_number}</strong> for KES <strong>${Number(invoice.total).toLocaleString()}</strong> was due on ${new Date(invoice.due_date).toLocaleDateString("en-KE")} and is now ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue.</p>
          <p>Please process payment via M-Pesa (+254 741 980 127) or contact us if you have any questions.</p>
          <p>— Brightex Solutions</p>
        </div>`,
      });
      sent++;

      // Mark invoice overdue
      await supabase.from("invoices").update({ status: "overdue" }).eq("id", invoice.id);
    } catch {
      // Continue sending to other clients even if one fails
    }
  }

  return NextResponse.json({ status: "ok", reminders_sent: sent, timestamp: new Date().toISOString() });
}
