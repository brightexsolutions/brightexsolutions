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
