import Image from "next/image";
import { SHOWCASE_CLIENTS } from "@/lib/client-showcase";
import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";

function ClientLogo({ name, logo, mark }: { name: string; logo: string; mark?: boolean }) {
  if (mark) {
    return (
      <span className="flex items-center gap-3">
        <Image src={logo} alt="" width={40} height={40} className="h-10 w-10 rounded-md object-contain" />
        <span className="text-sm font-semibold text-brand-navy leading-tight">{name}</span>
      </span>
    );
  }
  return <Image src={logo} alt={name} width={160} height={56} className="h-12 w-auto max-w-[160px] object-contain" style={{ width: "auto" }} />;
}

/** Logo wall of partners and clients. Server component: no JS shipped. */
export function ClientsSection({ compact = false }: { compact?: boolean }) {
  const partners = SHOWCASE_CLIENTS.filter((c) => c.partner);
  const clients = SHOWCASE_CLIENTS.filter((c) => !c.partner);

  return (
    <section aria-labelledby="clients-heading" className={compact ? "py-16 bg-white" : "py-20 bg-white border-y border-brand-border"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="max-w-2xl mb-10">
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">Partners and clients</span>
          <h2 id="clients-heading" className="font-display text-3xl sm:text-4xl font-bold text-brand-navy mt-3">
            Kenyan businesses that run on what we built
          </h2>
        </FadeIn>

        <div className="grid gap-4 lg:grid-cols-2 mb-4">
          {partners.map((p) => (
            <FadeIn key={p.key}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener"
                className="logo-wall-item group flex items-center justify-between gap-6 h-full rounded-2xl border border-brand-border bg-brand-bg/60 px-6 py-6 hover:border-brand-gold/60 hover:bg-white transition-colors"
              >
                <ClientLogo name={p.name} logo={p.logo} mark={p.mark} />
                <span className="text-right">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-gold">Partner</span>
                  <span className="block text-sm text-brand-muted">{p.sector}</span>
                </span>
              </a>
            </FadeIn>
          ))}
        </div>

        <FadeInStagger className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {clients.map((c) => (
            <StaggerChild key={c.key}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener"
                title={`${c.name}: ${c.sector}`}
                className="logo-wall-item flex items-center justify-center h-24 rounded-2xl border border-brand-border px-4 hover:border-brand-gold/60 transition-colors"
              >
                <ClientLogo name={c.name} logo={c.logo} mark={c.mark} />
              </a>
            </StaggerChild>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
