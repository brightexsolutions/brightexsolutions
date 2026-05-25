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

  // Find confirmed bookings scheduled in next 24–26 hours that haven't had a reminder sent
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const in26h = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .eq("reminder_sent", false)
    .gte("scheduled_at", in24h)
    .lte("scheduled_at", in26h);

  if (!bookings?.length) {
    return NextResponse.json({ status: "ok", reminders_sent: 0 });
  }

  let sent = 0;
  for (const booking of bookings) {
    try {
      await transporter.sendMail({
        from: `"Brightex Solutions" <${process.env.SMTP_USER}>`,
        to: booking.booker_email,
        subject: "Reminder: Your Brightex meeting is tomorrow",
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <p>Hi <strong>${booking.booker_name}</strong>,</p>
          <p>Just a reminder that your meeting with Brightex Solutions is tomorrow.</p>
          <p><strong>Time:</strong> ${new Date(booking.scheduled_at).toLocaleString("en-KE", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi" })}</p>
          <p><strong>Purpose:</strong> ${String(booking.purpose).replace("_", " ")}</p>
          ${booking.meeting_link ? `<p><strong>Meeting link:</strong> <a href="${booking.meeting_link}">${booking.meeting_link}</a></p>` : ""}
          <p>See you then! — Brightex Solutions</p>
        </div>`,
      });

      await supabase.from("bookings").update({ reminder_sent: true }).eq("id", booking.id);
      sent++;
    } catch {
      // Continue with other bookings
    }
  }

  return NextResponse.json({ status: "ok", reminders_sent: sent, timestamp: new Date().toISOString() });
}
