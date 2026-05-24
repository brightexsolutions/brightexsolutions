import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/verify-origin";
import { transporter, ADMIN_EMAIL, SITE_NAME, SITE_URL } from "@/lib/mail";

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

  // Layer 4 — DB insert (skip gracefully if Supabase not yet configured)
  let dbSaved = false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await supabase.from("contacts").insert({
        name,
        company: company ?? null,
        contact,
        service: service ?? null,
        message,
      });
      dbSaved = true;
    } catch (err) {
      console.error("[contact] DB insert failed:", err);
    }
  }

  // Layer 5 — email notification to admin
  let emailSent = false;
  try {
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New enquiry from ${name}${company ? ` (${company})` : ""}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#152238;margin-bottom:16px">New Contact Enquiry</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;font-weight:600;color:#152238;width:120px">Name</td><td style="padding:8px 0;color:#1e2840">${name}</td></tr>
            ${company ? `<tr><td style="padding:8px 0;font-weight:600;color:#152238">Company</td><td style="padding:8px 0;color:#1e2840">${company}</td></tr>` : ""}
            <tr><td style="padding:8px 0;font-weight:600;color:#152238">Contact</td><td style="padding:8px 0;color:#1e2840">${contact}</td></tr>
            ${service ? `<tr><td style="padding:8px 0;font-weight:600;color:#152238">Service</td><td style="padding:8px 0;color:#1e2840">${service}</td></tr>` : ""}
            <tr><td style="padding:8px 0;font-weight:600;color:#152238;vertical-align:top">Message</td><td style="padding:8px 0;color:#1e2840;white-space:pre-wrap">${message}</td></tr>
          </table>
          <p style="margin-top:24px;color:#64748b;font-size:13px">Sent via ${SITE_URL}</p>
        </div>
      `,
    });
    emailSent = true;
  } catch (err) {
    console.error("[contact] Admin email failed:", err);
  }

  // Auto-reply if the contact field looks like an email
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  if (isEmail && emailSent) {
    try {
      await transporter.sendMail({
        from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
        to: contact,
        subject: `Thanks for reaching out, ${name.split(" ")[0]}!`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#152238;margin-bottom:12px">We got your message.</h2>
            <p style="color:#1e2840;line-height:1.6">Hi ${name.split(" ")[0]}, thanks for reaching out to Brightex Solutions. We've received your enquiry and will get back to you within 24 hours.</p>
            <p style="color:#1e2840;line-height:1.6">In the meantime, you can reach us directly on WhatsApp: <a href="https://wa.me/254741980127" style="color:#f9a825">+254 741 980 127</a></p>
            <p style="margin-top:24px;color:#64748b;font-size:13px">— The Brightex Solutions Team</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[contact] Auto-reply failed:", err);
    }
  }

  // If nothing worked, return a graceful degradation message
  if (!dbSaved && !emailSent) {
    return NextResponse.json(
      {
        success: false,
        message:
          "We couldn't process your submission right now. Please reach out via WhatsApp at +254 741 980 127.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true });
}
