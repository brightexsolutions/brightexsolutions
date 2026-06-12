import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const SettingsSchema = z.object({
  business_name: z.string().min(1).max(200).trim(),
  tagline: z.string().max(300).trim().optional(),
  address: z.string().max(300).trim().optional(),
  email: z.string().email().max(200).trim(),
  phone: z.string().max(50).trim().optional(),
  whatsapp: z.string().max(20).trim().optional(),
  booking_url: z.string().max(300).trim().optional(),
  instagram: z.string().max(100).trim().optional(),
  facebook: z.string().max(100).trim().optional(),
  linkedin: z.string().max(100).trim().optional(),
  youtube: z.string().max(100).trim().optional(),
  tiktok: z.string().max(100).trim().optional(),
  google_tag: z.string().max(50).trim().optional(),
  // Logo assets
  logo_dark_url: z.string().max(500).trim().optional(),
  logo_light_url: z.string().max(500).trim().optional(),
  logo_dark_placements: z.string().max(500).trim().optional(),
  logo_light_placements: z.string().max(500).trim().optional(),
  // Invoice payment details
  invoice_mpesa_number: z.string().max(20).trim().optional(),
  invoice_mpesa_name: z.string().max(100).trim().optional(),
  invoice_till_number: z.string().max(20).trim().optional(),
  invoice_till_name: z.string().max(100).trim().optional(),
  invoice_paypal_email: z.string().max(200).trim().optional(),
  invoice_bank_name: z.string().max(100).trim().optional(),
  invoice_bank_account_name: z.string().max(100).trim().optional(),
  invoice_bank_account_number: z.string().max(50).trim().optional(),
  invoice_bank_branch: z.string().max(100).trim().optional(),
  invoice_footer_note: z.string().max(500).trim().optional(),
  // AI settings
  ai_enabled:  z.string().max(10).trim().optional(),
  ai_provider: z.string().max(20).trim().optional(),
  ai_model:    z.string().max(100).trim().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Convert rows to a flat object
  const settings = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return NextResponse.json({ data: settings });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = SettingsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  // Upsert each setting as a key/value row
  const rows = Object.entries(result.data)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({ key, value: value ?? "" }));

  const { error } = await supabase
    .from("settings")
    .upsert(rows, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
