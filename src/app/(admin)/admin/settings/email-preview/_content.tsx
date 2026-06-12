"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Mail, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type PreviewItem =
  | (DocItem      & { kind: "doc";   group: string })
  | (TemplateItem & { kind: "email"; group: string });

// ─── Constants ────────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  Finance:   "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Enquiries: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Bookings:  "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Sales:     "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

// ─── Preview panel ────────────────────────────────────────────────────────────

function PreviewPanel({
  item,
  index,
  total,
  onPrev,
  onNext,
}: {
  item: PreviewItem;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div className="flex flex-col h-full">
      {/* Navigation bar */}
      <div className="flex items-center gap-2 px-1 py-3 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
          Prev
        </button>

        <span className="flex-1 text-center text-xs text-muted-foreground tabular-nums">
          {index + 1} / {total}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={index === total - 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/40 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-muted-foreground font-mono truncate">
          Preview — {item.label}
        </span>
        {item.kind === "doc" && (
          <a
            href={item.src}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* Iframe */}
      <div className="flex-1 overflow-hidden">
        {item.kind === "doc" ? (
          <iframe
            key={item.id}
            src={item.src}
            title={item.label}
            className="w-full h-full border-0"
          />
        ) : (
          <iframe
            key={item.id}
            srcDoc={item.html}
            title={item.label}
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        )}
      </div>
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
  const allItems: PreviewItem[] = [
    ...documents.map((d) => ({ ...d, kind: "doc"   as const, group: "Documents"       })),
    ...templates.map((t) => ({ ...t, kind: "email" as const, group: "Email Templates" })),
  ];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  function openItem(index: number) {
    setSelectedIndex(index);
    setOpen(true);
  }

  const groups: { label: string; icon: React.ElementType; items: PreviewItem[] }[] = [
    {
      label: "Documents",
      icon: FileText,
      items: allItems.filter((i) => i.group === "Documents"),
    },
    {
      label: "Email Templates",
      icon: Mail,
      items: allItems.filter((i) => i.group === "Email Templates"),
    },
  ];

  const selectedItem = selectedIndex !== null ? allItems[selectedIndex] : null;

  return (
    <>
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Email Templates &amp; Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Click any template or document to preview it. Use the arrows inside the panel to navigate.
          </p>
        </div>

        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            {/* Group header */}
            <div className="flex items-center gap-2.5 px-1 mb-2">
              <group.icon size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </span>
            </div>

            {/* Item list */}
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {group.items.map((item) => {
                const globalIndex = allItems.indexOf(item);
                const isActive = selectedIndex === globalIndex && open;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openItem(globalIndex)}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors group",
                      isActive
                        ? "bg-brand-gold/8 border-l-2 border-l-brand-gold"
                        : "hover:bg-muted border-l-2 border-l-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors",
                      isActive
                        ? "bg-brand-gold text-brand-navy"
                        : "bg-muted text-muted-foreground group-hover:bg-brand-gold/10 group-hover:text-brand-gold"
                    )}>
                      {item.kind === "doc" ? <FileText size={14} /> : <Mail size={14} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        isActive ? "text-foreground" : "text-foreground/80"
                      )}>
                        {item.label}
                      </p>
                      {item.kind === "doc" && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
                      TAG_COLORS[item.tag] ?? ""
                    )}>
                      {item.tag}
                    </span>

                    <ChevronRight
                      size={14}
                      className={cn(
                        "shrink-0 transition-colors",
                        isActive
                          ? "text-brand-gold"
                          : "text-muted-foreground/40 group-hover:text-muted-foreground"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Preview sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={true}
          className="w-full sm:max-w-2xl p-0 flex flex-col gap-0"
        >
          {selectedItem && (
            <>
              <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2.5 pr-8">
                  <SheetTitle className="text-base font-semibold">
                    {selectedItem.label}
                  </SheetTitle>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    TAG_COLORS[selectedItem.tag] ?? ""
                  )}>
                    {selectedItem.tag}
                  </span>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-hidden px-5 pb-5 pt-2">
                <div className="h-full border border-border rounded-xl overflow-hidden flex flex-col">
                  <PreviewPanel
                    item={selectedItem}
                    index={selectedIndex!}
                    total={allItems.length}
                    onPrev={() => setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                    onNext={() => setSelectedIndex((i) => (i !== null && i < allItems.length - 1 ? i + 1 : i))}
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
