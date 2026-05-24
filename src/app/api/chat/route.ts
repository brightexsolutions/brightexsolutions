import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const ChatSchema = z.object({
  message: z.string().min(1).max(500).trim(),
  visitorId: z.string().max(64).optional(),
});

// Fallback FAQs used when DB is not yet connected
const FALLBACK_FAQS = [
  {
    keywords: ["service", "what do you do", "offer", "build"],
    answer:
      "We offer Web Development, UI/UX Design, SEO & Growth, Branding, AI & Automation, ERP Systems, and Technology Consultancy. Visit /services to see the full breakdown.",
  },
  {
    keywords: ["product", "erp", "software", "school", "hospital"],
    answer:
      "We build licensable software products for industries like education, healthcare, and hospitality. Visit /products to see what's available.",
  },
  {
    keywords: ["price", "cost", "quote", "how much", "pricing"],
    answer:
      "Pricing depends on the scope of your project. We work on milestone-based fixed quotes. Get in touch via the contact page and we'll send a detailed proposal within 24 hours.",
  },
  {
    keywords: ["contact", "reach", "talk", "call", "phone", "whatsapp"],
    answer:
      "You can reach us at +254 741 980 127 (WhatsApp/phone) or email info.brightexsolutions@gmail.com. You can also book a call at /book.",
  },
  {
    keywords: ["location", "where", "nairobi", "kenya", "africa"],
    answer:
      "We're based in Nairobi, Kenya, and work with clients across East Africa and globally.",
  },
  {
    keywords: ["timeline", "how long", "duration", "how quickly"],
    answer:
      "Timelines vary — a standard marketing site typically takes 2–4 weeks, a web app 6–12 weeks, and an ERP 8–16 weeks. We'll give you a specific estimate after the discovery call.",
  },
  {
    keywords: ["book", "schedule", "meeting", "demo", "appointment"],
    answer:
      "You can book a call directly at /book — pick a time that works for you and we'll confirm within a few hours.",
  },
];

function matchFaq(message: string): string | null {
  const lower = message.toLowerCase();
  for (const faq of FALLBACK_FAQS) {
    if (faq.keywords.some((k) => lower.includes(k))) {
      return faq.answer;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "chat");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = ChatSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { message } = result.data;

  // Try DB FAQs first if Supabase is connected
  let answer: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data } = await supabase
        .from("chat_faqs")
        .select("answer, keywords")
        .eq("active", true);

      if (data?.length) {
        const lower = message.toLowerCase();
        const matched = data.find((faq: { answer: string; keywords: string[] }) =>
          faq.keywords?.some((k: string) => lower.includes(k.toLowerCase()))
        );
        if (matched) answer = matched.answer;
      }
    } catch {
      // Fall through to fallback FAQs
    }
  }

  if (!answer) {
    answer = matchFaq(message);
  }

  return NextResponse.json({
    answer,
    escalate: !answer,
  });
}
