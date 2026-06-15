import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const SubscriptionSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  provider: z.string().max(100).trim().optional(),
  category: z.enum(["domain", "hosting", "tool", "software", "other"]),
  ownership: z.enum(["internal", "on_behalf", "client_managed"]).default("internal"),
  client_id: z.string().uuid().optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().max(3).default("KES"),
  billing_cycle: z.enum(["monthly", "yearly", "one_time"]),
  next_renewal_date: z.string().date(),
  last_paid_date: z.string().date().optional(),
  auto_renew: z.boolean().default(false),
  login_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(500).trim().optional(),
  active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = supabase
    .from("subscriptions")
    .select("*, clients(id, name, email, phone)")
    .is("deleted_at", null)
    .eq("active", true)
    .order("next_renewal_date");

  if (category && category !== "all") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = SubscriptionSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data: sub, error } = await supabase.from("subscriptions").insert(result.data).select("*, clients(id, name, email, phone)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create a repeating calendar event for the renewal date
  await supabase.from("calendar_events").insert({
    title: `${result.data.name} renewal`,
    type: "subscription_renewal",
    start_at: new Date(result.data.next_renewal_date).toISOString(),
    all_day: true,
    entity_type: "subscription",
    entity_id: sub.id as string,
    repeat_rule: result.data.billing_cycle === "monthly" ? "monthly" : result.data.billing_cycle === "yearly" ? "yearly" : null,
  });

  return NextResponse.json({ data: sub }, { status: 201 });
}
