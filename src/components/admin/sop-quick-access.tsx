"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, ArrowRight, Route, FileText, PenLine, Receipt, Globe,
  Smartphone, Boxes, Palette, Lightbulb, Bot, ExternalLink, type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SOP_LIBRARY } from "@/lib/sop-library";

interface Sop {
  id: string;
  title: string;
  reference_code: string | null;
}

const SOP_ICONS: Record<string, LucideIcon> = {
  "client-lifecycle": Route,
  "proposal-policy": FileText,
  "agreement-signing": PenLine,
  "payments-collections": Receipt,
  website: Globe,
  mobile: Smartphone,
  erp: Boxes,
  design: Palette,
  consultancy: Lightbulb,
  "ai-automation": Bot,
};

const openSop = (key: string) => window.open(`/api/admin/sops/${key}/view`, "_blank");

/**
 * Two kinds of SOP live here. The standing library (code-defined, always
 * current, one per project type) is listed first because that is what someone
 * actually reaches for mid-task. One-off AI-drafted SOPs stored as documents
 * follow underneath.
 */
export function SopQuickAccess() {
  const router = useRouter();
  const [generated, setGenerated] = useState<Sop[]>([]);

  useEffect(() => {
    fetch("/api/admin/documents?type=sop")
      .then((r) => r.json())
      .then((j) => setGenerated(j.data ?? []))
      .catch(() => {});
  }, []);

  const process = SOP_LIBRARY.filter((s) => s.category !== "Delivery");
  const delivery = SOP_LIBRARY.filter((s) => s.category === "Delivery");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="size-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Standard operating procedures"
        title="Standard operating procedures"
      >
        <ClipboardList size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-2xl p-2">
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Procedures</p>
            <p className="text-xs text-muted-foreground">Opens in a new tab</p>
          </div>
          <button
            onClick={() => router.push("/admin/sops")}
            className="text-xs font-medium text-foreground hover:bg-muted rounded-full px-3 h-8"
          >
            View all
          </button>
        </div>

        <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client process</p>
        {process.map((sop) => {
          const Icon = SOP_ICONS[sop.key] ?? ClipboardList;
          return (
            <DropdownMenuItem key={sop.key} onClick={() => openSop(sop.key)} className="group items-start gap-3 rounded-xl px-2 py-2">
              <span className="size-8 rounded-full bg-brand-gold/15 text-foreground flex items-center justify-center shrink-0">
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground truncate">{sop.label}</span>
                <span className="block text-xs text-muted-foreground truncate">{sop.summary}</span>
              </span>
              <ExternalLink size={13} className="mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 group-data-[highlighted]:opacity-100 shrink-0" />
            </DropdownMenuItem>
          );
        })}

        <p className="px-2 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Delivery by project type</p>
        <div className="grid grid-cols-2 gap-1">
          {delivery.map((sop) => {
            const Icon = SOP_ICONS[sop.key] ?? ClipboardList;
            return (
              <DropdownMenuItem
                key={sop.key}
                onClick={() => openSop(sop.key)}
                title={sop.summary}
                className="gap-2.5 rounded-xl border border-border px-2.5 py-2.5"
              >
                <Icon size={15} className="text-muted-foreground shrink-0" />
                <span className="text-[13px] font-medium text-foreground truncate">{sop.label.replace(/^Delivery:\s*/, "")}</span>
              </DropdownMenuItem>
            );
          })}
        </div>

        {generated.length > 0 && (
          <>
            <p className="px-2 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">One-off SOPs</p>
            {generated.slice(0, 5).map((sop) => (
              <DropdownMenuItem
                key={sop.id}
                onClick={() => window.open(`/api/admin/documents/${sop.id}/view`, "_blank")}
                className="gap-3 rounded-xl px-2 py-2"
              >
                <ClipboardList size={15} className="text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{sop.title}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem onClick={() => router.push("/admin/sops")} className="gap-3 rounded-xl px-2 py-2 text-sm font-medium">
          <ArrowRight size={15} /> Browse and search all SOPs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
