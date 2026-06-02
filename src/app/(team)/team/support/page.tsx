"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Mail, Phone, MessageSquare, ChevronRight, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickClientPanel } from "@/components/admin/quick-client-panel";

type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  classification: string;
  last_contacted_at?: string;
};

const classColour: Record<string, string> = {
  active: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
  qualified: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
  lead: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  ghost: "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400",
  past: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400",
};

export default function SupportClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panelClientId, setPanelClientId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      const json = await res.json();
      if (res.ok) setClients(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Client Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">View client details and reach out directly.</p>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company or email…"
            className="w-full pl-9 pr-4 py-2.5 rounded-sm border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="rounded-sm border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading clients…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No clients found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((client) => {
                const daysSince = client.last_contacted_at
                  ? Math.floor((Date.now() - new Date(client.last_contacted_at).getTime()) / 86400000)
                  : null;

                return (
                  <div key={client.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => setPanelClientId(client.id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0 text-xs font-bold">
                      {client.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{client.name}</p>
                        {client.company && (
                          <span className="text-xs text-muted-foreground hidden sm:block">· {client.company}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {client.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Mail size={10} />{client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 hidden md:flex">
                            <Phone size={10} />{client.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 hidden sm:block",
                      classColour[client.classification] ?? "text-muted-foreground bg-muted")}>
                      {client.classification}
                    </span>

                    {daysSince !== null && (
                      <span className={cn("hidden lg:flex items-center gap-1 text-xs shrink-0",
                        daysSince > 14 ? "text-amber-500" : "text-muted-foreground")}>
                        <Clock size={10} />
                        {daysSince === 0 ? "Today" : `${daysSince}d ago`}
                      </span>
                    )}

                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {client.email && (
                        <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 rounded-sm border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Mail size={12} />
                        </a>
                      )}
                      {client.phone && (
                        <a href={`https://wa.me/${client.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 rounded-sm border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-green-500">
                          <MessageSquare size={12} />
                        </a>
                      )}
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <QuickClientPanel
        clientId={panelClientId}
        onClose={() => setPanelClientId(null)}
      />
    </>
  );
}
