import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const PatchSchema = z.object({
  status: z.enum(["new", "reviewed", "archived"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_intakes")
    .select("*")
    .eq("client_id", id)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // id here is the intake record id (passed via query param to disambiguate)
  const url = new URL(request.url);
  const intakeId = url.searchParams.get("intakeId");
  if (!intakeId) {
    return NextResponse.json({ error: "intakeId required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = PatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { ...result.data };
  if (result.data.status === "reviewed") {
    patch.reviewed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("client_intakes")
    .update(patch)
    .eq("id", intakeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
