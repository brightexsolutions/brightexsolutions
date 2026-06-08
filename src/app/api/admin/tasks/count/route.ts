import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ active: 0, total: 0 });

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("tasks")
    .select("status")
    .is("deleted_at", null);

  const rows = data ?? [];
  const total = rows.length;
  const active = rows.filter((r) => r.status !== "done").length;

  return NextResponse.json({ active, total });
}
