"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileSignature, Plus, Trash2, Eye, Send, Sparkles, Loader2, ScrollText, Briefcase, ClipboardList,
  Receipt, FolderOpen, Wallet, Library,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, StackedCell, type Column, type RowAction, type FilterConfig } from "@/components/admin/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { EmailComposer } from "@/components/admin/email-composer";
import { DocumentViewerSheet, type DocumentViewerTarget } from "@/components/admin/document-viewer-sheet";

type DocType = "proposal" | "agreement" | "sop";
type HubDocType = DocType | "invoice" | "receipt" | "project_file" | "finance_file";

type GeneratedDocument = {
  id: string;
  type: DocType;
  title: string;
  reference_code: string | null;
  status: string;
  created_at: string;
  client_id: string | null;
  clients?: { id: string; name: string; company: string | null } | null;
};

type HubDocument = {
  id: string;
  type: HubDocType;
  title: string;
  subtitle: string | null;
  client: string | null;
  date: string;
  viewUrl: string;
};

type ClientOption = { id: string; name: string; email?: string | null; company?: string | null };

const typeIcons: Record<DocType, typeof FileSignature> = {
  proposal: Briefcase,
  agreement: ScrollText,
  sop: ClipboardList,
};
const typeLabels: Record<DocType, string> = {
  proposal: "Proposal",
  agreement: "Agreement",
  sop: "SOP",
};
const typeColors: Record<DocType, string> = {
  proposal: "bg-blue-400/10 text-blue-400",
  agreement: "bg-purple-400/10 text-purple-400",
  sop: "bg-emerald-400/10 text-emerald-400",
};

const hubTypeLabels: Record<HubDocType, string> = {
  proposal: "Proposal",
  agreement: "Agreement",
  sop: "SOP",
  invoice: "Invoice",
  receipt: "Receipt",
  project_file: "Project File",
  finance_file: "Finance Doc",
};
const hubTypeColors: Record<HubDocType, string> = {
  proposal: "bg-blue-400/10 text-blue-400",
  agreement: "bg-purple-400/10 text-purple-400",
  sop: "bg-emerald-400/10 text-emerald-400",
  invoice: "bg-amber-400/10 text-amber-500",
  receipt: "bg-teal-400/10 text-teal-500",
  project_file: "bg-slate-400/10 text-slate-500",
  finance_file: "bg-pink-400/10 text-pink-500",
};

const defaultForm = {
  type: "proposal" as DocType,
  clientId: "",
  engagementSummary: "",
  totalBudget: "",
  timeline: "",
  depositPercent: "50",
};

export function DocumentsPageClient() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<"generated" | "hub">("generated");
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [hubDocuments, setHubDocuments] = useState<HubDocument[]>([]);
  const [hubLoading, setHubLoading] = useState(true);
  const [hubFilter, setHubFilter] = useState("All");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [emailDoc, setEmailDoc] = useState<{ id: string; title: string; client: ClientOption } | null>(null);
  const [viewerDoc, setViewerDoc] = useState<DocumentViewerTarget | null>(null);

  function set<K extends keyof typeof defaultForm>(field: K, value: (typeof defaultForm)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documents");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setDocuments(json.data ?? []);
    setLoading(false);
  }, []);

  const loadHub = useCallback(async () => {
    setHubLoading(true);
    const res = await fetch("/api/admin/documents/hub");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setHubDocuments(json.data ?? []);
    setHubLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "hub") loadHub(); }, [tab, loadHub]);
  useEffect(() => {
    fetch("/api/admin/clients").then((r) => r.json()).then((j) => setClients(j.data ?? [])).catch(() => {});
  }, []);

  function openCreate() {
    setForm(defaultForm);
    setError("");
    setOpen(true);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (form.type !== "sop" && !form.clientId) { setError("Choose a client."); return; }
    if (form.engagementSummary.trim().length < 10) { setError("Add a bit more detail on the engagement/findings."); return; }
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          clientId: form.clientId || undefined,
          engagementSummary: form.engagementSummary.trim(),
          totalBudget: form.totalBudget ? Number(form.totalBudget) : undefined,
          timeline: form.timeline.trim() || undefined,
          depositPercent: form.type === "proposal" && form.depositPercent ? Number(form.depositPercent) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to generate document"); return; }
      setDocuments((prev) => [data.data, ...prev]);
      setOpen(false);
    } catch {
      setError("Network error.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(doc: GeneratedDocument) {
    if (!await confirm({ message: `Delete "${doc.title}"? This cannot be undone.` })) return;
    await fetch(`/api/admin/documents/${doc.id}`, { method: "DELETE" });
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  }

  function openEmail(doc: GeneratedDocument) {
    if (doc.type === "sop") { alert("SOPs are internal documents and can't be emailed to a client."); return; }
    const client = clients.find((c) => c.id === doc.client_id);
    if (!client?.email) { alert("This client has no email on file."); return; }
    setEmailDoc({ id: doc.id, title: doc.title, client });
  }

  const filteredDocuments = documents.filter((d) => {
    if (activeFilter === "All") return true;
    return d.type === activeFilter.toLowerCase();
  });

  const filteredHub = hubDocuments.filter((d) => {
    if (hubFilter === "All") return true;
    return d.type === hubFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-assisted proposals, agreements, and internal SOPs — plus a hub for every document the system holds.</p>
        </div>
        {tab === "generated" && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
            <Sparkles size={15} />Generate Document
          </button>
        )}
      </div>

      <div className="flex border-b border-border">
        {([
          { key: "generated", label: "My Documents", icon: FileSignature },
          { key: "hub", label: "Document Hub", icon: Library },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key ? "border-brand-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === "generated" ? (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Documents" value={documents.length} icon={FileSignature} />
        <StatCard title="Proposals" value={documents.filter((d) => d.type === "proposal").length} icon={Briefcase} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Agreements" value={documents.filter((d) => d.type === "agreement").length} icon={ScrollText} iconColor="text-purple-400" iconBg="bg-purple-400/10" />
        <StatCard title="SOPs" value={documents.filter((d) => d.type === "sop").length} icon={ClipboardList} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
      </div>

      <Card className="p-4 flex items-center justify-between gap-3 bg-brand-navy/5 border-brand-navy/15">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-sm bg-emerald-400/10 text-emerald-500 flex items-center justify-center shrink-0">
            <ClipboardList size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Brightex Standard Operating Procedure</p>
            <p className="text-xs text-muted-foreground truncate">
              The default, always-current process — same four stages promised on the public &quot;How We Work&quot; page.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setViewerDoc({
            title: "Brightex Standard Operating Procedure",
            subtitle: "SOP-DEFAULT-001",
            client: "Internal",
            viewUrl: "/api/admin/documents/default-sop/view",
            isHtmlDocument: true,
          })}
        >
          View SOP
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <DataTable
          columns={[
            {
              key: "title",
              label: "Document",
              sortable: true,
              render: (row) => {
                const d = row as unknown as GeneratedDocument;
                return (
                  <div className="flex flex-col gap-1 min-w-0">
                    <StackedCell primary={d.title} secondary={d.reference_code ?? undefined} />
                    <span className={`self-start px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[d.type]}`}>{typeLabels[d.type]}</span>
                  </div>
                );
              },
            },
            {
              key: "client",
              label: "Client",
              render: (row) => {
                const d = row as unknown as GeneratedDocument;
                return <span className="text-sm text-foreground">{d.clients?.company || d.clients?.name || <span className="text-muted-foreground">Internal</span>}</span>;
              },
            },
            {
              key: "status",
              label: "Status",
              render: (row) => {
                const d = row as unknown as GeneratedDocument;
                return <span className="text-xs font-medium capitalize text-muted-foreground">{d.status}</span>;
              },
            },
            {
              key: "created_at",
              label: "Date",
              sortable: true,
              render: (row) => {
                const d = row as unknown as GeneratedDocument;
                return <span className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString("en-KE")}</span>;
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={filteredDocuments as unknown as Record<string, unknown>[]}
          actions={[
            { label: "View", icon: <Eye size={13} />, onClick: async (row) => {
              const d = row as unknown as GeneratedDocument;
              const base: DocumentViewerTarget = { title: d.title, subtitle: d.reference_code, client: d.clients?.company?.trim() || d.clients?.name, date: d.created_at, viewUrl: `/api/admin/documents/${d.id}/view`, isHtmlDocument: true };
              setViewerDoc(base);
              const res = await fetch(`/api/admin/documents/${d.id}`).then((r) => r.json()).catch(() => null);
              if (res?.data) {
                setViewerDoc({ ...base, refine: { documentId: d.id, docType: d.type, data: res.data.data } });
              }
            } },
            { label: "Email to client", icon: <Send size={13} />, onClick: (row) => openEmail(row as unknown as GeneratedDocument) },
            { label: "Delete", icon: <Trash2 size={13} />, destructive: true, onClick: (row) => handleDelete(row as unknown as GeneratedDocument) },
          ] as RowAction<Record<string, unknown>>[]}
          searchable
          searchPlaceholder="Search documents…"
          searchKeys={["title", "reference_code"]}
          filters={[
            { key: "type", label: "Type", options: [{ label: "All", value: "" }, { label: "Proposal", value: "proposal" }, { label: "Agreement", value: "agreement" }, { label: "SOP", value: "sop" }] } as FilterConfig,
          ]}
          activeFilters={{ type: activeFilter === "All" ? "" : activeFilter.toLowerCase() }}
          onFilterChange={(_, val) => setActiveFilter(val ? val.charAt(0).toUpperCase() + val.slice(1) : "All")}
          maxHeight="520px"
          emptyMessage={loading ? "Loading documents…" : "No documents generated yet."}
        />
      </Card>
      </>
      ) : (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Documents" value={hubDocuments.length} icon={Library} />
        <StatCard title="Invoices" value={hubDocuments.filter((d) => d.type === "invoice").length} icon={FileSignature} iconColor="text-amber-500" iconBg="bg-amber-400/10" />
        <StatCard title="Receipts" value={hubDocuments.filter((d) => d.type === "receipt").length} icon={Receipt} iconColor="text-teal-500" iconBg="bg-teal-400/10" />
        <StatCard title="Uploads" value={hubDocuments.filter((d) => d.type === "project_file" || d.type === "finance_file").length} icon={FolderOpen} iconColor="text-slate-500" iconBg="bg-slate-400/10" />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          columns={[
            {
              key: "title",
              label: "Document",
              sortable: true,
              render: (row) => {
                const d = row as unknown as HubDocument;
                return (
                  <div className="flex flex-col gap-1 min-w-0">
                    <StackedCell primary={d.title} secondary={d.subtitle ?? undefined} />
                    <span className={`self-start px-1.5 py-0.5 rounded text-[10px] font-medium ${hubTypeColors[d.type]}`}>{hubTypeLabels[d.type]}</span>
                  </div>
                );
              },
            },
            {
              key: "client",
              label: "Client / Party",
              render: (row) => {
                const d = row as unknown as HubDocument;
                return <span className="text-sm text-foreground">{d.client || <span className="text-muted-foreground">Internal</span>}</span>;
              },
            },
            {
              key: "date",
              label: "Date",
              sortable: true,
              render: (row) => {
                const d = row as unknown as HubDocument;
                return <span className="text-sm text-muted-foreground">{new Date(d.date).toLocaleDateString("en-KE")}</span>;
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={filteredHub as unknown as Record<string, unknown>[]}
          actions={[
            { label: "View / Download", icon: <Eye size={13} />, onClick: (row) => {
              const d = row as unknown as HubDocument;
              const isHtml = d.type === "proposal" || d.type === "agreement" || d.type === "sop";
              setViewerDoc({ title: d.title, subtitle: d.subtitle, client: d.client, date: d.date, viewUrl: d.viewUrl, isHtmlDocument: isHtml });
            } },
          ] as RowAction<Record<string, unknown>>[]}
          searchable
          searchPlaceholder="Search all documents…"
          searchKeys={["title", "subtitle", "client"]}
          filters={[
            { key: "type", label: "Type", options: [
              { label: "All", value: "" },
              { label: "Proposal", value: "proposal" },
              { label: "Agreement", value: "agreement" },
              { label: "SOP", value: "sop" },
              { label: "Invoice", value: "invoice" },
              { label: "Receipt", value: "receipt" },
              { label: "Project File", value: "project_file" },
              { label: "Finance Doc", value: "finance_file" },
            ] } as FilterConfig,
          ]}
          activeFilters={{ type: hubFilter === "All" ? "" : hubFilter }}
          onFilterChange={(_, val) => setHubFilter(val || "All")}
          maxHeight="520px"
          emptyMessage={hubLoading ? "Loading…" : "No documents on file yet."}
        />
      </Card>

      <div className="flex items-start gap-2 p-3 rounded-sm border border-dashed border-border bg-muted/10">
        <Wallet size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          The hub is read-only — invoices, receipts, and uploaded files are managed from their own pages
          (Invoices, Payments, Projects, Finance). Only AI-generated documents live under &quot;My Documents&quot;.
        </p>
      </div>
      </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Document with AI</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <Select value={form.type} onValueChange={(v) => v && set("type", v as DocType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="agreement">Client Agreement / Terms</SelectItem>
                  <SelectItem value="sop">Internal SOP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type !== "sop" && (
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={form.clientId} onValueChange={(v) => v && set("clientId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client…">
                      {(id: string) => {
                        const c = clients.find((x) => x.id === id);
                        return c ? (c.company ? `${c.name} — ${c.company}` : c.name) : "Select client…";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company ? `${c.name} — ${c.company}` : c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="doc-summary">
                {form.type === "sop" ? "Describe the process" : "Engagement summary & findings"}
              </Label>
              <Textarea
                id="doc-summary"
                rows={6}
                value={form.engagementSummary}
                onChange={(e) => set("engagementSummary", e.target.value)}
                placeholder={
                  form.type === "sop"
                    ? "Describe the process step by step, who's involved, and what tools are actually used…"
                    : "What did the client ask for? What did you discuss, learn, or agree on? Include scope, budget expectations, and timeline if known…"
                }
                required
              />
            </div>

            {form.type !== "sop" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="doc-budget">Budget (KES, optional)</Label>
                  <input
                    id="doc-budget"
                    type="number"
                    value={form.totalBudget}
                    onChange={(e) => set("totalBudget", e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doc-timeline">Timeline (optional)</Label>
                  <input
                    id="doc-timeline"
                    value={form.timeline}
                    onChange={(e) => set("timeline", e.target.value)}
                    placeholder="e.g. 4 weeks"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {form.type === "proposal" && (
              <div className="space-y-1.5">
                <Label htmlFor="doc-deposit">Deposit / Upfront Payment</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="doc-deposit"
                    type="number"
                    min={0}
                    max={100}
                    value={form.depositPercent}
                    onChange={(e) => set("depositPercent", e.target.value)}
                    className="w-24 h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">% upfront, balance on delivery — adjust per client&apos;s agreed plan.</span>
                </div>
              </div>
            )}

            {form.type === "agreement" && (
              <p className="text-xs text-muted-foreground">
                Legal clauses (IP, confidentiality, termination, liability, governing law) are fixed standard text — only
                scope and fees are AI-drafted. Have this reviewed before it&apos;s treated as binding.
              </p>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={generating} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {generating ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Sparkles size={14} className="mr-1.5" />}
                {generating ? "Generating…" : "Generate"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {emailDoc && (
        <EmailComposer
          open={!!emailDoc}
          onClose={() => setEmailDoc(null)}
          recipient={{ clientId: emailDoc.client.id, name: emailDoc.client.name, email: emailDoc.client.email! }}
          linkDocument={{ id: emailDoc.id, title: emailDoc.title }}
          onSent={() => setEmailDoc(null)}
        />
      )}

      <DocumentViewerSheet doc={viewerDoc} onClose={() => setViewerDoc(null)} />
    </div>
  );
}
