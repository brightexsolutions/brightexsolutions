/**
 * Route handler wrapper — applied to every API route handler.
 *
 * Provides:
 *   1. Request ID generation (rid) attached to every log line
 *   2. Catches ApiError → sanitised JSON response (no DB internals leaked)
 *   3. Catches unexpected errors → logs full stack, returns generic 500
 *   4. Timing log for slow requests (> 3 s) in production
 *
 * Usage:
 *   export const GET = withRoute(async (req) => {
 *     // throw Errors.unauthorized() instead of returning NextResponse 401
 *     return NextResponse.json({ data });
 *   });
 */

import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "./api-error";
import { logger } from "./logger";

type Ctx = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, ctx: Ctx) => Promise<NextResponse>;

const SLOW_THRESHOLD_MS = 3_000;

export function withRoute(handler: Handler, routeLabel?: string): Handler {
  return async (req: NextRequest, ctx: Ctx) => {
    const rid   = crypto.randomUUID().slice(0, 8);
    const route = routeLabel ?? req.nextUrl.pathname;
    const start = Date.now();

    try {
      const res = await handler(req, ctx);
      const ms  = Date.now() - start;
      if (ms > SLOW_THRESHOLD_MS) {
        logger.warn("Slow route response", { rid, route, ms });
      }
      return res;
    } catch (err) {
      const ms = Date.now() - start;

      if (err instanceof ApiError) {
        if (err.status >= 500) {
          logger.error(err.message, { rid, route, ms, code: err.code });
        }
        return NextResponse.json(
          { error: err.message, ...(err.code ? { code: err.code } : {}) },
          { status: err.status },
        );
      }

      // Unknown / unexpected error — sanitise before responding
      logger.error("Unhandled route error", {
        rid,
        route,
        ms,
        error: err instanceof Error ? err.message : String(err),
        // Stack only in dev to avoid leaking implementation details
        ...(process.env.NODE_ENV !== "production" && err instanceof Error
          ? { stack: err.stack }
          : {}),
      });

      return NextResponse.json(
        { error: "An unexpected error occurred", code: "INTERNAL" },
        { status: 500 },
      );
    }
  };
}
