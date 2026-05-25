import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const ProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  slug: z.string().min(1).max(100).trim().regex(/^[a-z0-9-]+$/),
  tagline: z.string().max(200).trim().optional(),
  description: z.string().max(3000).trim().optional(),
  category: z.enum(["erp", "crm", "booking", "analytics", "hospitality", "other"]),
  features: z.array(z.object({
    title: z.string().max(100).trim(),
    description: z.string().max(300).trim(),
    icon: z.string().max(50).trim().optional(),
  })).default([]),
  screenshots: z.array(z.string().url()).default([]),
  demo_url: z.string().url().optional().or(z.literal("")),
  trial_days: z.number().int().min(1).max(30).default(7),
  pricing_tiers: z.array(z.object({
    name: z.string(),
    price_monthly: z.number().min(0),
    price_yearly: z.number().min(0),
    currency: z.string().default("KES"),
    features: z.array(z.string()),
  })).default([]),
  target_industries: z.array(z.string().max(80)).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type") ?? "products";

  if (type === "trials") {
    let q = supabase
      .from("product_trials")
      .select("*, products(id, name, slug)")
      .order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (type === "subscriptions") {
    const { data, error } = await supabase
      .from("product_subscriptions")
      .select("*, products(id, name), clients(id, name)")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  let q = supabase.from("products").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
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
  const result = ProductSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from("products").insert(result.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
