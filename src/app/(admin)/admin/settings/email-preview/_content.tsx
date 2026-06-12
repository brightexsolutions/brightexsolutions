"use client";

import { useState } from "react";
import { ChevronDown, FileText, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type DocItem = {
  id: string;
  label: string;
  tag: string;
  description: string;
  src: string;
};

type TemplateItem = {
  id: string;
  label: string;
  tag: string;
  html: string;
};

const TAG_COLORS: Record<string, string> = {
  Finance:   "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Enquiries: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Bookings:  "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

// ─── Collapsible card wrapper ─────────────────────────────────────────────────

function PreviewCard({
  id,
  label,
  tag,
  children,
  defaultOpen = true,
}: {
  id: string;
  label: string;
  tag: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="flex-1 flex items-center gap-2.5 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">{label}</span>
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", TAG_COLORS[tag] ?? "")}>
            {tag}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Collapsible section group ────────────────────────────────────────────────

function SectionGroup({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 group"
      >
        <div className="w-8 h-8 rounded-md bg-brand-gold/10 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-brand-gold" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

export function EmailPreviewContent({
  documents,
  templates,
}: {
  documents: DocItem[];
  templates: TemplateItem[];
}) {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Email Templates &amp; Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live previews of every outbound email and PDF document Brightex sends to clients.
          Sample data is used throughout.
        </p>
      </div>

      {/* ── PDF Documents ── */}
      <SectionGroup
        icon={FileText}
        title="Documents"
        description="PDF files attached to emails or available for direct download."
      >
        {documents.map((d) => (
          <PreviewCard key={d.id} id={d.id} label={d.label} tag={d.tag}>
            <div className="bg-muted/20 px-4 py-2 border-b border-border">
              <p className="text-xs text-muted-foreground">{d.description}</p>
            </div>
            <div className="bg-muted/10">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">Document preview — {d.label}</span>
              </div>
              <iframe
                src={d.src}
                title={d.label}
                className="w-full border-0"
                style={{ height: "860px" }}
              />
            </div>
          </PreviewCard>
        ))}
      </SectionGroup>

      {/* ── Email Templates ── */}
      <SectionGroup
        icon={Mail}
        title="Email Templates"
        description="HTML emails sent directly to clients for invoices, bookings, enquiries, and more."
      >
        {templates.map((t) => (
          <PreviewCard key={t.id} id={t.id} label={t.label} tag={t.tag}>
            {/* Desktop preview */}
            <div>
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">Email preview — {t.label}</span>
              </div>
              <iframe
                srcDoc={t.html}
                title={t.label}
                className="w-full border-0"
                style={{ height: "640px" }}
                sandbox="allow-same-origin"
              />
            </div>

            {/* Mobile preview */}
            <MobilePreview html={t.html} label={t.label} />
          </PreviewCard>
        ))}
      </SectionGroup>
    </div>
  );
}

// ─── Mobile preview toggle ────────────────────────────────────────────────────

function MobilePreview({ html, label }: { html: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <span>📱 Mobile preview (375px)</span>
        <ChevronDown
          size={12}
          className={cn("ml-auto transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t border-border bg-muted/10 py-4 flex justify-center">
          <div className="border border-border rounded-xl overflow-hidden" style={{ width: 375 }}>
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/50">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs text-muted-foreground font-mono truncate">Mobile · 375px</span>
            </div>
            <iframe
              srcDoc={html}
              title={`${label} mobile`}
              className="w-full border-0"
              style={{ height: "640px" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
