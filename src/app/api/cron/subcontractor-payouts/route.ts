import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { logSystemAction } from "@/lib/audit";

const OVERDUE_DAYS = 14;

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - OVERDUE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: pendingExpenses } = await supabase
    .from("subcontractor_expenses")
    .select("id, description, amount, currency, created_at")
    .eq("status", "received")
    .lt("created_at", cutoff)
    .is("deleted_at", null);

  if (!pendingExpenses?.length) {
    return NextResponse.json({ status: "ok", alerts_created: 0 });
  }

  let alertsCreated = 0;
  for (const expense of pendingExpenses) {
    const { count } = await supabase
      .from("system_alerts")
      .select("*", { count: "exact", head: true })
      .eq("entity_id", expense.id)
      .eq("type", "subcontractor_payout_pending")
      .eq("acknowledged", false);

    if ((count ?? 0) === 0) {
      const daysPending = Math.floor((Date.now() - new Date(expense.created_at as string).getTime()) / 86400000);

      await supabase.from("system_alerts").insert({
        type: "subcontractor_payout_pending",
        severity: daysPending >= 30 ? "critical" : "warning",
        message: `Subcontractor expense "${expense.description ?? expense.id}" has been awaiting payout for ${daysPending} day${daysPending !== 1 ? "s" : ""} — ${expense.currency ?? "KES"} ${Number(expense.amount).toLocaleString("en-KE")}`,
        entity_id: expense.id,
        entity_type: "subcontractor_expense",
      });

      await logSystemAction({
        action: "payout_alert_created",
        entity_type: "subcontractor_expense",
        entity_id: expense.id,
        entity_label: expense.description ?? expense.id,
        notes: `Payout pending for ${daysPending} day${daysPending !== 1 ? "s" : ""}`,
      });

      alertsCreated++;
    }
  }

  return NextResponse.json({ status: "ok", alerts_created: alertsCreated, timestamp: new Date().toISOString() });
}
