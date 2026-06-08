import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

function advanceRenewalDate(currentDate: string, billingCycle: string): string {
  const d = new Date(currentDate);
  if (billingCycle === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else if (billingCycle === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().split("T")[0];
}

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

  // Fetch subscription details
  const { data: sub, error: fetchErr } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  const today = new Date().toISOString().split("T")[0];
  const newRenewalDate = sub.billing_cycle !== "one_time"
    ? advanceRenewalDate(sub.next_renewal_date, sub.billing_cycle)
    : sub.next_renewal_date;

  // Update subscription: last_paid_date = today, advance renewal date
  const { data: updated, error: updateErr } = await supabase
    .from("subscriptions")
    .update({ last_paid_date: today, next_renewal_date: newRenewalDate })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Only create an expense record for internal or on_behalf subscriptions
  // client_managed = client pays themselves, no expense on our books
  if (sub.ownership !== "client_managed" && sub.amount) {
    const category = sub.ownership === "internal" ? "subscription" : "subscription";
    const description = sub.ownership === "on_behalf"
      ? `${sub.name} — paid on behalf of client`
      : sub.name;

    await supabase.from("expenses").insert({
      description,
      category,
      amount: sub.amount,
      currency: sub.currency ?? "KES",
      date: today,
      vendor: sub.provider ?? null,
      tax_deductible: true,
      notes: sub.ownership === "on_behalf"
        ? `Subscription renewal paid on behalf of client. Next renewal: ${newRenewalDate}`
        : `Subscription renewal. Next renewal: ${newRenewalDate}`,
      added_by: user.id,
    });
  }

  // Update the linked calendar event to the new renewal date
  await supabase
    .from("calendar_events")
    .update({ start_at: new Date(newRenewalDate).toISOString() })
    .eq("entity_type", "subscription")
    .eq("entity_id", id);

  return NextResponse.json({ data: updated });
}
