import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { NextRequest, NextResponse } from "next/server";

const limiters = {
  contact:    new RateLimiterMemory({ points: 5,   duration: 60 }),
  newsletter: new RateLimiterMemory({ points: 3,   duration: 60 }),
  book:     new RateLimiterMemory({ points: 5,   duration: 60 }),
  chat:     new RateLimiterMemory({ points: 30,  duration: 60 }),
  join:     new RateLimiterMemory({ points: 5,   duration: 60 }),
  trial:    new RateLimiterMemory({ points: 3,   duration: 60 }),
  admin:    new RateLimiterMemory({ points: 120, duration: 60 }),
  team:     new RateLimiterMemory({ points: 60,  duration: 60 }),
  public:   new RateLimiterMemory({ points: 60,  duration: 60 }),
  // AI-specific limits — tighter to control API spend
  ai_chat:  new RateLimiterMemory({ points: 15,  duration: 60 }), // public Brixo AI
  ai_admin: new RateLimiterMemory({ points: 20,  duration: 60 }), // admin AI tools
};

type LimiterKey = keyof typeof limiters;

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1"
  );
}

export async function rateLimit(
  request: NextRequest,
  limiter: LimiterKey = "public"
): Promise<NextResponse | null> {
  const ip = getIp(request);
  try {
    await limiters[limiter].consume(ip);
    return null; // allowed
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(err.msBeforeNext / 1000)),
          },
        }
      );
    }
    throw err;
  }
}

// ─── Gemini call budget ────────────────────────────────────────────────────
// Protects the shared Gemini API quota/credit across every caller (admin
// dashboard tools + the public Brixo widget draw from one key/pool) — layered
// on top of the per-route IP limiters above, which guard against abuse rather
// than total spend. Same three-window strategy as the Stride app.
const geminiPerMinute = new RateLimiterMemory({ points: 10, duration: 60 });
const geminiPerHour   = new RateLimiterMemory({ points: 50, duration: 60 * 60 });
const geminiPerDay    = new RateLimiterMemory({ points: 200, duration: 60 * 60 * 24 });

export interface GeminiRateLimitResult {
  allowed: boolean;
  window?: "minute" | "hour" | "day";
}

export async function consumeGeminiCall(): Promise<GeminiRateLimitResult> {
  const key = "gemini"; // single shared bucket — one API key/quota for the whole app
  try {
    await geminiPerMinute.consume(key);
  } catch {
    return { allowed: false, window: "minute" };
  }
  try {
    await geminiPerHour.consume(key);
  } catch {
    return { allowed: false, window: "hour" };
  }
  try {
    await geminiPerDay.consume(key);
  } catch {
    return { allowed: false, window: "day" };
  }
  return { allowed: true };
}

export interface GeminiBudgetStatus {
  minute: { used: number; limit: number };
  hour: { used: number; limit: number };
  day: { used: number; limit: number };
}

/** Read-only — does not consume a point. For the AI Usage dashboard. */
export async function getGeminiBudgetStatus(): Promise<GeminiBudgetStatus> {
  const key = "gemini";
  const [minuteRes, hourRes, dayRes] = await Promise.all([
    geminiPerMinute.get(key),
    geminiPerHour.get(key),
    geminiPerDay.get(key),
  ]);
  return {
    minute: { used: minuteRes?.consumedPoints ?? 0, limit: 10 },
    hour: { used: hourRes?.consumedPoints ?? 0, limit: 50 },
    day: { used: dayRes?.consumedPoints ?? 0, limit: 200 },
  };
}
