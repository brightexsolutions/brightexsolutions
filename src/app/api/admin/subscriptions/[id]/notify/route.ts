import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { transporter, SENDERS } from "@/lib/mail";
import { SITE_NAME, BUSINESS_PHONE, whatsappUrl } from "@/lib/constants";
import {
  emailTemplate,
  emailRow,
  emailInfoTable,
  emailAlert,
  emailParagraph,
  emailSignoff,
} from "@/lib/email-templates";

const NotifySchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
});

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
  const body = await request.json().catch(() => ({}));
  const result = NotifySchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("*, clients(id, name, email, phone)")
    .eq("id", id)
    .single();

  if (error || !sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  const client = sub.clients as { id: string; name?: string | null; email?: string | null; phone?: string | null } | null;

  if (!client) return NextResponse.json({ error: "No client linked to this subscription" }, { status: 422 });

  const daysUntil = Math.ceil(
    (new Date(sub.next_renewal_date).getTime() - Date.now()) / 86400000
  );
  const isOverdue = daysUntil < 0;

  if (result.data.channel === "email") {
    if (!client.email) return NextResponse.json({ error: "Client has no email address on file" }, { status: 422 });

    const firstName = (client.name ?? "").split(" ")[0] || "there";
    const renewalDateLabel = new Date(sub.next_renewal_date).toLocaleDateString("en-KE", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const alertText = isOverdue
      ? `The renewal date for <strong>${sub.name}</strong> has passed. Please action this immediately.`
      : `<strong>${sub.name}</strong> is due for renewal in <strong>${daysUntil} day${daysUntil !== 1 ? "s" : ""}</strong>.`;

    const html = emailTemplate({
      title: isOverdue ? "Subscription Overdue" : "Subscription Renewal Reminder",
      subtitle: sub.name,
      preheader: isOverdue
        ? `${sub.name} renewal has passed — action required`
        : `${sub.name} renews in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
      body:
        emailAlert(alertText, isOverdue ? "error" : daysUntil <= 3 ? "warning" : "info") +
        emailParagraph(`Hi ${firstName},`) +
        emailInfoTable(
          emailRow("Subscription", sub.name) +
          (sub.provider ? emailRow("Provider", sub.provider) : "") +
          emailRow("Renewal Date", renewalDateLabel) +
          (sub.amount
            ? emailRow("Amount", `${sub.currency ?? "KES"} ${Number(sub.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`)
            : "") +
          emailRow("Billing Cycle", (sub.billing_cycle as string).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()))
        ) +
        emailParagraph(
          `If you have any questions, please reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`
        ) +
        emailSignoff(),
    });

    try {
      await transporter.sendMail({
        from: SENDERS.info,
        to: client.email,
        subject: isOverdue
          ? `OVERDUE: ${sub.name} renewal has passed`
          : `Renewal reminder: ${sub.name} in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
        html,
      });
    } catch {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    await supabase.from("communications").insert({
      client_id: client.id,
      type: "email",
      subject: `Renewal reminder sent — ${sub.name}`,
      direction: "out",
      status: "sent",
    });

    return NextResponse.json({ sent: true, channel: "email" });
  }

  // WhatsApp — return a pre-filled wa.me link, let the admin open it
  const phone = (client.phone ?? "").replace(/\D/g, "");
  if (!phone) return NextResponse.json({ error: "Client has no phone number on file" }, { status: 422 });

  const renewalDateLabel = new Date(sub.next_renewal_date).toLocaleDateString("en-KE", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const message = isOverdue
    ? `Hi ${client.name ?? "there"}, this is a reminder that the *${sub.name}* subscription renewal date (${renewalDateLabel}) has already passed. Please let us know how you'd like to proceed. — ${SITE_NAME}`
    : `Hi ${client.name ?? "there"}, just a heads-up that *${sub.name}* is due for renewal on ${renewalDateLabel} (${daysUntil} day${daysUntil !== 1 ? "s" : ""}). Please let us know if you'd like to renew. — ${SITE_NAME}`;

  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return NextResponse.json({ sent: false, channel: "whatsapp", wa_link: waLink });
}
