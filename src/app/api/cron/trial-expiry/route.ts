import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Find active trials that have expired
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
    // Mark as expired
    await supabase.from("product_trials").update({ status: "expired" }).eq("id", trial.id);

    // Send "subscribe to continue" email
    if (trial.requester_email) {
      const product = trial.products as { name: string; slug: string } | null;
      try {
        await transporter.sendMail({
          from: `"Brightex Solutions" <${process.env.SMTP_USER}>`,
          to: trial.requester_email,
          subject: `Your ${product?.name ?? "product"} trial has ended`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <p>Hi <strong>${trial.requester_name}</strong>,</p>
            <p>Your 7-day free trial of <strong>${product?.name ?? "the product"}</strong> has ended.</p>
            <p>To continue using it, subscribe to a plan that fits your needs.</p>
            <p>Reply to this email or WhatsApp us at <strong>+254 741 980 127</strong> and we'll get you set up.</p>
            <p>— Brightex Solutions</p>
          </div>`,
        });
      } catch {
        // Don't stop processing other trials if email fails
      }
    }

    processed++;
  }

  return NextResponse.json({ status: "ok", expired: processed, timestamp: new Date().toISOString() });
}
