/**
 * POST /api/admin/ai
 *
 * Multi-intent AI endpoint for the admin dashboard (admin-only, auth-gated).
 * All calls use Claude Haiku (cheapest model) by default.
 * Falls back to built-in default templates when AI is unavailable.
 *
 * Intents:
 *   draft_reply         → Draft a general client email
 *   draft_invoice_email → Email body to send with an invoice
 *   draft_reminder      → Overdue invoice payment reminder email
 *   draft_receipt_email → Payment received confirmation email
 *   draft_project_update→ Project status update to client
 *   classify_lead       → Score a lead 1–10 and explain why
 *   suggest_tasks       → Return a task list for a project brief
 *   write_caption       → Write social media captions for given platforms
 *   summarize           → Summarise a block of text / comms thread
 *   analyze_logs        → Analyse error logs / system alerts, summarise issues, suggest fixes
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { callAI, ADMIN_SYSTEM_PROMPT, AI_MODELS, isAIAvailable, GeminiRateLimitedError } from "@/lib/ai";
import { recordAiFailure, recordAiRecovery } from "@/lib/ai-monitor";
import type { AIProvider } from "@/types";

const AISchema = z.discriminatedUnion("intent", [
  z.object({
    intent:      z.literal("draft_reply"),
    clientName:  z.string().max(100).trim(),
    context:     z.string().max(2000).trim(),
    tone:        z.enum(["formal", "warm", "brief"]).default("warm"),
    subject:     z.string().max(200).trim().optional(),
  }),
  z.object({
    intent:          z.literal("draft_invoice_email"),
    clientName:      z.string().max(100).trim(),
    invoiceNumber:   z.string().max(50).trim(),
    total:           z.string().max(50).trim(),
    dueDate:         z.string().max(50).trim(),
    projectName:     z.string().max(200).trim().optional(),
  }),
  z.object({
    intent:          z.literal("draft_reminder"),
    clientName:      z.string().max(100).trim(),
    invoiceNumber:   z.string().max(50).trim(),
    total:           z.string().max(50).trim(),
    daysOverdue:     z.number().min(0),
    projectName:     z.string().max(200).trim().optional(),
  }),
  z.object({
    intent:          z.literal("draft_receipt_email"),
    clientName:      z.string().max(100).trim(),
    amount:          z.string().max(50).trim(),
    invoiceNumber:   z.string().max(50).trim().optional(),
    reference:       z.string().max(100).trim().optional(),
    projectName:     z.string().max(200).trim().optional(),
  }),
  z.object({
    intent:       z.literal("draft_project_update"),
    clientName:   z.string().max(100).trim(),
    projectName:  z.string().max(200).trim(),
    updateSummary: z.string().max(1000).trim(),
    nextSteps:    z.string().max(500).trim().optional(),
  }),
  z.object({
    intent:  z.literal("classify_lead"),
    name:    z.string().max(100).trim(),
    message: z.string().max(2000).trim(),
    service: z.string().max(100).trim().optional(),
    company: z.string().max(100).trim().optional(),
  }),
  z.object({
    intent:       z.literal("suggest_tasks"),
    projectName:  z.string().max(200).trim(),
    projectType:  z.string().max(100).trim().optional(),
    description:  z.string().max(1000).trim().optional(),
    budget:       z.number().optional(),
  }),
  z.object({
    intent:          z.literal("write_caption"),
    topic:           z.string().max(300).trim(),
    platforms:       z.array(z.string()).min(1).max(5),
    tone:            z.enum(["professional", "casual", "inspirational", "promotional"]).default("professional"),
    includeHashtags: z.boolean().default(true),
  }),
  z.object({
    intent: z.literal("summarize"),
    text:   z.string().max(4000).trim(),
    focus:  z.string().max(200).trim().optional(),
  }),
  z.object({
    intent:     z.literal("analyze_logs"),
    // Raw log paste (optional — if omitted, recent system_alerts are fetched from DB)
    logs:       z.string().max(8000).trim().optional(),
    // Number of recent system_alerts to include when no logs are pasted
    alertLimit: z.number().min(1).max(100).default(50),
  }),
]);

type AIPayload = z.infer<typeof AISchema>;

// ── Default fallback templates (used when AI is unavailable) ──────────────────

function defaultTemplate(payload: AIPayload): string | null {
  switch (payload.intent) {
    case "draft_invoice_email":
      return `Hi ${payload.clientName},

Please find attached invoice ${payload.invoiceNumber}${payload.projectName ? ` for ${payload.projectName}` : ""}.

Amount due: ${payload.total}
Due date: ${payload.dueDate}

Please process payment at your earliest convenience. If you have any questions about this invoice, don't hesitate to reach out.

Thank you for your business.

Warm regards,
Brightex Solutions Team
+254 741 980 127`;

    case "draft_reminder":
      return `Hi ${payload.clientName},

This is a friendly reminder that invoice ${payload.invoiceNumber}${payload.projectName ? ` for ${payload.projectName}` : ""} is ${payload.daysOverdue > 0 ? `${payload.daysOverdue} day${payload.daysOverdue === 1 ? "" : "s"} overdue` : "now due"}.

Outstanding amount: ${payload.total}

Please arrange payment at your earliest convenience. If there's an issue or you need to discuss payment terms, please reply to this email or reach me on WhatsApp.

Thank you,
Brightex Solutions Team
+254 741 980 127`;

    case "draft_receipt_email":
      return `Hi ${payload.clientName},

Thank you — we've received your payment of ${payload.amount}${payload.invoiceNumber ? ` for invoice ${payload.invoiceNumber}` : ""}${payload.projectName ? ` (${payload.projectName})` : ""}.${payload.reference ? `\n\nPayment reference: ${payload.reference}` : ""}

Your account is now up to date. We appreciate your promptness.

Warm regards,
Brightex Solutions Team`;

    case "draft_project_update":
      return `Hi ${payload.clientName},

Here's a quick update on ${payload.projectName}:

${payload.updateSummary}${payload.nextSteps ? `\n\nNext steps:\n${payload.nextSteps}` : ""}

As always, feel free to reach out if you have any questions or feedback.

Best,
Brightex Solutions Team`;

    default:
      return null;
  }
}

// ── AI prompts ────────────────────────────────────────────────────────────────

function buildPrompt(payload: AIPayload): { userPrompt: string; maxTokens: number } {
  switch (payload.intent) {
    case "draft_reply":
      return {
        maxTokens: 600,
        userPrompt: `Draft a professional email reply to a client named ${payload.clientName}.
Tone: ${payload.tone}${payload.subject ? `\nSubject line: ${payload.subject}` : ""}
Context / what to address:
${payload.context}

Write only the email body (no subject line, no "---" dividers). End with a professional sign-off from "The Brightex Team" or "The Brightex Solutions Team".`,
      };

    case "draft_invoice_email":
      return {
        maxTokens: 400,
        userPrompt: `Write a professional, warm email to send with an invoice to a client.

Client: ${payload.clientName}
Invoice number: ${payload.invoiceNumber}
Amount due: ${payload.total}
Due date: ${payload.dueDate}${payload.projectName ? `\nProject: ${payload.projectName}` : ""}

Write only the email body. Keep it warm, professional, and brief — 3–4 short paragraphs. Sign off as "The Brightex Solutions Team".`,
      };

    case "draft_reminder":
      return {
        maxTokens: 400,
        userPrompt: `Write a firm but professional payment reminder email.

Client: ${payload.clientName}
Invoice: ${payload.invoiceNumber}
Amount: ${payload.total}
Days overdue: ${payload.daysOverdue}${payload.projectName ? `\nProject: ${payload.projectName}` : ""}

Keep it respectful but clear. Express urgency without being aggressive. Offer to discuss if there's an issue. Sign off as "The Brightex Solutions Team".`,
      };

    case "draft_receipt_email":
      return {
        maxTokens: 350,
        userPrompt: `Write a warm payment confirmation / receipt email.

Client: ${payload.clientName}
Amount received: ${payload.amount}${payload.invoiceNumber ? `\nInvoice: ${payload.invoiceNumber}` : ""}${payload.reference ? `\nReference: ${payload.reference}` : ""}${payload.projectName ? `\nProject: ${payload.projectName}` : ""}

Thank the client sincerely, confirm the payment, and keep it brief and professional. Sign off as "The Brightex Solutions Team".`,
      };

    case "draft_project_update":
      return {
        maxTokens: 500,
        userPrompt: `Write a professional project status update email to a client.

Client: ${payload.clientName}
Project: ${payload.projectName}
Update summary: ${payload.updateSummary}${payload.nextSteps ? `\nNext steps: ${payload.nextSteps}` : ""}

Write only the email body. Keep it clear, progress-focused, and reassuring. Sign off as "The Brightex Solutions Team".`,
      };

    case "classify_lead":
      return {
        maxTokens: 200,
        userPrompt: `Classify this incoming lead for Brightex Solutions.

Name: ${payload.name}
${payload.company ? `Company: ${payload.company}` : ""}
${payload.service ? `Service interest: ${payload.service}` : ""}
Message: ${payload.message}

Respond in this exact JSON format:
{
  "score": <1-10>,
  "classification": "<hot|warm|cold>",
  "reason": "<one sentence explanation>",
  "suggestedNextStep": "<what Godwin should do next>"
}`,
      };

    case "suggest_tasks":
      return {
        maxTokens: 700,
        userPrompt: `Suggest a practical, ordered task list for this project.

Project: ${payload.projectName}
${payload.projectType ? `Type: ${payload.projectType}` : ""}
${payload.description ? `Description: ${payload.description}` : ""}
${payload.budget ? `Budget: KES ${payload.budget.toLocaleString()}` : ""}

Return a JSON array of task objects in order of execution:
[
  {
    "title": "<task title>",
    "description": "<1 sentence description>",
    "priority": "<high|normal|low>",
    "category": "<discovery|design|development|review|deployment|other>",
    "estimatedDays": <number>
  }
]
Include 6–12 tasks covering the full project lifecycle.`,
      };

    case "write_caption":
      return {
        maxTokens: 700,
        userPrompt: `You are a senior social media and marketing manager with 10+ years of experience running high-converting campaigns for service businesses. Write social media captions for Brightex Solutions on the following topic. The goal is business growth, not just announcing information: every caption should be written to drive engagement (comments, shares, saves) and move the reader toward becoming a lead — end with a clear, specific call to action (book a discovery call, send a DM, visit the site, comment with their biggest challenge, etc. — pick whichever fits the topic, never a generic "learn more"). Open with a hook in the first line that earns attention before anything else, since that's what stops the scroll.

Topic: ${payload.topic}
Platforms: ${payload.platforms.join(", ")}
Tone: ${payload.tone}
Include hashtags: ${payload.includeHashtags ? "yes" : "no"}

Write a separate caption for each platform, formatted as:
**[Platform]**
[caption text]
${payload.includeHashtags ? "[hashtags on their own line]" : ""}

Keep each caption platform-appropriate in length and style.

After all platform captions, add one final section:
**Visual idea**
[One concrete, practical suggestion for what image or carousel to create/use for this post — e.g. "Before/after screenshot of the new homepage" or "3-slide carousel: hero shot, mobile view, client logo". Suggest something Brightex likely already has (project screenshots, brand assets) rather than requiring a new photoshoot, unless the topic clearly calls for one.]`,
      };

    case "summarize":
      return {
        maxTokens: 300,
        userPrompt: `Summarise the following text concisely.
${payload.focus ? `Focus on: ${payload.focus}` : ""}

Text to summarise:
${payload.text}

Write a clear, structured summary in 3–6 bullet points.`,
      };

    case "analyze_logs":
      return {
        maxTokens: 1200,
        userPrompt: `You are a senior full-stack engineer reviewing error logs and system alerts for Brightex Solutions — a Next.js + Supabase web application.

Analyse the following logs/alerts and return your findings as JSON in this exact shape:
{
  "summary": "<1–2 sentence overview of what is happening>",
  "issues": [
    {
      "severity": "critical|warning|info",
      "title": "<short issue title>",
      "description": "<what is happening and why>",
      "suggestedFix": "<concrete actionable fix — file paths, code snippets, or config changes if relevant>",
      "affectedArea": "<route, module, or service name>"
    }
  ],
  "overallHealth": "healthy|degraded|critical",
  "topPriority": "<the single most important thing to fix first>"
}

${payload.logs ? `LOGS / ALERTS:\n${payload.logs}` : "No raw logs provided — analyse the system_alerts data above."}`,
      };
  }
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "ai_admin");
  if (limited) return limited;

  // Auth check — admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const result = AISchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const payload = result.data;

  // ── Read AI settings from DB ──────────────────────────────────────────────
  const adminSupabase = createAdminClient();
  const { data: settingsRows } = await adminSupabase
    .from("settings")
    .select("key, value")
    .in("key", ["ai_enabled", "ai_provider", "ai_model"]);

  const settingsMap: Record<string, string> = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );

  const aiEnabled = settingsMap.ai_enabled !== "false"; // default on
  const aiProvider: AIProvider = (settingsMap.ai_provider as AIProvider) ?? "anthropic";
  const aiModel: string = settingsMap.ai_model ?? AI_MODELS.haiku;

  // If AI is disabled by admin or provider not configured, use template fallback
  if (!aiEnabled || !isAIAvailable(aiProvider)) {
    const fallback = defaultTemplate(payload);
    if (fallback) {
      return NextResponse.json({ result: fallback, intent: payload.intent, source: "template" });
    }
    const reason = !aiEnabled
      ? "AI is disabled. Enable it in Admin → Settings → AI."
      : `${aiProvider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"} is not configured.`;
    return NextResponse.json({ error: reason }, { status: 503 });
  }

  // ── analyze_logs: augment prompt with recent system_alerts if no raw log pasted
  let { userPrompt, maxTokens } = buildPrompt(payload);

  if (payload.intent === "analyze_logs" && !payload.logs) {
    const { data: alerts } = await adminSupabase
      .from("system_alerts")
      .select("type, severity, message, entity_type, acknowledged, created_at")
      .order("created_at", { ascending: false })
      .limit(payload.alertLimit);

    const alertText = (alerts ?? []).length > 0
      ? (alerts ?? []).map((a: { type: string; severity: string; message: string; entity_type: string | null; acknowledged: boolean; created_at: string }) =>
          `[${a.created_at}] ${a.severity.toUpperCase()} ${a.type}${a.entity_type ? ` (${a.entity_type})` : ""}: ${a.message}${a.acknowledged ? " [acknowledged]" : " [unresolved]"}`
        ).join("\n")
      : "No system_alerts found in the database.";

    // Re-build the prompt now that we have the alert data
    userPrompt = userPrompt.replace(
      "No raw logs provided — analyse the system_alerts data above.",
      `SYSTEM ALERTS (last ${(alerts ?? []).length}):\n${alertText}`
    );
  }

  try {
    const text = await callAI({
      messages:  [{ role: "user", content: userPrompt }],
      system:    ADMIN_SYSTEM_PROMPT,
      model:     aiModel,
      maxTokens,
      provider:  aiProvider,
      feature:   `admin_ai:${payload.intent}`,
    });

    void recordAiRecovery();

    const jsonIntents = ["classify_lead", "suggest_tasks", "analyze_logs"] as string[];
    if (jsonIntents.includes(payload.intent)) {
      try {
        const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
        const parsed = JSON.parse(clean);
        return NextResponse.json({ result: parsed, intent: payload.intent });
      } catch {
        return NextResponse.json({ result: text, intent: payload.intent, raw: true });
      }
    }

    return NextResponse.json({ result: text, intent: payload.intent });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Admin AI call failed", {
      route: "/api/admin/ai",
      intent: payload.intent,
      userId: user.id,
      error: errorMessage,
    });

    // A GeminiRateLimitedError is expected, self-imposed throttling to
    // protect the call budget — not a provider outage, so it doesn't page.
    if (!(err instanceof GeminiRateLimitedError)) {
      void recordAiFailure({
        route: "/api/admin/ai",
        intent: payload.intent,
        provider: aiProvider,
        reason: errorMessage,
      });
    }

    // Fall back to template on AI failure — never leave the admin stranded
    const fallback = defaultTemplate(payload);
    if (fallback) {
      return NextResponse.json({ result: fallback, intent: payload.intent, source: "template" });
    }

    return NextResponse.json(
      { error: "AI request failed. Please try again." },
      { status: 500 }
    );
  }
}
