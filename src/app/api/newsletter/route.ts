import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/verify-origin";
import { transporter, ADMIN_EMAIL, SITE_NAME } from "@/lib/mail";
import { emailTemplate, emailParagraph, emailSignoff } from "@/lib/email-templates";

const NewsletterSchema = z.object({
  email: z.string().email().max(200).trim().toLowerCase(),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "newsletter");
  if (limited) return limited;

  if (!verifyOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = NewsletterSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const { email } = result.data;

  // Check for duplicate + save to contacts table
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();

      // Check if already subscribed
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("contact", email)
        .eq("service", "newsletter")
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { message: "You're already subscribed — we'll keep you posted!" },
          { status: 200 }
        );
      }

      await supabase.from("contacts").insert({
        name: email.split("@")[0],
        contact: email,
        service: "newsletter",
        message: "Subscribed via blog newsletter form",
        status: "new",
      });
    } catch (err) {
      console.error("[newsletter] DB insert failed:", err);
    }
  }

  // Confirmation email to subscriber
  try {
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: email,
      subject: "You're subscribed to the Brightex Journal",
      html: emailTemplate({
        title: "You're subscribed!",
        preheader: "Welcome to the Brightex Journal — thanks for subscribing",
        body:
          emailParagraph(
            "You're now subscribed to the <strong>Brightex Journal</strong>. We'll send you practical insights on web technology, digital strategy, and building businesses in Kenya and East Africa."
          ) +
          emailParagraph("Expect articles on web development, AI & automation, SEO, ERP systems, and more — no spam, ever.") +
          emailSignoff(),
      }),
    });
  } catch (err) {
    console.error("[newsletter] Confirmation email failed:", err);
  }

  // Notify admin of new subscriber
  try {
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New newsletter subscriber: ${email}`,
      html: emailTemplate({
        title: "New Newsletter Subscriber",
        subtitle: "Blog",
        preheader: `${email} subscribed via the blog`,
        body: emailParagraph(`<strong>${email}</strong> subscribed to the Brightex Journal via the blog newsletter form.`) + emailSignoff(),
      }),
    });
  } catch (err) {
    console.error("[newsletter] Admin notification failed:", err);
  }

  return NextResponse.json({
    success: true,
    message: "You're subscribed! Check your inbox for a confirmation.",
  });
}
