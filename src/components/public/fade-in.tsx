import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll reveal without hiding content from crawlers.
 *
 * The server HTML is always fully visible. The hidden starting state only
 * applies once <RevealObserver /> has marked <html data-reveal-ready>, so
 * Google, no-JS visitors and slow devices never see blank sections. Styles
 * live in globals.css under [data-reveal].
 */

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
}

export function FadeIn({ children, className, delay = 0, direction = "up" }: FadeInProps) {
  return (
    <div
      className={className}
      data-reveal={direction}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

export function FadeInStagger({
  children,
  className,
  staggerDelay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  viewportMargin?: string;
}) {
  return (
    <div
      className={className}
      data-reveal-stagger=""
      style={{ "--reveal-step": `${staggerDelay}s` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function StaggerChild({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(className)} data-reveal-child="">{children}</div>;
}
