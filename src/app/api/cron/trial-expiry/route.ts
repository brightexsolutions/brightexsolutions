import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { verifyCronSecret } from "@/lib/cron-auth";
import { SITE_NAME, BUSINESS_PHONE, whatsappUrl } from "@/lib/constants";
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

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: expiredTrials } = await supabase
    .from("product_trials")
    .select("*, products(name, slug)")
    .eq("status", "active")
    .lt("expires_at", now);

  if (!expiredTrials?.length) {
    return NextResponse.json({ status: "ok", expired: 0 });
  }

  let processed = 0;
  for (const trial of expiredTrials) {
    await supabase.from("product_trials").update({ status: "expired" }).eq("id", trial.id);

    if (trial.requester_email) {
      const product = trial.products as { name: string; slug: string } | null;
      const firstName = trial.requester_name?.split(" ")[0] ?? "there";
      const productName = product?.name ?? "the product";

      try {
        await transporter.sendMail({
          from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
          to: trial.requester_email,
          subject: `Your ${productName} trial has ended`,
          html: emailTemplate({
            title: "Your Trial Has Ended",
            subtitle: productName,
            preheader: `Your ${productName} trial has ended — subscribe to continue`,
            body:
              emailAlert(`Your ${productName} trial has ended.`, "warning") +
              emailParagraph(`Hi ${firstName}, your free trial of <strong>${productName}</strong> has come to an end.`) +
              emailInfoTable(
                emailRow("Product", productName) +
                emailRow("Trial Status", "Expired") +
                emailRow("Next Step", "Subscribe to continue")
              ) +
              emailParagraph("Subscribe to a plan to continue using all the features you've been exploring. We'll get you set up quickly.") +
              emailButton("Chat on WhatsApp to Subscribe", whatsappUrl(), "primary") +
              emailDivider() +
              emailParagraph(
                `Reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`
              ) +
              emailSignoff(),
          }),
        });
      } catch {
        // Don't stop processing other trials if email fails
      }
    }

    processed++;
  }

  return NextResponse.json({ status: "ok", expired: processed, timestamp: new Date().toISOString() });
}
