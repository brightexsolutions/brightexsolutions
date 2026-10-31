import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";
import { CheckCircle2 } from "lucide-react";

const reasons = [
  "We know the local stack: M-Pesa, KRA eTIMS, WhatsApp-first customers",
  "Strategy, design and engineering under one roof",
  "Fixed quotes and milestone payments, agreed before work starts",
  "You talk directly to the people building your system",
  "Support after launch, with no surprise retainer",
  "Your code, your domain, your data: you own all of it",
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
              A small senior team,
              <br />
              accountable for the result
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              We take on a limited number of projects at a time so the people
              who scope your work are the same people who build and support it.
            </p>
          </FadeIn>

          {/* Right: checklist */}
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
