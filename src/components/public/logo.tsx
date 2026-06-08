import { cn } from "@/lib/utils";

interface LogoProps {
  inverted?: boolean;
  className?: string;
}

export function Logo({ inverted = false, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* Mark */}
      <div className="w-8 h-8 rounded-[6px] bg-brand-gold flex items-center justify-center shrink-0">
        <span className="font-display font-bold text-brand-navy text-[1.1rem] leading-none">B</span>
      </div>
      {/* Wordmark */}
      <div className="leading-none">
        <div className={cn(
          "font-display font-bold text-[1.05rem] leading-none tracking-tight",
          inverted ? "text-white" : "text-brand-navy"
        )}>
          Brightex
        </div>
        <div className={cn(
          "text-[9px] font-semibold uppercase tracking-[0.2em] leading-none mt-[3px]",
          inverted ? "text-white/45" : "text-brand-muted"
        )}>
          Solutions
        </div>
      </div>
    </div>
  );
}
