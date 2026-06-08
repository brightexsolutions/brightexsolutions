import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const ExternalMemberSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim().optional(),
  phone: z.string().max(20).trim().optional(),
  role: z.enum(["subcontractor", "marketing", "finance", "support"]),
  skill_tags: z.array(z.string()).optional(),
  rate_type: z.enum(["fixed", "hourly"]).optional(),
  default_rate: z.number().min(0).optional(),
  notes: z.string().max(500).trim().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  let query = supabase
    .from("team_members")
    .select("id, name, email, phone, role, skill_tags, rate_type, default_rate, notes, active, permissions, user_id, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (role) query = query.eq("role", role);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST — create an external team member (no portal login)
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = ExternalMemberSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      ...result.data,
      user_id: null, // no portal login — external contractor
      active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created",
    entity_type: "team",
    entity_id: data.id,
    entity_label: `${result.data.name} (external ${result.data.role})`,
    notes: "External contractor — no portal access",
  });

  return NextResponse.json({ data }, { status: 201 });
}
