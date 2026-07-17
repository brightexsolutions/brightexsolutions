"use client";

import { useState } from "react";
import { ExternalLink, Download, Send, X, Loader2, Eye, EyeOff } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DocumentRefinePanel, type DocumentRefineTarget } from "@/components/admin/document-refine-panel";

export interface DocumentViewerTarget {
  title: string;
  subtitle?: string | null;
  client?: string | null;
  date?: string | null;
  viewUrl: string;
  /** true for the rich HTML documents (proposal/agreement/SOP) — "Download"
   * opens the page with ?print=1 (triggers the browser's own print-to-PDF)
   * instead of using the `download` attribute, which would just save the
   * raw .html file. */
  isHtmlDocument?: boolean;
  /** When present (AI-generated proposal/agreement/SOP only), shows the
   * "Ask AI" / "Edit Manually" refine panel below the preview. */
  refine?: Omit<DocumentRefineTarget, "onUpdated"> & { onUpdated?: (newData: Record<string, unknown>) => void };
  /** When present, shows an "Email to Client" button in the footer. */
  onEmailClient?: () => void;
  /** When present, shows a "Summary only" / "Full document" toggle — flips
   * the `gated` flag the public link checks (see /api/public/documents/[id]). */
  gating?: { documentId: string; gated: boolean };
}

function GatingToggle({ gating }: { gating: { documentId: string; gated: boolean } }) {
  const [gated, setGated] = useState(gating.gated);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !gated;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/documents/${gating.documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gated: next }),
      });
      if (res.ok) setGated(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-sm border border-border bg-muted/20 text-xs disabled:opacity-60"
    >
      <span className="flex items-center gap-1.5 text-foreground font-medium">
        {busy ? <Loader2 size={12} className="animate-spin" /> : gated ? <EyeOff size={12} /> : <Eye size={12} />}
        {gated ? "Client sees a summary only" : "Client sees the full document"}
      </span>
      <span className="text-primary font-semibold">{gated ? "Show full document" : "Show summary only"}</span>
    </button>
  );
}

export function DocumentViewerSheet({ doc, onClose }: { doc: DocumentViewerTarget | null; onClose: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Sheet open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden p-0" side="right">
        {doc && (
          <>
            <div className="px-5 py-4 border-b border-border bg-muted/30 shrink-0 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="font-display text-base font-bold text-foreground truncate">{doc.title}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[doc.subtitle, doc.client, doc.date ? new Date(doc.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button onClick={onClose} className="shrink-0 w-7 h-7 rounded-sm hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 min-h-[240px] bg-muted/20 overflow-hidden">
              <iframe key={refreshKey} src={doc.viewUrl} title={doc.title} className="w-full h-full border-0" />
            </div>

            {doc.refine && (
              <DocumentRefinePanel
                target={{
                  ...doc.refine,
                  onUpdated: (newData) => {
                    doc.refine?.onUpdated?.(newData);
                    setRefreshKey((k) => k + 1);
                  },
                }}
              />
            )}

            {doc.gating && (
              <div className="px-5 pt-3 shrink-0">
                <GatingToggle key={doc.gating.documentId} gating={doc.gating} />
              </div>
            )}

            <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
              <a
                href={doc.viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-sm border border-input text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={13} />Open
              </a>
              <a
                href={doc.isHtmlDocument ? `${doc.viewUrl}?print=1` : doc.viewUrl}
                {...(doc.isHtmlDocument ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
                className="flex-1 py-2 rounded-sm border border-input text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={13} />{doc.isHtmlDocument ? "Save PDF" : "Download"}
              </a>
              {doc.onEmailClient && (
                <button
                  type="button"
                  onClick={doc.onEmailClient}
                  className="flex-1 py-2 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send size={13} />Email to Client
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
