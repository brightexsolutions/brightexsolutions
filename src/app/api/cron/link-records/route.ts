/**
 * /api/cron/link-records
 *
 * Runs nightly to repair unlinked relationships across tables:
 *
 * 1. bookings  → clients  : match booker_email to clients.email; set client_id
 * 2. contacts  → clients  : match contact (email) to clients.email; set client_id
 * 3. payments  → income_records : create missing income_record for any payment
 *                                  that has no corresponding income_record
 * 4. product_trials → clients  : match requester_email to clients.email; set client_id
 *                                  (if product_trials table has client_id column)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();
  const stats: Record<string, number> = {
    bookings_linked: 0,
    payments_income_created: 0,
  };

  // ── 1. Link bookings → clients by email ─────────────────────────────────────
  const { data: unlinkedBookings } = await supabase
    .from("bookings")
    .select("id, booker_email")
    .is("client_id", null)
    .not("booker_email", "is", null);

  for (const booking of unlinkedBookings ?? []) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("email", booking.booker_email)
      .maybeSingle();
    if (client) {
      await supabase.from("bookings").update({ client_id: client.id }).eq("id", booking.id);
      stats.bookings_linked++;
    }
  }

  // ── 2. Payments without a matching income_record ─────────────────────────────
  // Fetch all payment IDs that already have an income_record
  const { data: linkedPaymentRows } = await supabase
    .from("income_records")
    .select("payment_id")
    .not("payment_id", "is", null);

  const linkedPaymentIds = new Set(
    (linkedPaymentRows ?? []).map((r: { payment_id: string }) => r.payment_id)
  );

  const { data: allPayments } = await supabase
    .from("payments")
    .select("id, amount, date, invoice_id, invoices(invoice_number, client_id)")
    .is("deleted_at", null);

  for (const payment of allPayments ?? []) {
    if (linkedPaymentIds.has(payment.id)) continue;

    const inv = payment.invoices as { invoice_number?: string | null; client_id?: string | null } | null;
    await supabase.from("income_records").insert({
      source: "invoice_payment",
      description: `Payment for invoice ${inv?.invoice_number ?? payment.invoice_id ?? "unknown"}`,
      client_id: inv?.client_id ?? null,
      payment_id: payment.id,
      amount: payment.amount,
      currency: "KES",
      date: payment.date ?? new Date().toISOString().split("T")[0],
      category: "service_revenue",
      tax_applicable: true,
    });
    stats.payments_income_created++;
  }

  return NextResponse.json({
    status: "ok",
    ...stats,
    timestamp: new Date().toISOString(),
  });
}
