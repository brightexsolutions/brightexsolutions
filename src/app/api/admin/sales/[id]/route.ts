import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const UpdateSaleSchema = z.object({
  client_id: z.string().uuid().optional(),
  service: z.string().max(200).trim().optional(),
  estimated_value: z.number().min(0).optional(),
  status: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]).optional(),
  notes: z.string().max(2000).trim().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = UpdateSaleSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from("sales").update(result.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If status moved to "won", auto-create project and update client classification
  if (result.data.status === "won" && data.client_id) {
    await supabase.from("clients").update({ classification: "active" }).eq("id", data.client_id);
    await supabase.from("projects").insert({
      client_id: data.client_id,
      name: data.service ?? "New Project",
      status: "discovery",
      budget: data.estimated_value,
    });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
