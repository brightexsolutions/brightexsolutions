import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { transporter } from "@/lib/mail";
import { SITE_NAME, BUSINESS_EMAIL, BUSINESS_PHONE, whatsappUrl } from "@/lib/constants";
import {
  emailTemplate,
  emailRow,
  emailInfoTable,
  emailAlert,
  emailParagraph,
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";

const schema = z.object({
  booker_name: z.string().min(2).max(100).trim(),
  booker_email: z.string().email().max(150).trim(),
  booker_phone: z.string().max(30).trim().optional(),
  purpose: z.enum(["intro_call", "project_review", "consultation", "other"]),
  scheduled_at: z.string().min(1),
  notes: z.string().max(1000).trim().optional(),
});

const purposeLabels: Record<string, string> = {
  intro_call: "Intro Call",
  project_review: "Project Review",
  consultation: "Consultation",
  other: "Other",
};

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "book");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  let dbSaved = false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createAdminClient();
    const { error: dbError } = await supabase.from("bookings").insert({
      booker_name: data.booker_name,
      booker_email: data.booker_email,
      booker_phone: data.booker_phone ?? null,
      purpose: data.purpose,
      scheduled_at: data.scheduled_at,
      notes: data.notes ?? null,
      status: "pending",
    });
    if (dbError) {
      console.error("[book] DB error:", dbError);
    } else {
      dbSaved = true;
    }
  }

  const purposeLabel = purposeLabels[data.purpose] ?? data.purpose;
  const scheduledDate = new Date(data.scheduled_at).toLocaleString("en-KE", {
    dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi",
  });

  let adminEmailSent = false;
  await transporter.sendMail({
    from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
    to: BUSINESS_EMAIL,
    subject: `New Booking: ${data.booker_name} — ${purposeLabel}`,
    html: emailTemplate({
      title: "New Booking Request",
      subtitle: purposeLabel,
      preheader: `${data.booker_name} booked a ${purposeLabel}`,
      body:
        emailAlert(`New ${purposeLabel} booking from <strong>${data.booker_name}</strong>`, "info") +
        emailInfoTable(
          emailRow("Name", data.booker_name) +
          emailRow("Email", `<a href="mailto:${data.booker_email}" style="color:#152238">${data.booker_email}</a>`) +
          (data.booker_phone ? emailRow("Phone", data.booker_phone) : "") +
          emailRow("Purpose", purposeLabel) +
          emailRow("Scheduled", scheduledDate) +
          (data.notes ? emailRow("Notes", data.notes) : "")
        ) +
        emailSignoff(),
    }),
  }).then(() => { adminEmailSent = true; }).catch((err) => {
    console.error("[book] Admin email failed:", err);
  });

  let guestEmailSent = false;
  const firstName = data.booker_name.split(" ")[0];
  await transporter.sendMail({
    from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
    to: data.booker_email,
    subject: `Booking Received — ${SITE_NAME}`,
    html: emailTemplate({
      title: "Booking Received",
      subtitle: purposeLabel,
      preheader: `Your ${purposeLabel} request has been received — we'll confirm shortly`,
      body:
        emailParagraph(`Hi ${firstName}, we've received your booking request and will confirm it shortly.`) +
        emailInfoTable(
          emailRow("Purpose", purposeLabel) +
          emailRow("Scheduled", scheduledDate)
        ) +
        emailParagraph("You'll receive a confirmation email with the meeting link once your booking is accepted. If you need to make changes, reply to this email.") +
        emailDivider() +
        emailParagraph(
          `You can also reach us directly: <a href="mailto:${BUSINESS_EMAIL}" style="color:#152238">${BUSINESS_EMAIL}</a> · <a href="${whatsappUrl()}" style="color:#f9a825">${BUSINESS_PHONE}</a>`
        ) +
        emailSignoff(),
    }),
  }).then(() => { guestEmailSent = true; }).catch((err) => {
    console.error("[book] Guest email failed:", err);
  });

  if (!dbSaved && !adminEmailSent && !guestEmailSent) {
    return NextResponse.json(
      { error: "We couldn't process your booking right now. Please try WhatsApp instead." },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true });
}
