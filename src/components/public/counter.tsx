"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface CounterProps {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

/**
 * Counts up when scrolled into view. The server HTML always carries the final
 * number, so search engines and no-JS visitors read "50+", never "0+".
 */
export function Counter({ to, suffix = "", prefix = "", duration = 1.5 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (!isInView || reduce) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      setValue(Math.floor((1 - Math.pow(1 - progress, 3)) * to));
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [isInView, to, duration, reduce]);

  return (
    <span ref={ref}>
      {prefix}{value}{suffix}
    </span>
  );
}
