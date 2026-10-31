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
}: StatCardProps) {
  // Merge legacy iconColor/iconBg into accent
  const resolvedAccent = accent ?? (iconColor || iconBg ? { text: iconColor ?? "text-brand-gold", bg: iconBg ?? "bg-brand-gold/10" } : undefined);
  const TrendIcon =
    trend?.direction === "up" ? TrendingUp :
    trend?.direction === "down" ? TrendingDown : Minus;

  const trendColorClass =
    trend?.direction === "up"
      ? featured ? "text-emerald-300" : "text-emerald-500 dark:text-emerald-400"
      : trend?.direction === "down"
      ? featured ? "text-red-300" : "text-red-500 dark:text-red-400"
      : featured ? "text-white/40" : "text-muted-foreground";

  const card = (
    <div
      className={cn(
        "rounded-2xl p-4 flex flex-col gap-2 transition-colors duration-200 select-none h-full",
        featured
          ? "bg-brand-navy dark:bg-[#1a3a62] text-white"
          : "bg-muted/60 hover:bg-muted",
        href && "cursor-pointer",
        className
      )}
    >
      {/* Row 1: title + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm font-medium", featured ? "text-white/70" : "text-muted-foreground")}>
          {title}
        </p>
        {Icon && (
          <div className={cn(
            "size-8 rounded-full flex items-center justify-center shrink-0",
            featured ? "bg-white/12" : (resolvedAccent?.bg ?? "bg-brand-gold/10")
          )}>
            <Icon size={15} className={featured ? "text-white/80" : (resolvedAccent?.text ?? "text-brand-gold")} />
          </div>
        )}
      </div>

      {/* Row 2: value */}
      <p className={cn(
        "font-semibold leading-none tracking-tight tabular-nums text-2xl sm:text-[1.75rem]",
        featured ? "text-white" : "text-foreground"
      )}>
        {value}
      </p>

      {/* Row 3: trend + sub */}
      <div className="flex items-center gap-2 flex-wrap min-h-4">
        {trend && (
          <span className={cn("flex items-center gap-1 text-xs font-semibold", trendColorClass)}>
            <TrendIcon size={12} />
            {trend.value}
          </span>
        )}
        {(trend?.label ?? sub) && (
          <span className={cn("text-xs", featured ? "text-white/40" : "text-muted-foreground")}>
            {trend?.label ?? sub}
          </span>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-ring">{card}</Link>;
  return card;
}
