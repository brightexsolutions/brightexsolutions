import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const ClientSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(200).trim().optional().or(z.literal("")),
  phone: z.string().max(50).trim().optional(),
  company: z.string().max(200).trim().optional(),
  classification: z.enum(["lead", "qualified", "unqualified", "ghost", "active", "past"]).default("lead"),
  source: z.enum(["contact_form", "referral", "social", "direct", "other"]).optional(),
  notes: z.string().max(2000).trim().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classification = searchParams.get("classification");

  let query = supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (classification && classification !== "all") {
    query = query.eq("classification", classification);
  }

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
  const result = ClientSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from("clients").insert(result.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
