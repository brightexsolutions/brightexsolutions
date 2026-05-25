import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const in14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Find subscriptions renewing within 14 days
  const { data: renewingSoon } = await supabase
    .from("subscriptions")
    .select("id, name, next_renewal_date, amount, currency")
    .eq("active", true)
    .lte("next_renewal_date", in14days)
    .gte("next_renewal_date", today);

  // Find overdue renewals
  const { data: overdue } = await supabase
    .from("subscriptions")
    .select("id, name, next_renewal_date")
    .eq("active", true)
    .lt("next_renewal_date", today);

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
