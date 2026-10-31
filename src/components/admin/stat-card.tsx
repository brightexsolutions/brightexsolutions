import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardTrend {
  direction: "up" | "down" | "flat";
  value: string;   // e.g. "+5%" or "–3"
  label?: string;  // e.g. "this month"
}

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: StatCardTrend;
  sub?: string;
  icon?: LucideIcon;
  /** Navy background with white text: use for the primary/hero metric */
  featured?: boolean;
  /** Icon accent colours when not featured e.g. { bg: "bg-blue-400/10", text: "text-blue-400" } */
  accent?: { bg: string; text: string };
  /** @deprecated use accent.text */
  iconColor?: string;
  /** @deprecated use accent.bg */
  iconBg?: string;
  href?: string;
  className?: string;
  /** Shows a skeleton in place of the value while data loads, rather than a misleading 0 */
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  trend,
  sub,
  icon: Icon,
  featured = false,
  accent,
  iconColor,
  iconBg,
  href,
  className,
  loading = false,
}: StatCardProps) {
  // Merge legacy iconColor/iconBg into accent
  const resolvedAccent = accent ?? (iconColor || iconBg ? { text: iconColor ?? "text-brand-gold", bg: iconBg ?? "bg-brand-gold/10" } : undefined);
  const TrendIcon =
    trend?.direction === "up" ? TrendingUp :
    trend?.direction === "down" ? TrendingDown : Minus;

  const trendColorClass =
    trend?.direction === "up"
      ? featured ? "text-emerald-300" : "text-emerald-700 dark:text-emerald-400"
      : trend?.direction === "down"
      ? featured ? "text-red-300" : "text-red-600 dark:text-red-400"
      : featured ? "text-white/70" : "text-muted-foreground";

  const card = (
    <div
      className={cn(
        "group/stat relative overflow-hidden isolate rounded-2xl px-4 py-3.5 flex flex-col gap-1.5 transition-[background-color,box-shadow,translate] duration-200 select-none h-full",
        featured
          ? "bg-brand-navy dark:bg-[#1a3a62] text-white bg-[radial-gradient(120%_90%_at_100%_0%,rgba(249,168,37,0.22),transparent_60%)]"
          : "bg-gradient-to-br from-muted/80 to-muted/30 ring-1 ring-inset ring-border/60",
        href && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(21,34,56,0.35)]",
        href && "cursor-pointer",
        className
      )}
    >
      {/* Watermark: the card's icon, large and faint, for a bit of character */}
      {Icon && (
        <Icon
          aria-hidden
          size={72}
          strokeWidth={1.25}
          className={cn(
            "absolute -right-4 -bottom-5 -z-10 transition-transform duration-300 group-hover/stat:scale-110 group-hover/stat:-rotate-6",
            featured ? "text-white/[0.07]" : cn(resolvedAccent?.text ?? "text-brand-gold", "opacity-[0.07]")
          )}
        />
      )}

      {/* Row 1: title + icon */}
      <div className="flex items-start justify-between gap-2">
        <p title={title} className={cn("text-sm font-medium truncate min-w-0", featured ? "text-white/70" : "text-muted-foreground")}>
          {title}
        </p>
        {Icon && (
          <div className={cn(
            "size-7 rounded-full flex items-center justify-center shrink-0",
            featured ? "bg-white/12" : (resolvedAccent?.bg ?? "bg-brand-gold/10")
          )}>
            <Icon size={14} className={featured ? "text-white/80" : (resolvedAccent?.text ?? "text-brand-gold")} />
          </div>
        )}
      </div>

      {/* Row 2: value */}
      <p className={cn(
        "font-semibold leading-tight tracking-tight tabular-nums text-xl sm:text-2xl",
        featured ? "text-white" : "text-foreground"
      )}>
        {loading ? <span className={cn("skeleton-shimmer block h-7 w-24 rounded-lg", featured ? "bg-white/10" : "bg-muted")} aria-label="Loading" /> : value}
      </p>

      {/* Row 3: trend + sub, only when there is something to say */}
      {!loading && (trend || sub) && (
        <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap">
          {trend && (
            <span className={cn("flex items-center gap-1 text-xs font-semibold shrink-0", trendColorClass)}>
              <TrendIcon size={12} />
              {trend.value}
            </span>
          )}
          {(trend?.label ?? sub) && (
            <span className={cn("text-xs truncate", featured ? "text-white/70" : "text-muted-foreground")}>
              {trend?.label ?? sub}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href} className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-ring">{card}</Link>;
  return card;
}
