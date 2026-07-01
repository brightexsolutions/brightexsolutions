import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { transporter, SITE_NAME } from "@/lib/mail";
import { BUSINESS_EMAIL } from "@/lib/constants";
import { logSystemAction } from "@/lib/audit";
import {
  emailTemplate,
  emailRow,
  emailInfoTable,
  emailAlert,
  emailParagraph,
  emailSignoff,
} from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const in14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [{ data: renewingSoon }, { data: overdue }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, name, next_renewal_date, amount, currency, ownership, clients(id, name, email)")
      .eq("active", true)
      .lte("next_renewal_date", in14days)
      .gte("next_renewal_date", today),
    supabase
      .from("subscriptions")
      .select("id, name, next_renewal_date, ownership, clients(id, name, email)")
      .eq("active", true)
      .lt("next_renewal_date", today),
  ]);

  let alertsCreated = 0;

  for (const sub of renewingSoon ?? []) {
    const daysUntil = Math.floor(
      (new Date(sub.next_renewal_date).getTime() - Date.now()) / 86400000
    );

    const { count } = await supabase
      .from("system_alerts")
      .select("*", { count: "exact", head: true })
      .eq("entity_id", sub.id)
      .eq("type", "subscription_renewal")
      .eq("acknowledged", false);

    if ((count ?? 0) === 0) {
      await supabase.from("system_alerts").insert({
        type: "subscription_renewal",
        severity: daysUntil <= 3 ? "critical" : "warning",
        message: `${sub.name} renews in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} — ${sub.currency} ${sub.amount}`,
        entity_id: sub.id,
        entity_type: "subscription",
      });
      alertsCreated++;

      const linkedClient = (sub as unknown as { clients?: { name?: string | null; email?: string | null } | null }).clients;
      const greeting = linkedClient?.name ? `Hi ${linkedClient.name.split(" ")[0]},` : "Hi,";
      const recipients = [BUSINESS_EMAIL];
      if (linkedClient?.email) recipients.push(linkedClient.email);

      await transporter.sendMail({
        from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
        to: recipients.join(", "),
        subject: `Renewal reminder: ${sub.name} in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
        html: emailTemplate({
          title: "Subscription Renewal Reminder",
          subtitle: sub.name,
          preheader: `${sub.name} renews in ${daysUntil} days — action may be required`,
          body:
            emailAlert(
              `<strong>${sub.name}</strong> is due for renewal in <strong>${daysUntil} day${daysUntil !== 1 ? "s" : ""}</strong>`,
              daysUntil <= 3 ? "warning" : "info"
            ) +
            emailParagraph(greeting) +
            emailInfoTable(
              emailRow("Subscription", sub.name) +
              emailRow("Renewal Date", new Date(sub.next_renewal_date).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })) +
              emailRow("Amount", `${sub.currency} ${Number(sub.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`) +
              emailRow("Days Remaining", `${daysUntil} day${daysUntil !== 1 ? "s" : ""}`)
            ) +
            emailParagraph(`Log in to the <strong>${SITE_NAME}</strong> admin dashboard to acknowledge this alert or process renewal.`) +
            emailSignoff(),
        }),
      }).catch(console.error);

      await logSystemAction({
        action: "renewal_alert_sent",
        entity_type: "subscription",
        entity_id: sub.id,
        entity_label: sub.name,
        notes: `Automated renewal reminder — due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
      });
    }
  }

  for (const sub of overdue ?? []) {
    const { count } = await supabase
      .from("system_alerts")
      .select("*", { count: "exact", head: true })
      .eq("entity_id", sub.id)
      .eq("type", "subscription_overdue")
      .eq("acknowledged", false);

    if ((count ?? 0) === 0) {
      await supabase.from("system_alerts").insert({
        type: "subscription_overdue",
        severity: "critical",
        message: `${sub.name} renewal date has passed (${sub.next_renewal_date})`,
        entity_id: sub.id,
        entity_type: "subscription",
      });
      alertsCreated++;

      const linkedClient = (sub as unknown as { clients?: { name?: string | null; email?: string | null } | null }).clients;
      const greeting = linkedClient?.name ? `Hi ${linkedClient.name.split(" ")[0]},` : "Hi,";
      const recipients = [BUSINESS_EMAIL];
      if (linkedClient?.email) recipients.push(linkedClient.email);

      await transporter.sendMail({
        from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
        to: recipients.join(", "),
        subject: `OVERDUE: ${sub.name} renewal has passed`,
        html: emailTemplate({
          title: "Subscription Overdue",
          subtitle: sub.name,
          preheader: `${sub.name} renewal has passed — service may be inactive`,
          body:
            emailAlert(
              `<strong>${sub.name}</strong> renewal date has passed and the service may be inactive.`,
              "error"
            ) +
            emailParagraph(greeting) +
            emailInfoTable(
              emailRow("Subscription", sub.name) +
              emailRow("Was Due", new Date(sub.next_renewal_date).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" }))
            ) +
            emailParagraph(`Please renew or update the record in the <strong>${SITE_NAME}</strong> admin dashboard.`) +
            emailSignoff(),
        }),
      }).catch(console.error);

      await logSystemAction({
        action: "overdue_alert_sent",
        entity_type: "subscription",
        entity_id: sub.id,
        entity_label: sub.name,
        notes: `Automated overdue alert — renewal date was ${sub.next_renewal_date}`,
      });
    }
  }

  return NextResponse.json({
    status: "ok",
    alerts_created: alertsCreated,
    renewing_soon: renewingSoon?.length ?? 0,
    overdue: overdue?.length ?? 0,
    timestamp: new Date().toISOString(),
  });
}
