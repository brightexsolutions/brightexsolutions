import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const escalated = searchParams.get("escalated");

  let query = supabase
    .from("chat_sessions")
    .select("id, visitor_id, escalated, escalation_type, started_at, ended_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (escalated === "true") query = query.eq("escalated", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
