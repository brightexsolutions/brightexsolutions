import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";

const steps = [
  {
    number: "01",
    title: "Discovery",
    description:
      "We start by understanding your business — goals, audience, constraints, and what success looks like. No assumptions.",
  },
  {
    number: "02",
    title: "Strategy & Design",
    description:
      "Architecture decisions, user flows, and visual design — all mapped out before a single line of code.",
  },
  {
    number: "03",
    title: "Build",
    description:
      "Iterative development with regular check-ins. You see progress every week, not just at the end.",
  },
  {
    number: "04",
    title: "Launch & Grow",
    description:
      "Deployment, handover, and post-launch support. We don't disappear after go-live.",
  },
];

export function ProcessSection() {
  return (
    <section className="py-24 bg-[--color-brand-bg] dark:bg-[--color-brand-navy]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="text-[--color-brand-gold] text-xs font-semibold tracking-widest uppercase">
            How We Work
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-[--color-brand-navy] dark:text-white mt-3 mb-4">
            A Process Built for Clarity
          </h2>
          <p className="text-[--color-brand-muted] text-lg max-w-xl mx-auto">
            From first call to launch, you always know what's happening and what's next.
          </p>
        </FadeIn>

        <FadeInStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" staggerDelay={0.1}>
          {steps.map((step, i) => (
            <StaggerChild key={step.number}>
              <div className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] right-0 h-px bg-[--color-brand-border] dark:bg-white/10" />
                )}
                <div className="font-display text-6xl font-bold text-[--color-brand-gold]/20 mb-4 leading-none">
                  {step.number}
                </div>
                <h3 className="font-semibold text-[--color-brand-navy] dark:text-white text-xl mb-3">
                  {step.title}
                </h3>
                <p className="text-[--color-brand-muted] text-sm leading-relaxed">
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
