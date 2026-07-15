"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Sop {
  id: string;
  title: string;
  reference_code: string | null;
}

export function SopQuickAccess() {
  const router = useRouter();
  const [sops, setSops] = useState<Sop[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/documents?type=sop")
      .then((r) => r.json())
      .then((j) => setSops(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
        title="Standard Operating Procedures"
      >
        <ClipboardList size={15} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-[13px] font-semibold text-foreground">SOPs</p>
          <p className="text-[11px] text-muted-foreground">Internal procedures</p>
        </div>
        {!loaded ? (
          <div className="px-3 py-3 text-xs text-muted-foreground">Loading…</div>
        ) : sops.length === 0 ? (
          <div className="px-3 py-3 text-xs text-muted-foreground">No SOPs generated yet.</div>
        ) : (
          sops.slice(0, 8).map((sop) => (
            <DropdownMenuItem key={sop.id} onClick={() => window.open(`/api/admin/documents/${sop.id}/view`, "_blank")}>
              <ClipboardList size={13} className="mr-2 shrink-0" />
              <span className="truncate">{sop.title}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/admin/documents")}>
          <Plus size={13} className="mr-2" /> Manage / Generate SOP
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
