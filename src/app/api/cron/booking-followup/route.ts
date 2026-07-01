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
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";

const purposeLabels: Record<string, string> = {
  intro_call:     "Intro Call",
  project_review: "Project Review",
  consultation:   "Consultation",
  other:          "Meeting",
};

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();

  // Find confirmed bookings whose scheduled time has passed in the last 48 hours,
  // and haven't had a follow-up sent yet
  const cutoffEnd   = new Date().toISOString();
  const cutoffStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .eq("follow_up_sent", false)
    .gte("scheduled_at", cutoffStart)
    .lte("scheduled_at", cutoffEnd);

  if (!bookings?.length) {
    return NextResponse.json({ status: "ok", sent: 0 });
  }

  let sent = 0;
  for (const booking of bookings) {
    if (!booking.booker_email) continue;

    const purposeLabel = purposeLabels[booking.purpose] ?? "Meeting";
    const formattedDate = new Date(booking.scheduled_at).toLocaleDateString("en-KE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi",
    });
    const firstName = booking.booker_name?.split(" ")[0] ?? "there";

    try {
      await transporter.sendMail({
        from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
        to: booking.booker_email,
        subject: `Following up on your ${purposeLabel} — ${formattedDate}`,
        html: emailTemplate({
          title: "Following Up",
          subtitle: purposeLabel,
          preheader: `Quick follow-up on your ${purposeLabel} with ${SITE_NAME}`,
          heroTitle: `How did it go,\n${firstName}?`,
          body:
            emailParagraph(
              `We hope your ${purposeLabel} went well. We wanted to follow up and check if you have any questions or need anything from us.`
            ) +
            emailInfoTable(
              emailRow("Meeting", purposeLabel) +
              emailRow("Date", formattedDate)
            ) +
            emailDivider() +
            emailParagraph(
              `Reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a> — we'd love to hear from you.`
            ) +
            emailSignoff(),
        }),
      });

      await Promise.all([
        supabase.from("bookings").update({ follow_up_sent: true }).eq("id", booking.id),
        logSystemAction({
          action: "followup_sent",
          entity_type: "booking",
          entity_id: booking.id,
          entity_label: `${purposeLabel} — ${booking.booker_name}`,
          notes: `Post-booking follow-up sent to ${booking.booker_email}`,
        }),
      ]);

      sent++;
    } catch {
      // Continue with other bookings
    }
  }

  return NextResponse.json({ status: "ok", sent, timestamp: new Date().toISOString() });
}
