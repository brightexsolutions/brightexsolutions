/**
 * POST /api/admin/assistant-chat
 *
 * The FAB "chat with your dashboard" assistant. Grounded in the same
 * candidate data as /api/admin/suggested-actions plus a few headline
 * business stats — answers "how are we doing" / "what needs my attention"
 * style questions. AI-first, deterministic rule-based fallback when AI is
 * unavailable so the assistant is never just an error message.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { callAI, AI_MODELS, isAIAvailable, GeminiRateLimitedError } from "@/lib/ai";
import { recordAiFailure, recordAiRecovery } from "@/lib/ai-monitor";
import { getActionCandidates } from "@/lib/ops-candidates";
import type { AIProvider } from "@/types";

const MessageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) });
const ChatSchema = z.object({
  message: z.string().min(1).max(1000).trim(),
  history: z.array(MessageSchema).max(12).optional(),
});

const ASSISTANT_SYSTEM_PROMPT = `You are Godwin's AI co-pilot inside the Brightex Solutions admin dashboard — a teammate, not a generic chatbot. You have live access to the business's real operational data (given below in each message). Answer questions about how the business is doing and what needs attention, grounded ONLY in the data provided — never invent figures, clients, or invoices not listed. Be direct and concise (2-5 sentences unless a list is clearly better). When something needs action, name it specifically (not "some invoices need attention" — name the client/invoice). If asked something outside this data, say so plainly rather than guessing.`;

async function buildSnapshot(supabase: ReturnType<typeof createAdminClient>) {
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonthStart = now.getMonth() === 11
    ? `${now.getFullYear() + 1}-01-01`
    : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

  const [candidates, revenueRes, clientsRes, pendingRes] = await Promise.all([
    getActionCandidates(supabase),
    supabase.from("payments").select("amount").gte("date", thisMonthStart).lt("date", nextMonthStart).is("deleted_at", null),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("classification", "active"),
    supabase.from("pending_ai_actions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const revenueThisMonth = (revenueRes.data ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);

  return { candidates, revenueThisMonth, activeClients: clientsRes.count ?? 0, pendingApprovals: pendingRes.count ?? 0 };
}

function snapshotText(snap: Awaited<ReturnType<typeof buildSnapshot>>): string {
  const lines = [
    `Revenue this month (payments received): KES ${snap.revenueThisMonth.toLocaleString()}`,
    `Active clients: ${snap.activeClients}`,
    `AI-drafted actions awaiting your approval: ${snap.pendingApprovals}`,
    snap.candidates.length === 0
      ? "Nothing flagged across invoices, leads, tasks, clients, projects, or alerts."
      : `${snap.candidates.length} item(s) flagged:`,
    ...snap.candidates.map((c) => `- [${c.type}] ${c.title} — ${c.detail}`),
  ];
  return lines.join("\n");
}

function ruleBasedReply(snap: Awaited<ReturnType<typeof buildSnapshot>>): string {
  const top = snap.candidates.slice(0, 3);
  const parts = [
    `Revenue this month: KES ${snap.revenueThisMonth.toLocaleString()}. ${snap.activeClients} active clients.`,
    snap.pendingApprovals > 0 ? `You have ${snap.pendingApprovals} AI-drafted action${snap.pendingApprovals === 1 ? "" : "s"} waiting for your approval.` : "",
    top.length
      ? `Top things flagged: ${top.map((c) => c.title).join("; ")}.`
      : "Nothing urgent flagged right now.",
  ];
  return parts.filter(Boolean).join(" ");
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "ai_admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = ChatSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createAdminClient();
  const snapshot = await buildSnapshot(supabase);

  const { data: settingsRows } = await supabase.from("settings").select("key, value").in("key", ["ai_enabled", "ai_provider", "ai_model"]);
  const settingsMap: Record<string, string> = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const aiEnabled = settingsMap.ai_enabled !== "false";
  const aiProvider: AIProvider = (settingsMap.ai_provider as AIProvider) ?? "anthropic";
  const aiModel: string = settingsMap.ai_model ?? AI_MODELS.haiku;

  if (!aiEnabled || !isAIAvailable(aiProvider)) {
    return NextResponse.json({ reply: ruleBasedReply(snapshot), source: "rule-based" });
  }

  const messages = [
    ...(result.data.history ?? []),
    { role: "user" as const, content: `LIVE DASHBOARD DATA:\n${snapshotText(snapshot)}\n\nQuestion: ${result.data.message}` },
  ];

  try {
    const text = await callAI({ messages, system: ASSISTANT_SYSTEM_PROMPT, model: aiModel, maxTokens: 500, provider: aiProvider, feature: "assistant_chat" });
    void recordAiRecovery();
    return NextResponse.json({ reply: text, source: "ai" });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (!(err instanceof GeminiRateLimitedError)) {
      void recordAiFailure({ route: "/api/admin/assistant-chat", provider: aiProvider, reason: errorMessage });
    }
    return NextResponse.json({ reply: ruleBasedReply(snapshot), source: "rule-based" });
  }
}
