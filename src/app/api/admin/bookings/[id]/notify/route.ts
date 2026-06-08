import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import {
  SITE_NAME,
  BUSINESS_EMAIL,
  BUSINESS_PHONE,
  BUSINESS_WHATSAPP,
  whatsappUrl,
} from "@/lib/constants";
import {
  emailTemplate,
  emailRow,
  emailInfoTable,
  emailAlert,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!booking.booker_email) return NextResponse.json({ error: "Booker has no email address" }, { status: 422 });

  const scheduledDate = new Date(booking.scheduled_at);
  const formattedDate = scheduledDate.toLocaleDateString("en-KE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("en-KE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi", timeZoneName: "short",
  });
  const purposeLabel = purposeLabels[booking.purpose] ?? "Meeting";

  const html = emailTemplate({
    title: "Booking Confirmed",
    subtitle: purposeLabel,
    preheader: `Your ${purposeLabel} with ${SITE_NAME} on ${formattedDate} is confirmed`,
    body:
      emailAlert("Your booking has been confirmed.", "success") +
      emailParagraph(`Hi <strong>${booking.booker_name}</strong>, here are your confirmed booking details:`) +
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
      (booking.notes
        ? `<div style="background:#f8fafc;padding:12px 16px;border-radius:4px;margin:16px 0"><p style="color:#64748b;font-size:13px;margin:0">${booking.notes}</p></div>`
        : "") +
      (!booking.meeting_link
        ? emailParagraph(
            `We'll share connection details closer to the date. You can also reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`
          )
        : "") +
      emailDivider() +
      emailParagraph(
        `To reschedule or if you have questions, reply to this email or contact us at <a href="mailto:${BUSINESS_EMAIL}" style="color:#152238">${BUSINESS_EMAIL}</a>`
      ) +
      emailSignoff(),
  });

  let emailSent = false;
  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_USER}>`,
      to: booking.booker_email,
      subject: `Booking Confirmed — ${purposeLabel} on ${formattedDate}`,
      html,
    });
    emailSent = true;
  } catch {
    // Still return WhatsApp link so admin can notify manually
  }

  // Build pre-filled WhatsApp message for admin to send if email fails
  const waMessage = `Hi ${booking.booker_name}, your ${purposeLabel} with ${SITE_NAME} on ${formattedDate} at ${formattedTime} has been confirmed.${booking.meeting_link ? ` Join here: ${booking.meeting_link}` : ""} Looking forward to speaking with you!`;
  const waLink = booking.booker_phone
    ? `https://wa.me/${booking.booker_phone.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`
    : `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(waMessage)}`;

  if (emailSent) {
    await supabase.from("bookings").update({ reminder_sent: true }).eq("id", id);

    const { data: matchedClient } = await supabase
      .from("clients")
      .select("id")
      .eq("email", booking.booker_email)
      .maybeSingle();

    await supabase.from("communications").insert({
      client_id: matchedClient?.id ?? null,
      type: "email",
      subject: `Booking confirmation sent — ${purposeLabel} on ${formattedDate}`,
      body: `Sent to ${booking.booker_email}`,
      direction: "out",
      status: "sent",
    });
  }

  return NextResponse.json({
    emailSent,
    whatsapp_link: waLink,
    whatsapp_message: waMessage,
  });
}
