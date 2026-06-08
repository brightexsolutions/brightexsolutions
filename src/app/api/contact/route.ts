import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/verify-origin";
import { transporter, ADMIN_EMAIL, SITE_NAME } from "@/lib/mail";
import { BUSINESS_PHONE, whatsappUrl } from "@/lib/constants";
import {
  emailTemplate,
  emailRow,
  emailInfoTable,
  emailParagraph,
  emailButton,
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";

const ContactSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  company: z.string().max(100).trim().optional(),
  contact: z.string().min(3).max(150).trim(),
  service: z.string().max(80).trim().optional(),
  message: z.string().min(10).max(2000).trim(),
});

export async function POST(request: NextRequest) {
  // Layer 1 — rate limit (5 req / 60s per IP)
  const limited = await rateLimit(request, "contact");
  if (limited) return limited;

  // Layer 2 — origin check
  if (!verifyOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Layer 3 — parse + validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = ContactSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, company, contact, service, message } = result.data;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);

  // Layer 4 — DB insert (skip gracefully if Supabase not yet configured)
  let dbSaved = false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();

      await supabase.from("contacts").insert({
        name,
        company: company ?? null,
        contact,
        service: service ?? null,
        message,
      });

      // Auto-create or update a lead in the clients table.
      const matchField = isEmail ? "email" : "phone";
      const { data: existing } = await supabase
        .from("clients")
        .select("id, classification")
        .eq(matchField, contact)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("clients")
          .update({ last_contacted_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        const basePayload = {
          name,
          company: company ?? null,
          source: "contact_form",
          classification: "lead",
          notes: service ? `Interested in: ${service}` : null,
          last_contacted_at: new Date().toISOString(),
        };
        await supabase.from("clients").insert(
          isEmail ? { ...basePayload, email: contact } : { ...basePayload, phone: contact }
        );
      }

      dbSaved = true;
    } catch (err) {
      console.error("[contact] DB insert failed:", err);
    }
  }

  // Layer 5 — admin notification email
  let emailSent = false;
  try {
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New enquiry from ${name}${company ? ` (${company})` : ""}`,
      html: emailTemplate({
        title: "New Contact Enquiry",
        subtitle: "New Lead",
        preheader: `${name} submitted a contact enquiry`,
        body:
          emailInfoTable(
            emailRow("Name", name) +
            (company ? emailRow("Company", company) : "") +
            emailRow("Contact", contact) +
            (service ? emailRow("Service Interest", service) : "") +
            emailRow("Message", message.replace(/\n/g, "<br>"))
          ) +
          emailSignoff(),
      }),
    });
    emailSent = true;
  } catch (err) {
    console.error("[contact] Admin email failed:", err);
  }

  // Auto-reply if the contact field looks like an email
  if (isEmail && emailSent) {
    const firstName = name.split(" ")[0];
    try {
      await transporter.sendMail({
        from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
        to: contact,
        subject: `Thanks for reaching out, ${firstName}!`,
        html: emailTemplate({
          title: `We received your message, ${firstName}!`,
          preheader: "Thanks for reaching out — we'll respond within 24 hours",
          body:
            emailParagraph(
              `Hi ${firstName}, thanks for reaching out to <strong>${SITE_NAME}</strong>. We've received your enquiry and will get back to you within 24 hours.`
            ) +
            emailParagraph("In the meantime, you can reach us directly on WhatsApp:") +
            emailButton("Chat on WhatsApp", whatsappUrl(), "secondary") +
            emailDivider() +
            emailSignoff(),
        }),
      });
    } catch (err) {
      console.error("[contact] Auto-reply failed:", err);
    }
  }

  if (!dbSaved && !emailSent) {
    return NextResponse.json(
      {
        success: false,
        message: `We couldn't process your submission right now. Please reach out via WhatsApp at ${BUSINESS_PHONE}.`,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true });
}
