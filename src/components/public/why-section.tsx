import Image from "next/image";
import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";
import { CheckCircle2 } from "lucide-react";

const reasons = [
  "We understand the Kenyan and East African market",
  "Full-stack team: design, development, and strategy in one place",
  "Transparent pricing and milestone-based delivery",
  "We build for growth, not just for launch day",
  "Direct communication with the people doing the work",
  "Post-launch support without hidden retainer fees",
];

export function WhySection() {
  return (
    <section className="relative py-24 bg-brand-navy overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_15%_60%,rgba(249,168,37,0.14),transparent_70%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-16 items-center">
          {/* Visual: cut-out portrait on a gold arch */}
          <FadeIn direction="left" className="relative hidden lg:block">
            <div className="relative mx-auto w-[420px] h-[470px]">
              <div aria-hidden className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[420px] rounded-t-full bg-gradient-to-b from-brand-gold to-brand-gold-hover" />
              <div aria-hidden className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[460px] h-[460px] rounded-t-full border border-white/10" />
              <Image
                src="/images/people/why-portrait.webp"
                alt="A professional holding a laptop"
                width={933}
                height={1100}
                sizes="400px"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[440px] w-auto"
                // Soft fade at the bottom so the cut-out never ends on a hard edge
                style={{ maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)" }}
              />
              <div className="absolute bottom-10 -right-6 rounded-2xl bg-white px-4 py-3 shadow-xl">
                <p className="text-sm font-semibold text-brand-navy leading-tight">One team, start to finish</p>
                <p className="text-xs text-brand-muted">Strategy, design, build, support</p>
              </div>
            </div>
          </FadeIn>

          <div>
            <FadeIn>
              <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">
                Why Brightex
              </span>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3 mb-6 leading-tight">
                Built for Businesses
                <br />
                That Mean Business
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-xl">
                We&apos;re not a factory. We&apos;re a focused team of builders who care
                about the outcome, not just the deliverable. Every project we
                take on, we take seriously.
              </p>
            </FadeIn>

            <FadeInStagger className="grid sm:grid-cols-2 gap-3" staggerDelay={0.06}>
              {reasons.map((r) => (
                <StaggerChild key={r}>
                  <div className="flex items-start gap-3 h-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
                    <CheckCircle2 size={18} className="text-brand-gold flex-shrink-0 mt-0.5" />
                    <span className="text-white/85 text-sm leading-relaxed">{r}</span>
                  </div>
                </StaggerChild>
              ))}
            </FadeInStagger>
          </div>
        </div>
      </div>
    </section>
  );
}
