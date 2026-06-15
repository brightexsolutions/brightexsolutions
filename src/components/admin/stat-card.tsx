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
  /** Navy background with white text — use for the primary/hero metric */
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
        "rounded-xl border p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 transition-all duration-200 select-none h-full",
        featured
          ? "bg-brand-navy dark:bg-[#1a3a62] border-transparent text-white shadow-[0_8px_32px_-8px_rgba(21,34,56,0.40)] dark:shadow-[0_8px_32px_-8px_rgba(26,58,98,0.50)]"
          : "bg-card border-border hover:border-brand-gold/30 hover:shadow-md",
        href && "cursor-pointer",
        className
      )}
    >
      {/* Row 1: title + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em]", featured ? "text-white/50" : "text-muted-foreground")}>
          {title}
        </p>
        {Icon && (
          <div className={cn(
            "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0",
            featured ? "bg-white/12" : (resolvedAccent?.bg ?? "bg-brand-gold/10")
          )}>
            <Icon size={13} className={featured ? "text-white/80" : (resolvedAccent?.text ?? "text-brand-gold")} />
          </div>
        )}
      </div>

      {/* Row 2: value */}
      <p className={cn(
        "font-display font-bold leading-none tracking-tight",
        featured ? "text-white text-[1.45rem] sm:text-[2rem]" : "text-foreground text-[1.35rem] sm:text-[1.85rem]"
      )}>
        {value}
      </p>

      {/* Row 3: trend + sub */}
      <div className="flex items-center gap-2 flex-wrap">
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

  if (href) return <Link href={href} className="block h-full">{card}</Link>;
  return card;
}
