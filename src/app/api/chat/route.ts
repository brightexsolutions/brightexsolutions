import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { BUSINESS_PHONE, BUSINESS_EMAIL } from "@/lib/constants";
import { logger } from "@/lib/logger";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(1000),
});

const ChatSchema = z.object({
  message:   z.string().min(1).max(500).trim(),
  visitorId: z.string().max(64).optional(),
  history:   z.array(MessageSchema).max(10).optional(), // last N messages for AI context
});

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

  // ── 2. AI fallback (Claude Haiku) ─────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    const aiLimited = await rateLimit(request, "ai_chat");
    if (aiLimited) {
      // Rate limited on AI — fall back gracefully instead of 429
      return NextResponse.json({
        answer: null,
        escalate: true,
        escalateReason: "rate_limited",
      });
    }

    try {
      const { callAI, brixoSystemPrompt, AI_MODELS } = await import("@/lib/ai");
      const faqs = dbFaqs.length ? dbFaqs : FALLBACK_FAQS;

      const messages = [
        ...history,
        { role: "user" as const, content: message },
      ];

      const aiAnswer = await callAI({
        messages,
        system:    brixoSystemPrompt(faqs),
        model:     AI_MODELS.haiku,
        maxTokens: 350,
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
