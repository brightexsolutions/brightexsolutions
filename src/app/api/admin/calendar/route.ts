import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const EventSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(500).trim().optional(),
  type: z.enum(["project_milestone", "task_deadline", "social_post", "subscription_renewal", "booking", "reminder", "personal"]),
  start_at: z.string().datetime(),
  end_at: z.string().datetime().optional(),
  all_day: z.boolean().default(false),
  color: z.string().max(20).optional(),
  entity_type: z.string().max(50).optional(),
  entity_id: z.string().uuid().optional(),
  repeat_rule: z.enum(["monthly", "yearly"]).optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("calendar_events")
    .select("*")
    .order("start_at");

  if (from) query = query.gte("start_at", from);
  if (to) query = query.lte("start_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = EventSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from("calendar_events").insert(result.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
