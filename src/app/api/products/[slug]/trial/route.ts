import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/verify-origin";
import { transporter, ADMIN_EMAIL, SITE_NAME } from "@/lib/mail";

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

  // DB insert if Supabase connected
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await supabase.from("product_trials").insert({
        product_id: null, // Will be linked once products table has data
        requester_name: name,
        requester_email: email,
        requester_company: company ?? null,
        requester_phone: phone ?? null,
        expires_at: expiresAt.toISOString(),
      });
    } catch (err) {
      console.error("[trial] DB insert failed:", err);
    }
  }

  // Notify admin
  try {
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New trial request — ${slug} — ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#152238">New Product Trial Request</h2>
          <p style="color:#1e2840"><strong>Product:</strong> ${slug}</p>
          <p style="color:#1e2840"><strong>Name:</strong> ${name}</p>
          <p style="color:#1e2840"><strong>Email:</strong> ${email}</p>
          ${company ? `<p style="color:#1e2840"><strong>Organisation:</strong> ${company}</p>` : ""}
          ${phone ? `<p style="color:#1e2840"><strong>Phone:</strong> ${phone}</p>` : ""}
        </div>
      `,
    });
  } catch (err) {
    console.error("[trial] Admin email failed:", err);
  }

  // Confirmation to requester
  try {
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your 7-day trial is being set up`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#152238">Your trial is being set up, ${name.split(" ")[0]}!</h2>
          <p style="color:#1e2840;line-height:1.6">Thanks for requesting a trial. We'll send your access details within a few hours.</p>
          <p style="color:#1e2840;line-height:1.6">If you have any questions in the meantime, reach us on WhatsApp: <a href="https://wa.me/254741980127" style="color:#f9a825">+254 741 980 127</a></p>
          <p style="color:#64748b;font-size:13px;margin-top:24px">— The Brightex Solutions Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[trial] Confirmation email failed:", err);
  }

  return NextResponse.json({ success: true });
}
