"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ArrowRight } from "lucide-react";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
        title="Standard Operating Procedures"
      >
        <ClipboardList size={15} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-[13px] font-semibold text-foreground">Standard procedures</p>
          <p className="text-[11px] text-muted-foreground">How we handle clients and each project type</p>
        </div>

        {SOP_LIBRARY.map((sop) => (
          <DropdownMenuItem
            key={sop.key}
            onClick={() => window.open(`/api/admin/sops/${sop.key}/view`, "_blank")}
          >
            <ClipboardList size={13} className="mr-2 shrink-0 text-brand-gold" />
            <span className="truncate">{sop.label}</span>
          </DropdownMenuItem>
        ))}

        {generated.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                One-off SOPs
              </p>
            </div>
            {generated.slice(0, 5).map((sop) => (
              <DropdownMenuItem key={sop.id} onClick={() => window.open(`/api/admin/documents/${sop.id}/view`, "_blank")}>
                <ClipboardList size={13} className="mr-2 shrink-0" />
                <span className="truncate">{sop.title}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/admin/sops")}>
          <ArrowRight size={13} className="mr-2" /> Browse and search all SOPs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
