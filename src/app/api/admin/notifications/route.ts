import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();

  const [alertsRes, overdueRes, bookingsRes, contactsRes, approvalsRes, intakesRes] = await Promise.all([
    supabase
      .from("system_alerts")
      .select("id, type, severity, message, entity_type, entity_id, created_at")
      .eq("acknowledged", false)
      .order("severity", { ascending: true }) // critical first (c < w < i alphabetically... reversed below)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "overdue")
      .is("deleted_at", null),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),

    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),

    supabase
      .from("social_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_approval")
      .is("deleted_at", null),

    supabase
      .from("client_intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  // Sort alerts: critical → warning → info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const alerts = (alertsRes.data ?? []).sort(
    (a, b) =>
      (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
      (severityOrder[b.severity as keyof typeof severityOrder] ?? 3)
  );

  const counts = {
    overdue_invoices:  overdueRes.count   ?? 0,
    pending_bookings:  bookingsRes.count  ?? 0,
    new_contacts:      contactsRes.count  ?? 0,
    pending_approvals: approvalsRes.count ?? 0,
    new_intakes:       intakesRes.count   ?? 0,
  };

  const actionTotal = Object.values(counts).reduce((sum, v) => sum + v, 0);
  const total = alerts.length + actionTotal;

  return NextResponse.json({ total, alerts, counts });
}

export async function PATCH(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("system_alerts")
    .update({ acknowledged: true })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
