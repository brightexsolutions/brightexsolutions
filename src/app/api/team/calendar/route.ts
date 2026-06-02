import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// Event types each role is allowed to see
const ROLE_TYPES: Record<string, string[]> = {
  subcontractor: ["task_deadline", "booking"],
  marketing: ["social_post"],
  finance: ["subscription_renewal"],
};

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Resolve role from team_members
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Team member record not found" }, { status: 403 });

  const allowedTypes = ROLE_TYPES[member.role];
  if (!allowedTypes) return NextResponse.json({ error: "Role has no calendar access" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("calendar_events")
    .select("id, title, description, type, start_at, end_at, all_day")
    .in("type", allowedTypes)
    .order("start_at");

  if (from) query = query.gte("start_at", from);
  if (to) query = query.lte("start_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, role: member.role });
}
