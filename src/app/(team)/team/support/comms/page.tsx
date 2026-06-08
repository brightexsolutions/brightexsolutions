"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Mail, Phone, Calendar, Plus, Loader2, Search, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Comm = {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  direction: string;
  sent_at: string;
  status: string;
  clients: { id: string; name: string; company: string | null } | null;
};

type Client = { id: string; name: string; company: string | null };

const TYPE_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; colour: string }> = {
  email:    { label: "Email",    icon: Mail,           colour: "text-blue-500" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare,  colour: "text-green-500" },
  call:     { label: "Call",     icon: Phone,          colour: "text-purple-500" },
  meeting:  { label: "Meeting",  icon: Calendar,       colour: "text-amber-500" },
};

const COMM_TYPES = ["email", "whatsapp", "call", "meeting"] as const;

export default function SupportCommsPage() {
  const [comms, setComms] = useState<Comm[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    type: "call" as typeof COMM_TYPES[number],
    direction: "in" as "in" | "out",
    subject: "",
    body: "",
  });

  const load = useCallback(async () => {
    try {
      const [commsRes, clientsRes] = await Promise.all([
        fetch("/api/admin/communications"),
        fetch("/api/admin/clients"),
      ]);
      const [commsJson, clientsJson] = await Promise.all([commsRes.json(), clientsRes.json()]);
      if (commsRes.ok) setComms(commsJson.data ?? []);
      if (clientsRes.ok) setClients(clientsJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = comms.filter((c) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.clients?.name?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q) ||
      c.body?.toLowerCase().includes(q)
    );
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          client_id: form.client_id || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setComms((prev) => [json.data, ...prev]);
        setCreateOpen(false);
        setForm({ client_id: "", type: "call", direction: "in", subject: "", body: "" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground mt-1">Log calls, meetings, emails, and WhatsApp interactions.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors shrink-0"
        >
          <Plus size={15} /> Log Comm
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, subject or message…"
            className="w-full pl-9 pr-4 py-2.5 rounded-sm border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-sm border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All types</option>
            {COMM_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* List */}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading communications…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-20 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No communications found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((comm) => {
              const typeConf = TYPE_CONFIG[comm.type];
              const Icon = typeConf?.icon ?? MessageSquare;
              return (
                <div key={comm.id} className="flex items-start gap-3 px-5 py-4">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-muted",
                    typeConf?.colour)}>
                    <Icon size={13} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {comm.clients && (
                        <span className="text-sm font-semibold text-foreground">{comm.clients.name}</span>
                      )}
                      {comm.clients?.company && (
                        <span className="text-xs text-muted-foreground hidden sm:block">· {comm.clients.company}</span>
                      )}
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize bg-muted",
                        typeConf?.colour)}>
                        {typeConf?.label}
                      </span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                        comm.direction === "in"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {comm.direction === "in" ? "Inbound" : "Outbound"}
                      </span>
                    </div>
                    {comm.subject && (
                      <p className="text-sm text-foreground mt-0.5 font-medium">{comm.subject}</p>
                    )}
                    {comm.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{comm.body}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(comm.sent_at).toLocaleString("en-KE", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log comm modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setCreateOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative z-10 w-full sm:max-w-lg bg-background border border-border rounded-t-lg sm:rounded-sm shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-base font-bold text-foreground mb-5">Log Communication</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof COMM_TYPES[number] }))}
                      className="w-full appearance-none px-3 pr-8 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {COMM_TYPES.map((t) => (
                        <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direction</label>
                  <div className="relative">
                    <select
                      value={form.direction}
                      onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value as "in" | "out" }))}
                      className="w-full appearance-none px-3 pr-8 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="in">Inbound</option>
                      <option value="out">Outbound</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client (optional)</label>
                <div className="relative">
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                    className="w-full appearance-none px-3 pr-8 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">No client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject (optional)</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief summary of the interaction"
                  className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (optional)</label>
                <textarea
                  rows={3}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Key points, outcomes, next steps…"
                  className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-sm border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                  Log Communication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
