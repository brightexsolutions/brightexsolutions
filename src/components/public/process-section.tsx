import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";
import { PROCESS_STAGES } from "@/lib/brightex-sop";

// Sourced from PROCESS_STAGES (src/lib/brightex-sop.ts) — the same four
// stages back the internal Standard Operating Procedure, so what's promised
// here is exactly what the team actually follows, not a separate claim.
const steps = PROCESS_STAGES.map((s) => ({ number: s.number, title: s.title, description: s.clientDescription }));

export function ProcessSection() {
  return (
    <section className="py-24 dark:bg-brand-navy" style={{ background: "linear-gradient(160deg, #f4f6f8 0%, #ece8e0 55%, #f5f1ec 100%)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">
            How We Work
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy dark:text-white mt-3 mb-4">
            A Process Built for Clarity
          </h2>
          <p className="text-brand-muted text-lg max-w-xl mx-auto">
            From first call to launch, you always know what&apos;s happening and what&apos;s next.
          </p>
        </FadeIn>

        <FadeInStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" staggerDelay={0.1}>
          {steps.map((step, i) => (
            <StaggerChild key={step.number}>
              <div className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] right-0 h-px bg-brand-border dark:bg-white/10" />
                )}
                <div className="font-display text-6xl font-bold text-brand-gold/20 mb-4 leading-none">
                  {step.number}
                </div>
                <h3 className="font-semibold text-brand-navy dark:text-white text-xl mb-3">
                  {step.title}
                </h3>
                <p className="text-brand-muted text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </StaggerChild>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
