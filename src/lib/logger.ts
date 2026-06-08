/**
 * Structured application logger.
 *
 * Development: readable coloured output.
 * Production:  single-line JSON — machine-parseable by Vercel Log Drains,
 *              Datadog, Axiom, or any log aggregator.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("Contact saved", { route: "/api/contact", userId: user.id });
 *   logger.error("DB insert failed", { route, error: err.message });
 */

type Level = "debug" | "info" | "warn" | "error";

export interface LogContext {
  route?: string;
  rid?: string;      // request ID — pass from withRoute()
  userId?: string;
  error?: string;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === "production";

const DEV_COLOURS: Record<Level, string> = {
  debug: "\x1b[36m",  // cyan
  info:  "\x1b[32m",  // green
  warn:  "\x1b[33m",  // yellow
  error: "\x1b[31m",  // red
};
const RESET = "\x1b[0m";

function emit(level: Level, msg: string, ctx?: LogContext): void {
  if (IS_PROD) {
    const entry = JSON.stringify({
      ts:    new Date().toISOString(),
      level,
      msg,
      ...ctx,
    });
    if (level === "error") console.error(entry);
    else if (level === "warn")  console.warn(entry);
    else                        console.log(entry);
  } else {
    const colour = DEV_COLOURS[level];
    const tag    = `${colour}[${level.toUpperCase().padEnd(5)}]${RESET}`;
    const route  = ctx?.route ? ` ${ctx.route}` : "";
    const extra  = ctx?.error ? ` — ${ctx.error}` : "";
    const fn     = level === "error" ? console.error
                 : level === "warn"  ? console.warn
                 : console.log;
    fn(`${tag}${route} ${msg}${extra}`);
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit("debug", msg, ctx),
  info:  (msg: string, ctx?: LogContext) => emit("info",  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => emit("warn",  msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit("error", msg, ctx),
};
