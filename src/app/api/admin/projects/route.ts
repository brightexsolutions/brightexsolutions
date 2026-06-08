import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const ProjectSchema = z.object({
  client_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200).trim(),
  type: z.string().max(80).trim().optional(),
  status: z.enum(["discovery", "design", "development", "review", "live", "paused", "completed"]).default("discovery"),
  budget: z.number().min(0).optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  is_retainer: z.boolean().optional(),
  retainer_cycle: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  monthly_rate: z.number().min(0).optional(),
  notes: z.string().max(2000).trim().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("projects")
    .select("*, clients(id, name, company)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

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
  const result = ProjectSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from("projects").insert(result.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
