import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { BUSINESS_PHONE, BUSINESS_EMAIL } from "@/lib/constants";
import { logger } from "@/lib/logger";
import type { AIProvider } from "@/types";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(1000),
});

const ChatSchema = z.object({
  message:   z.string().min(1).max(500).trim(),
  visitorId: z.string().max(64).optional(),
  history:   z.array(MessageSchema).max(10).optional(), // last N messages for AI context
});

// Greeting keywords — answered instantly without AI or DB
const GREETING_KEYWORDS = [
  "hello", "hi", "hey", "hiya", "howdy",
  "good morning", "good afternoon", "good evening", "good day",
  "jambo", "habari", "niaje", "sasa", "mambo", "vipi", "salama",
  "sup", "what's up", "whats up",
];

function isGreeting(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return GREETING_KEYWORDS.some((g) => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!") || lower.startsWith(g + ","));
}

// Hardcoded fallback FAQs — used when DB is not connected
const FALLBACK_FAQS = [
  { keywords: ["service", "what do you do", "offer", "build"],
    question: "What services does Brightex offer?",
    answer: "We offer Web Development, UI/UX Design, SEO & Growth, Branding, AI & Automation, ERP Systems, and Technology Consultancy. Visit our services page to see the full breakdown." },
  { keywords: ["product", "erp", "software", "school", "hospital"],
    question: "Do you have pre-built software products?",
    answer: "Yes — we build licensable software for industries like education, healthcare, and hospitality. Visit our products page to see what's available." },
  { keywords: ["price", "cost", "quote", "how much", "pricing"],
    question: "How much does a project cost?",
    answer: "Pricing is tailored to each project's scope and requirements — we don't publish fixed rates. Get in touch via the contact page and we'll send a detailed proposal within 24 hours." },
  { keywords: ["contact", "reach", "talk", "call", "phone", "whatsapp"],
    question: "How do I reach Brightex?",
    answer: `You can reach us at ${BUSINESS_PHONE} (WhatsApp/phone) or email ${BUSINESS_EMAIL}. You can also book a call directly from the website.` },
  { keywords: ["location", "where", "nairobi", "kenya", "africa"],
    question: "Where is Brightex based?",
    answer: "We're based in Nairobi, Kenya, and work with clients across East Africa and globally." },
  { keywords: ["timeline", "how long", "duration", "how quickly"],
    question: "How long does a project take?",
    answer: "Timelines vary — a marketing site typically takes 2–4 weeks, a web app 6–12 weeks, and an ERP 8–16 weeks. We'll give you a specific estimate after the discovery call." },
  { keywords: ["book", "schedule", "meeting", "demo", "appointment"],
    question: "How do I book a call?",
    answer: "You can book a discovery call directly from our booking page — pick a time that works for you and we'll confirm within a few hours." },
];

function keywordMatch(message: string, faqs: Array<{ keywords?: string[]; answer: string }>): string | null {
  const lower = message.toLowerCase();
  for (const faq of faqs) {
    if (faq.keywords?.some((k) => lower.includes(k))) return faq.answer;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "chat");
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const result = ChatSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { message, history = [] } = result.data;

  // ── 0. Greeting fast path — no AI or DB needed ────────────────────────────
  if (isGreeting(message) && history.length === 0) {
    return NextResponse.json({
      answer: "Hi there! 👋 I'm Brixo, the Brightex assistant. How can I help you today?",
      escalate: false,
      source: "greeting",
    });
  }

  // ── 1. Try DB FAQs (keyword match) ───────────────────────────────────────
  let answer: string | null = null;
  let dbFaqs: Array<{ question?: string; answer: string; keywords?: string[] }> = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("chat_faqs")
        .select("answer, keywords, question")
        .eq("active", true);

      if (data?.length) {
        dbFaqs = data;
        answer = keywordMatch(message, data);
      }
    } catch {
      // Fall through
    }
  }

  if (!answer) answer = keywordMatch(message, FALLBACK_FAQS);

  if (answer) return NextResponse.json({ answer, escalate: false, source: "faq" });

  // ── 2. AI fallback — respects admin provider setting ─────────────────────
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini    = !!process.env.GEMINI_API_KEY;

  if (hasAnthropic || hasGemini) {
    const aiLimited = await rateLimit(request, "ai_chat");
    if (aiLimited) {
      return NextResponse.json({
        answer: null,
        escalate: true,
        escalateReason: "rate_limited",
      });
    }

    try {
      const { callAI, brixoSystemPrompt, isAIAvailable, AI_MODELS } = await import("@/lib/ai");
      const faqs = dbFaqs.length ? dbFaqs : FALLBACK_FAQS;

      // Read admin-configured provider from DB; fall back to whichever key exists
      let provider: AIProvider = hasAnthropic ? "anthropic" : "gemini";
      let model: string = hasAnthropic ? AI_MODELS.haiku : AI_MODELS.gemini_flash;

      try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const supabase = createAdminClient();
        const { data: rows } = await supabase
          .from("settings")
          .select("key, value")
          .in("key", ["ai_provider", "ai_model", "ai_enabled"]);
        const s: Record<string, string> = Object.fromEntries(
          (rows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
        );
        if (s.ai_enabled === "false") throw new Error("AI disabled");
        if (s.ai_provider && isAIAvailable(s.ai_provider as AIProvider)) {
          provider = s.ai_provider as AIProvider;
          model    = s.ai_model ?? model;
        }
      } catch {
        // Use key-based defaults — settings read is best-effort
      }

      const messages = [
        ...history,
        { role: "user" as const, content: message },
      ];

      const aiAnswer = await callAI({
        messages,
        system:    brixoSystemPrompt(faqs),
        model,
        maxTokens: 350,
        provider,
      });

      return NextResponse.json({ answer: aiAnswer, escalate: false, source: "ai" });
    } catch (err) {
      logger.error("Brixo AI call failed", {
        route: "/api/chat",
        error: err instanceof Error ? err.message : String(err),
      });
      // Fall through to escalate
    }
  }

  // ── 3. No match + no AI — suggest WhatsApp ────────────────────────────────
  return NextResponse.json({ answer: null, escalate: true, source: "no_match" });
}
