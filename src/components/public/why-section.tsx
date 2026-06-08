import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";
import { CheckCircle2 } from "lucide-react";

const reasons = [
  "Context-aware — we understand the Kenyan and East African market",
  "Full-stack team: design, development, and strategy in one place",
  "Transparent pricing and milestone-based delivery",
  "We build for growth — not just for launch day",
  "Direct communication with the people doing the work",
  "Post-launch support without hidden retainer fees",
];

export function WhySection() {
  return (
    <section className="py-24 bg-brand-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <FadeIn direction="left">
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">
              Why Brightex
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3 mb-6 leading-tight">
              Built for Businesses
              <br />
              That Mean Business
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              We're not a factory. We're a focused team of builders who care
              about the outcome — not just the deliverable. Every project we
              take on, we take seriously.
            </p>
          </FadeIn>

          {/* Right — checklist */}
          <FadeInStagger className="space-y-4" staggerDelay={0.08}>
            {reasons.map((r) => (
              <StaggerChild key={r}>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    className="text-brand-gold flex-shrink-0 mt-0.5"
                  />
                  <span className="text-white/80 text-sm leading-relaxed">
                    {r}
                  </span>
                </div>
              </StaggerChild>
            ))}
          </FadeInStagger>
        </div>
      </div>
    </section>
  );
}
