import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/verify-origin";
import { transporter, ADMIN_EMAIL, SITE_NAME } from "@/lib/mail";
import { BUSINESS_PHONE, whatsappUrl } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/server";
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

const TrialSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim(),
  company: z.string().max(100).trim().optional(),
  phone: z.string().max(20).trim().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimit(request, "trial");
  if (limited) return limited;

  if (!verifyOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = TrialSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, company, phone } = result.data;
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!configured) {
    return NextResponse.json({ error: "Product trials are not configured yet." }, { status: 503 });
  }

  const supabase = createAdminClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, trial_days")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let dbSaved = false;
  const trialDays = product.trial_days && product.trial_days > 0 ? product.trial_days : 7;

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + trialDays);
    const { error } = await supabase.from("product_trials").insert({
      product_id: product.id,
      requester_name: name,
      requester_email: email,
      requester_company: company ?? null,
      requester_phone: phone ?? null,
      expires_at: expiresAt.toISOString(),
    });

    if (!error) {
      dbSaved = true;
    } else {
      console.error("[trial] DB insert failed:", error);
    }
  } catch (err) {
    console.error("[trial] DB insert failed:", err);
  }

  // Admin notification
  let adminMailSent = false;
  try {
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New trial request — ${product.name} — ${name}`,
      html: emailTemplate({
        title: "New Trial Request",
        subtitle: product.name,
        preheader: `${name} requested a ${trialDays}-day trial of ${product.name}`,
        body:
          emailAlert(`New ${trialDays}-day trial request for <strong>${product.name}</strong>`, "info") +
          emailInfoTable(
            emailRow("Name", name) +
            emailRow("Email", `<a href="mailto:${email}" style="color:#152238">${email}</a>`) +
            (company ? emailRow("Organisation", company) : "") +
            (phone ? emailRow("Phone", phone) : "") +
            emailRow("Product", product.name) +
            emailRow("Trial Duration", `${trialDays} days`)
          ) +
          emailSignoff(),
      }),
    });
    adminMailSent = true;
  } catch (err) {
    console.error("[trial] Admin email failed:", err);
  }

  // Confirmation to requester
  let requesterMailSent = false;
  const firstName = name.split(" ")[0];
  try {
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your ${trialDays}-day ${product.name} trial is being set up`,
      html: emailTemplate({
        title: "Your Trial Is Being Set Up",
        subtitle: product.name,
        preheader: `Your ${trialDays}-day ${product.name} trial request was received`,
        body:
          emailAlert(`Your ${trialDays}-day trial of <strong>${product.name}</strong> is being set up!`, "success") +
          emailParagraph(
            `Hi ${firstName}, thanks for requesting a trial of <strong>${product.name}</strong>. We're setting up your access and will send login details within a few hours.`
          ) +
          emailParagraph("Have questions in the meantime? Reach us on WhatsApp:") +
          emailButton("Chat on WhatsApp", whatsappUrl(), "secondary") +
          emailDivider() +
          emailSignoff(),
      }),
    });
    requesterMailSent = true;
  } catch (err) {
    console.error("[trial] Confirmation email failed:", err);
  }

  if (!dbSaved && !adminMailSent && !requesterMailSent) {
    return NextResponse.json(
      { error: `We couldn't process your ${product.name} trial request right now.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
