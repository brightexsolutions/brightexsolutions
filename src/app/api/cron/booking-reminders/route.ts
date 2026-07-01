import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { verifyCronSecret } from "@/lib/cron-auth";
import { SITE_NAME, BUSINESS_EMAIL, BUSINESS_PHONE, whatsappUrl } from "@/lib/constants";
import { logSystemAction } from "@/lib/audit";
import {
  emailTemplate,
  emailRow,
  emailInfoTable,
  emailParagraph,
  emailButton,
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";

const purposeLabels: Record<string, string> = {
  intro_call: "Intro Call",
  project_review: "Project Review",
  consultation: "Consultation",
  other: "Meeting",
};

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();

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
    const purposeLabel = purposeLabels[booking.purpose] ?? "Meeting";
    const formattedDate = new Date(booking.scheduled_at).toLocaleDateString("en-KE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi",
    });
    const formattedTime = new Date(booking.scheduled_at).toLocaleTimeString("en-KE", {
      hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi", timeZoneName: "short",
    });

    try {
      await transporter.sendMail({
        from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
        to: booking.booker_email,
        subject: `Reminder: Your ${purposeLabel} with ${SITE_NAME} is tomorrow`,
        html: emailTemplate({
          title: "Meeting Reminder",
          subtitle: purposeLabel,
          preheader: `Your ${purposeLabel} with ${SITE_NAME} is tomorrow`,
          body:
            emailParagraph(`Hi <strong>${booking.booker_name}</strong>, just a reminder that your ${purposeLabel} is tomorrow.`) +
            emailInfoTable(
              emailRow("Type", purposeLabel) +
              emailRow("Date", formattedDate) +
              emailRow("Time", formattedTime) +
              (booking.duration_minutes ? emailRow("Duration", `${booking.duration_minutes} minutes`) : "") +
              (booking.meeting_link
                ? emailRow("Meeting Link", `<a href="${booking.meeting_link}" style="color:#152238;font-weight:600">Join Meeting</a>`)
                : "")
            ) +
            (booking.meeting_link
              ? emailButton("Join Meeting", booking.meeting_link, "primary")
              : "") +
            emailDivider() +
            emailParagraph(
              `Need to reschedule? Reply to this email or reach us at <a href="mailto:${BUSINESS_EMAIL}" style="color:#152238">${BUSINESS_EMAIL}</a> or <a href="${whatsappUrl()}" style="color:#f9a825">${BUSINESS_PHONE}</a>`
            ) +
            emailSignoff(),
        }),
      });

      await Promise.all([
        supabase.from("bookings").update({ reminder_sent: true }).eq("id", booking.id),
        logSystemAction({
          action: "reminder_sent",
          entity_type: "booking",
          entity_id: booking.id,
          entity_label: `${purposeLabel} — ${booking.booker_name}`,
          notes: `Automated 24h reminder sent to ${booking.booker_email}`,
        }),
      ]);
      sent++;
    } catch {
      // Continue with other bookings
    }
  }

  return NextResponse.json({ status: "ok", reminders_sent: sent, timestamp: new Date().toISOString() });
}
