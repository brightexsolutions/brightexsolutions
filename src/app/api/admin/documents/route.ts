import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const clientId = searchParams.get("client_id");

  let query = supabase
    .from("generated_documents")
    .select("*, clients(id, name, company)")
    .order("created_at", { ascending: false });

  if (type && type !== "all") query = query.eq("type", type);
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
