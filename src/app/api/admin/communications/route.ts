import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const CommSchema = z.object({
  client_id: z.string().uuid().optional(),
  type: z.enum(["email", "whatsapp", "call", "meeting"]),
  subject: z.string().max(200).trim().optional(),
  body: z.string().max(5000).trim().optional(),
  direction: z.enum(["out", "in"]).default("out"),
  sent_at: z.string().datetime().optional(),
  status: z.string().max(50).trim().default("sent"),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const client_id = searchParams.get("client_id");

  let query = supabase
    .from("communications")
    .select("*, clients(id, name, company)")
    .order("sent_at", { ascending: false });

  if (type && type !== "all") query = query.eq("type", type);
  if (client_id) query = query.eq("client_id", client_id);

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
  const result = CommSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("communications")
    .insert({ ...result.data, sent_at: result.data.sent_at ?? new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update last_contacted_at on the client
  if (result.data.client_id) {
    await supabase.from("clients").update({ last_contacted_at: new Date().toISOString() }).eq("id", result.data.client_id);
  }

  return NextResponse.json({ data }, { status: 201 });
}
