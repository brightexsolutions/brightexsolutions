/**
 * AI availability monitoring — surfaces provider outages (bad model, expired
 * key, Gemini/Claude down, quota exhausted with no paid key) that would
 * otherwise degrade silently to the rule-based template fallback with no
 * visible trace. Every genuine failure is written to activity_log; the first
 * one in an outage also raises a deduped system_alerts row and emails the
 * business inbox — mirrors the existing site-health up/down pattern.
 *
 * App-side Gemini call-budget throttling (GeminiRateLimitedError) is
 * deliberately NOT routed through here — that's expected, self-imposed
 * throttling, not a provider outage, so it shouldn't page anyone.
 */
import { createAdminClient } from "@/lib/supabase/server";
import { logSystemAction } from "@/lib/audit";
import { transporter, ADMIN_EMAIL, SITE_NAME } from "@/lib/mail";

const ALERT_TYPE = "ai_unavailable";

export async function recordAiFailure(params: {
  route: string;
  intent?: string;
  provider: string;
  reason: string;
}): Promise<void> {
  try {
    const detail = `${params.route}${params.intent ? ` (${params.intent})` : ""}: ${params.reason}`;

    await logSystemAction({
      action: "ai_call_failed",
      entity_type: "ai",
      entity_label: params.provider,
      notes: detail,
    });

    const supabase = createAdminClient();
    const { count } = await supabase
      .from("system_alerts")
      .select("*", { count: "exact", head: true })
      .eq("type", ALERT_TYPE)
      .eq("acknowledged", false);

    // Only the first failure of an outage raises the alert + email —
    // every call after that just adds to activity_log until it recovers.
    if ((count ?? 0) > 0) return;

    await supabase.from("system_alerts").insert({
      type: ALERT_TYPE,
      severity: "warning",
      message: `AI (${params.provider}) is unavailable — falling back to templates. ${detail}`,
      entity_type: "ai",
    });

    await transporter.sendMail({
      to: ADMIN_EMAIL,
      subject: `⚠️ ${SITE_NAME} AI is unavailable`,
      text: `AI calls have started failing and the admin dashboard / Brixo chat are now serving rule-based templates instead of AI-generated content.\n\nProvider: ${params.provider}\nWhere: ${detail}\n\nThis alert won't repeat until AI recovers and fails again. Check Admin → Settings → AI, and Admin → Activity Log for details.`,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">
        <p><strong>AI calls have started failing.</strong> The admin dashboard and Brixo chat are now serving rule-based templates instead of AI-generated content.</p>
        <p><strong>Provider:</strong> ${params.provider}<br/>
        <strong>Where:</strong> ${detail}</p>
        <p>This alert won't repeat until AI recovers and fails again. Check Admin → Settings → AI, and Admin → Activity Log for details.</p>
      </div>`,
    }).catch(() => {
      // Email is best-effort — never let it break the request that triggered this
    });
  } catch {
    // Monitoring must never break the actual AI call it's observing
  }
}

export async function recordAiRecovery(): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: acknowledged } = await supabase
      .from("system_alerts")
      .update({ acknowledged: true })
      .eq("type", ALERT_TYPE)
      .eq("acknowledged", false)
      .select("id");

    if (acknowledged && acknowledged.length > 0) {
      await logSystemAction({
        action: "ai_call_recovered",
        entity_type: "ai",
        notes: "AI calls are succeeding again.",
      });
    }
  } catch {
    // Monitoring must never break the actual AI call it's observing
  }
}

/** Logs one real (non-template, non-rule-based) AI call for the AI Usage
 * dashboard — call volume, free vs paid tier split, token consumption.
 * Fire-and-forget: never let logging failures break the AI call it's
 * observing, and never await this from the calling code path. */
export async function logAiUsage(params: {
  feature: string;
  provider: string;
  model: string;
  isFreeTier: boolean;
  tokensIn: number;
  tokensOut: number;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("ai_usage_logs").insert({
      feature: params.feature,
      provider: params.provider,
      model: params.model,
      is_free_tier: params.isFreeTier,
      tokens_in: params.tokensIn,
      tokens_out: params.tokensOut,
    });
  } catch {
    // Never let usage logging break the actual AI call
  }
}
