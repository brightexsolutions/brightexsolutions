import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const RateEntrySchema = z.object({
  monthly_rate: z.number().min(0),
  effective_from: z.string().date(),
  notes: z.string().max(500).trim().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("consultancy_rate_history")
    .select("*")
    .eq("project_id", id)
    .order("effective_from", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: projectId } = await params;
  const body = await request.json().catch(() => ({}));
  const result = RateEntrySchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  // Insert rate history entry and update project's current monthly_rate
  const [historyRes, projectRes] = await Promise.all([
    supabase
      .from("consultancy_rate_history")
      .insert({ project_id: projectId, ...result.data })
      .select()
      .single(),
    supabase
      .from("projects")
      .update({ monthly_rate: result.data.monthly_rate })
      .eq("id", projectId),
  ]);

  if (historyRes.error) return NextResponse.json({ error: historyRes.error.message }, { status: 500 });
  if (projectRes.error) return NextResponse.json({ error: projectRes.error.message }, { status: 500 });

  return NextResponse.json({ data: historyRes.data }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: projectId } = await params;
  const { entry_id } = await request.json().catch(() => ({}));
  if (!entry_id) return NextResponse.json({ error: "entry_id required" }, { status: 400 });

  const { error } = await supabase
    .from("consultancy_rate_history")
    .delete()
    .eq("id", entry_id)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
