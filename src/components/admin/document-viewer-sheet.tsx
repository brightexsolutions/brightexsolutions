"use client";

/**
 * Document viewer.
 *
 * The document is the point of this screen, so it gets the space. Previously
 * the refine panel, the gating toggle and the action bar were all stacked
 * permanently below the preview, which left the document itself squeezed into
 * a strip too short to read a section in. Tools are now collapsed by default
 * behind a single bar and expand only when asked for.
 *
 * The sheet is also wider than it was: a proposal is laid out for a page, and
 * previewing one in a narrow column shows the phone layout rather than the
 * document a client will actually open.
 */

import { useState } from "react";
import {
  ExternalLink, Download, Send, X, Loader2, Eye, EyeOff,
  ChevronDown, SlidersHorizontal, CheckCircle2, MessageSquareWarning, Maximize2, Minimize2, Pencil,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DocumentRefinePanel, type DocumentRefineTarget } from "@/components/admin/document-refine-panel";

export interface DocumentViewerTarget {
  title: string;
  subtitle?: string | null;
  client?: string | null;
  date?: string | null;
  viewUrl: string;
  /** true for the rich HTML documents (proposal/agreement/SOP): "Download"
   * opens the page with ?print=1 (triggers the browser's own print-to-PDF)
   * instead of using the `download` attribute, which would just save the
   * raw .html file. */
  isHtmlDocument?: boolean;
  /** When present (AI-generated proposal/agreement/SOP only), shows the
   * "Ask AI" / "Edit Manually" refine panel in the tools drawer. */
  refine?: Omit<DocumentRefineTarget, "onUpdated"> & { onUpdated?: (newData: Record<string, unknown>) => void };
  /** When present, shows an "Email to Client" button in the footer. */
  onEmailClient?: () => void;
  /** When present, shows a "Summary only" / "Full document" toggle: flips
   * the `gated` flag the public link checks (see /api/public/documents/[id]). */
  gating?: { documentId: string; gated: boolean };
  /** Lifecycle, shown as a badge so the state of the document is legible
   * without cross-referencing the list behind the sheet. */
  acceptedAt?: string | null;
  acceptedByName?: string | null;
  changesRequestedAt?: string | null;
  changesRequestedBy?: string | null;
  changesRequestedNote?: string | null;
  /** Present for section-based, unaccepted documents: links to the editor. */
  editHref?: string | null;
}

function GatingToggle({
  gating, onChange,
}: {
  gating: { documentId: string; gated: boolean };
  onChange: (gated: boolean) => void;
}) {
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
      if (res.ok) { setGated(next); onChange(next); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border border-border bg-muted/20 text-xs disabled:opacity-60"
    >
      <span className="flex items-center gap-1.5 text-foreground font-medium">
        {busy ? <Loader2 size={12} className="animate-spin" /> : gated ? <EyeOff size={12} /> : <Eye size={12} />}
        {gated ? "Client sees a summary only" : "Client sees the full document"}
      </span>
      <span className="text-primary font-semibold">{gated ? "Show full document" : "Show summary only"}</span>
    </button>
  );
}

function StatusBadge({ doc }: { doc: DocumentViewerTarget }) {
  if (doc.acceptedAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-400/10 text-emerald-600 shrink-0">
        <CheckCircle2 size={10} />
        {doc.acceptedByName ? `Accepted by ${doc.acceptedByName.split(" ")[0]}` : "Accepted"}
      </span>
    );
  }
  if (doc.changesRequestedAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-400/10 text-amber-600 shrink-0">
        <MessageSquareWarning size={10} />Changes requested
      </span>
    );
  }
  return null;
}

export function DocumentViewerSheet({ doc, onClose }: { doc: DocumentViewerTarget | null; onClose: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [wide, setWide] = useState(false);
  // Preview the gated teaser exactly as a client would see it. Worth having
  // next to the gating toggle: turning a gate on without seeing its result is
  // how a document gets sent showing more, or less, than intended.
  const [asClient, setAsClient] = useState(false);

  const hasTools = !!(doc?.refine || doc?.gating);
  const src = asClient ? `${doc?.viewUrl}${doc?.viewUrl.includes("?") ? "&" : "?"}preview=client` : doc?.viewUrl;

  return (
    <Sheet open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        className={`w-full flex flex-col overflow-hidden p-0 ${wide ? "sm:max-w-[min(1200px,95vw)]" : "sm:max-w-3xl"}`}
        side="right"
      >
        {doc && (
          <>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="px-5 py-3.5 border-b border-border bg-muted/30 shrink-0 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <SheetTitle className="font-display text-base font-bold text-foreground truncate">{doc.title}</SheetTitle>
                  <StatusBadge doc={doc} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[doc.subtitle, doc.client, doc.date ? new Date(doc.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setWide((w) => !w)}
                  title={wide ? "Narrow the panel" : "Widen the panel"}
                  className="hidden sm:flex w-7 h-7 rounded hover:bg-muted items-center justify-center text-muted-foreground transition-colors"
                >
                  {wide ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
                <button onClick={onClose} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Client's own words, when they asked for changes. This is the
                single most useful sentence in the exchange and it belongs
                against the document, not buried in an alert. */}
            {doc.changesRequestedNote && (
              <div className="px-5 py-3 border-b border-border bg-amber-400/5 shrink-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-1">
                  Changes requested{doc.changesRequestedBy ? ` by ${doc.changesRequestedBy}` : ""}
                </p>
                <p className="text-xs text-foreground leading-relaxed line-clamp-4">{doc.changesRequestedNote}</p>
              </div>
            )}

            {/* ── The document, given the space ──────────────────────────── */}
            <div className="flex-1 min-h-0 bg-muted/20 overflow-hidden relative">
              <iframe key={`${refreshKey}-${asClient}`} src={src} title={doc.title} className="w-full h-full border-0" />
              {asClient && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-brand-navy/90 text-white text-[10px] font-semibold tracking-wide shadow-lg">
                  Previewing as the client sees it
                </div>
              )}
            </div>

            {/* ── Tools, collapsed by default ────────────────────────────── */}
            {hasTools && (
              <div className="shrink-0 border-t border-border">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setToolsOpen((o) => !o)}
                    className="flex-1 px-5 py-2.5 flex items-center gap-2 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <SlidersHorizontal size={13} className="text-muted-foreground" />
                    Edit &amp; sharing
                    <ChevronDown size={13} className={`text-muted-foreground transition-transform ${toolsOpen ? "" : "-rotate-90"}`} />
                  </button>

                  {doc.gating && (
                    <button
                      type="button"
                      onClick={() => setAsClient((v) => !v)}
                      className={`px-4 py-2.5 text-xs font-medium transition-colors border-l border-border ${
                        asClient ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {asClient ? "Back to my view" : "View as client"}
                    </button>
                  )}
                </div>

                {toolsOpen && (
                  <div className="max-h-[45vh] overflow-y-auto border-t border-border">
                    {doc.gating && (
                      <div className="px-5 pt-3">
                        <GatingToggle
                          key={doc.gating.documentId}
                          gating={doc.gating}
                          onChange={() => setRefreshKey((k) => k + 1)}
                        />
                      </div>
                    )}
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
                  </div>
                )}
              </div>
            )}

            {/* ── Actions ────────────────────────────────────────────────── */}
            <div className="px-5 py-3 border-t border-border shrink-0 flex flex-wrap gap-2">
              <a
                href={doc.viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[110px] py-2 rounded border border-input text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={13} />Open
              </a>
              <a
                href={doc.isHtmlDocument ? `${doc.viewUrl}?print=1` : doc.viewUrl}
                {...(doc.isHtmlDocument ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
                className="flex-1 min-w-[110px] py-2 rounded border border-input text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={13} />{doc.isHtmlDocument ? "Save PDF" : "Download"}
              </a>
              {doc.editHref && (
                <a
                  href={doc.editHref}
                  className="flex-1 min-w-[110px] py-2 rounded border border-input text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                >
                  <Pencil size={13} />Edit
                </a>
              )}
              {doc.onEmailClient && (
                <button
                  type="button"
                  onClick={doc.onEmailClient}
                  className="flex-1 min-w-[140px] py-2 rounded bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors flex items-center justify-center gap-1.5"
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
