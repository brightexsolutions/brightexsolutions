import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { SITE_NAME, BUSINESS_EMAIL, BUSINESS_PHONE, SITE_URL, whatsappUrl } from "@/lib/constants";
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

const ConfirmSchema = z.object({
  id: z.string().uuid(),
  meeting_link: z.string().url().optional().or(z.literal("")),
  action: z.enum(["confirm", "cancel"]),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("bookings")
    .select("*")
    .is("deleted_at", null)
    .order("scheduled_at");

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = ConfirmSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const newStatus = result.data.action === "confirm" ? "confirmed" : "cancelled";
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({ status: newStatus, meeting_link: result.data.meeting_link || null })
    .eq("id", result.data.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const purposeLabel = purposeLabels[booking.purpose] ?? "Meeting";
  const formattedDate = new Date(booking.scheduled_at).toLocaleDateString("en-KE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi",
  });
  const formattedTime = new Date(booking.scheduled_at).toLocaleTimeString("en-KE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi", timeZoneName: "short",
  });

  // Send confirmation or cancellation email
  if (booking.booker_email) {
    const isConfirm = result.data.action === "confirm";

    const html = isConfirm
      ? emailTemplate({
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
              (result.data.meeting_link
                ? emailRow("Meeting Link", `<a href="${result.data.meeting_link}" style="color:#152238;font-weight:600">Join Meeting</a>`)
                : "")
            ) +
            (result.data.meeting_link
              ? emailButton("Join Meeting", result.data.meeting_link, "primary")
              : "") +
            emailDivider() +
            emailParagraph(
              `Need to reschedule? Reply to this email or reach us at <a href="mailto:${BUSINESS_EMAIL}" style="color:#152238">${BUSINESS_EMAIL}</a>`
            ) +
            emailSignoff(),
        })
      : emailTemplate({
          title: "Booking Cancelled",
          subtitle: purposeLabel,
          preheader: `Your ${purposeLabel} booking has been cancelled`,
          body:
            emailAlert("Your booking has been cancelled.", "warning") +
            emailParagraph(`Hi <strong>${booking.booker_name}</strong>, your ${purposeLabel} on <strong>${formattedDate}</strong> has been cancelled.`) +
            emailParagraph("You're welcome to rebook at any time using the link below:") +
            emailButton("Book a New Slot", `${SITE_URL}/book`, "secondary") +
            emailDivider() +
            emailParagraph(
              `For any questions, reach us at <a href="mailto:${BUSINESS_EMAIL}" style="color:#152238">${BUSINESS_EMAIL}</a> or on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825">${BUSINESS_PHONE}</a>`
            ) +
            emailSignoff(),
        });

    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: booking.booker_email,
      subject: isConfirm
        ? `Booking Confirmed — ${purposeLabel} on ${formattedDate}`
        : `Booking Cancelled — ${purposeLabel}`,
      html,
    }).catch((err) => console.error("[bookings] Email failed:", err));
  }

  // Add to calendar on confirm
  if (result.data.action === "confirm") {
    await supabase.from("calendar_events").insert({
      title: `${purposeLabel} — ${booking.booker_name}`,
      type: "booking",
      start_at: booking.scheduled_at,
      end_at: new Date(new Date(booking.scheduled_at).getTime() + (booking.duration_minutes as number) * 60000).toISOString(),
      entity_type: "booking",
      entity_id: booking.id as string,
    });
  }

  return NextResponse.json({ data: booking });
}
