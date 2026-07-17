"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  FolderOpen, Plus, Pencil, Trash2, Eye, Upload, FileText,
  Trash, CheckCircle2, RefreshCw, ChevronRight, TrendingUp,
  Link2, Copy, ExternalLink, Briefcase, ScrollText, Send, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { EmailComposer } from "@/components/admin/email-composer";
import { DocumentViewerSheet, type DocumentViewerTarget } from "@/components/admin/document-viewer-sheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STEPS = ["discovery", "design", "development", "review", "live", "completed"] as const;
type Status = typeof STATUS_STEPS[number] | "paused";

const statusColors: Record<string, string> = {
  discovery: "bg-blue-400/10 text-blue-400",
  design: "bg-purple-400/10 text-purple-400",
  development: "bg-amber-400/10 text-amber-400",
  review: "bg-orange-400/10 text-orange-400",
  live: "bg-emerald-400/10 text-emerald-400",
  paused: "bg-slate-400/10 text-slate-400",
  completed: "bg-green-500/10 text-green-500",
};

const statusDot: Record<string, string> = {
  discovery: "bg-blue-400",
  design: "bg-purple-400",
  development: "bg-amber-400",
  review: "bg-orange-400",
  live: "bg-emerald-400",
  paused: "bg-slate-400",
  completed: "bg-green-500",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-slate-400/10 text-slate-400",
  sent: "bg-blue-400/10 text-blue-400",
  paid: "bg-emerald-400/10 text-emerald-400",
  overdue: "bg-red-400/10 text-red-400",
  cancelled: "bg-slate-400/10 text-slate-400",
};

const defaultForm = {
  name: "", type: "website", status: "discovery" as Status,
  budget: "", start_date: "", end_date: "",
  is_retainer: false, retainer_cycle: "monthly",
  monthly_rate: "", client_id: "", notes: "",
};

const defaultRateForm = { monthly_rate: "", effective_from: "", notes: "" };

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = { id: string; name: string; company?: string | null };

type Project = {
  id: string;
  client_id?: string | null;
  name: string;
  type?: string | null;
  status: string;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_retainer?: boolean | null;
  retainer_cycle?: string | null;
  monthly_rate?: number | null;
  notes?: string | null;
  created_at: string;
  auto_complete_on_tasks?: boolean | null;
  client_comms_enabled?: boolean | null;
  comm_trigger?: string | null;
  portal_enabled?: boolean | null;
  portal_token?: string | null;
  clients?: { id: string; name?: string | null; company?: string | null; email?: string | null } | null;
};

type RateHistory = {
  id: string;
  monthly_rate: number;
  effective_from: string;
  notes?: string | null;
  created_at: string;
};

type Payment = { id: string; amount: number; method: string; date?: string | null };

type Invoice = {
  id: string;
  invoice_number?: string | null;
  status: string;
  total: number;
  due_date?: string | null;
  payments: Payment[];
};

type Document = {
  id: string;
  name: string;
  storage_path: string;
  size_bytes?: number | null;
  uploaded_at: string;
  url?: string | null;
};

type TaskMember = { id: string; name: string; role?: string | null } | null;

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
  description?: string | null;
  assigned_to?: string | null;
  team_members?: TaskMember;
};

type GeneratedDoc = {
  id: string;
  type: "proposal" | "agreement" | "sop";
  title: string;
  reference_code: string | null;
  status: string;
  gated?: boolean | null;
  accepted_at?: string | null;
  created_at: string;
};

type ProjectDetail = Project & {
  clients?: { id: string; name?: string | null; company?: string | null; email?: string | null } | null;
  invoices: Invoice[];
  tasks: Task[];
  consultancy_rate_history?: RateHistory[] | null;
  generated_documents?: GeneratedDoc[] | null;
};

type Subcontractor = { id: string; name: string; role: string };

const defaultTaskForm = {
  title: "", description: "", priority: "normal" as "low" | "normal" | "high",
  due_date: "", assigned_to: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return `KES ${Number(n).toLocaleString()}`; }
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}
function fmtBytes(b?: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Progress Pipeline ────────────────────────────────────────────────────────

function Pipeline({ status, isRetainer }: { status: string; isRetainer?: boolean | null }) {
  const currentIdx = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number]);
  const isPaused = status === "paused";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, idx) => {
          const isActive = step === status;
          const isPast = currentIdx > idx && !isPaused;
          const isCurrent = step === status;
          return (
            <div key={step} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors shrink-0",
                  isCurrent && !isPaused ? "border-brand-gold bg-brand-gold text-brand-navy" :
                    isPast ? "border-emerald-500 bg-emerald-500 text-white" :
                      "border-border bg-background text-muted-foreground"
                )}>
                  {isPast ? "✓" : idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] capitalize text-center leading-tight hidden sm:block",
                  isCurrent ? "text-brand-gold font-semibold" :
                    isPast ? "text-emerald-500" : "text-muted-foreground/50"
                )}>
                  {step}
                </span>
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-0.5 mb-3",
                  isPast || (currentIdx > idx) ? "bg-emerald-500" : "bg-border"
                )} />
              )}
            </div>
          );
        })}
      </div>
      {isPaused && (
        <p className="text-xs text-slate-400 text-center">Project is currently paused</p>
      )}
      {isRetainer && status === "live" && (
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-500 font-medium">Active retainer — ongoing</span>
        </div>
      )}
    </div>
  );
}

// ─── Invoice & Payment Summary ────────────────────────────────────────────────

function InvoiceRow({ inv }: { inv: Invoice }) {
  const totalPaid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Number(inv.total) - totalPaid;
  const pct = inv.total > 0 ? Math.min(100, (totalPaid / Number(inv.total)) * 100) : 0;

  return (
    <div className="py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {inv.invoice_number ?? "Invoice"}
          </p>
          {inv.due_date && (
            <p className="text-xs text-muted-foreground">Due {fmtDate(inv.due_date)}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className={cn("px-2 py-0.5 rounded-sm text-[11px] font-medium capitalize", invoiceStatusColors[inv.status] ?? "bg-muted text-muted-foreground")}>
            {inv.status}
          </span>
          <p className="text-xs text-muted-foreground mt-1">{fmt(inv.total)}</p>
        </div>
      </div>
      {/* Payment progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-brand-gold")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Paid: {fmt(totalPaid)}</span>
          {outstanding > 0 && <span className="text-orange-400">Outstanding: {fmt(outstanding)}</span>}
        </div>
      </div>
      {/* Payment list */}
      {inv.payments.length > 0 && (
        <div className="space-y-1 pl-2 border-l-2 border-emerald-500/30">
          {inv.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-[11px]">
              <span className="text-muted-foreground capitalize">{p.method} {p.date ? `· ${fmtDate(p.date)}` : ""}</span>
              <span className="text-foreground font-medium">{fmt(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProjectsPageClient() {
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // View sheet
  const [viewOpen, setViewOpen] = useState(false);
  const [viewProject, setViewProject] = useState<ProjectDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docUploading, setDocUploading] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Proposals & agreements linked to the project
  const [docViewerTarget, setDocViewerTarget] = useState<DocumentViewerTarget | null>(null);
  const [emailDocTarget, setEmailDocTarget] = useState<{ id: string; title: string } | null>(null);
  const [emailDocOpen, setEmailDocOpen] = useState(false);
  const [generatingDocType, setGeneratingDocType] = useState<"proposal" | "agreement" | null>(null);

  // Rate history modal
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateForm, setRateForm] = useState(defaultRateForm);
  const [rateSaving, setRateSaving] = useState(false);
  const [rateError, setRateError] = useState("");

  // Portal
  const [portalCopied, setPortalCopied] = useState(false);

  // Task management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [projRes, clientRes] = await Promise.all([
      fetch("/api/admin/projects"),
      fetch("/api/admin/clients"),
    ]);
    const pj = await projRes.json().catch(() => ({}));
    const cl = await clientRes.json().catch(() => ({}));
    if (projRes.ok) setProjects(pj.data ?? []);
    if (clientRes.ok) setClients(cl.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Edit handlers ────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setFormError("");
    setEditOpen(true);
  }

  function openEdit(project: Project) {
    setEditTarget(project);
    setForm({
      name: project.name,
      type: project.type ?? "website",
      status: project.status as Status,
      budget: project.budget != null ? String(project.budget) : "",
      start_date: project.start_date ?? "",
      end_date: project.end_date ?? "",
      is_retainer: project.is_retainer ?? false,
      retainer_cycle: project.retainer_cycle ?? "monthly",
      monthly_rate: project.monthly_rate != null ? String(project.monthly_rate) : "",
      client_id: project.client_id ?? "",
      notes: project.notes ?? "",
    });
    setFormError("");
    setEditOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        client_id: form.client_id || undefined,
        retainer_cycle: form.is_retainer ? form.retainer_cycle : undefined,
        monthly_rate: form.monthly_rate ? Number(form.monthly_rate) : undefined,
      };
      const url = editTarget ? `/api/admin/projects/${editTarget.id}` : "/api/admin/projects";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(data.error ?? "Failed to save"); return; }
      setEditOpen(false);
      load();
    } catch { setFormError("Network error."); }
    finally { setSaving(false); }
  }

  async function handleDelete(project: Project) {
    if (!await confirm({ message: `Delete "${project.name}"? This cannot be undone.` })) return;
    await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
  }

  // ── View sheet handlers ──────────────────────────────────────────────────

  async function openView(project: Project) {
    setViewProject(null);
    setDocuments([]);
    setTasks([]);
    setViewOpen(true);
    setViewLoading(true);
    const [detailRes, docsRes, tasksRes, membersRes] = await Promise.all([
      fetch(`/api/admin/projects/${project.id}`),
      fetch(`/api/admin/projects/${project.id}/documents`),
      fetch(`/api/admin/projects/${project.id}/tasks`),
      fetch(`/api/admin/team?role=subcontractor`),
    ]);
    const detail = await detailRes.json().catch(() => ({}));
    const docs = await docsRes.json().catch(() => ({}));
    const taskData = await tasksRes.json().catch(() => ({}));
    const memberData = await membersRes.json().catch(() => ({}));
    if (detailRes.ok) setViewProject(detail.data ?? null);
    if (docsRes.ok) setDocuments(docs.data ?? []);
    if (tasksRes.ok) setTasks(taskData.data ?? []);
    if (membersRes.ok) setSubcontractors(memberData.data ?? []);
    setViewLoading(false);
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!viewProject) return;
    setTaskError("");
    setTaskSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${viewProject.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description || undefined,
          priority: taskForm.priority,
          due_date: taskForm.due_date || undefined,
          assigned_to: taskForm.assigned_to || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setTaskError(json.error ?? "Failed to create task"); return; }
      setTasks((prev) => [...prev, json.data]);
      setTaskFormOpen(false);
      setTaskForm(defaultTaskForm);
    } catch { setTaskError("Network error."); }
    finally { setTaskSaving(false); }
  }

  async function handleDeleteTask(taskId: string) {
    if (!viewProject) return;
    await fetch(`/api/admin/projects/${viewProject.id}/tasks?task_id=${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function handleTaskStatus(taskId: string, status: string) {
    if (!viewProject) return;
    const res = await fetch(`/api/admin/projects/${viewProject.id}/tasks?task_id=${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...json.data } : t));
  }

  async function handleStatusChange(newStatus: string) {
    if (!viewProject) return;
    setStatusChanging(true);
    try {
      const res = await fetch(`/api/admin/projects/${viewProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setViewProject((p) => p ? { ...p, status: newStatus } : p);
        setProjects((prev) => prev.map((p) => p.id === viewProject.id ? { ...p, status: newStatus } : p));
      }
    } finally { setStatusChanging(false); }
  }

  async function viewGeneratedDoc(doc: GeneratedDoc) {
    if (!viewProject) return;
    const base: DocumentViewerTarget = {
      title: doc.title,
      subtitle: doc.reference_code,
      client: viewProject.clients?.company?.trim() || viewProject.clients?.name || undefined,
      date: doc.created_at,
      viewUrl: `/api/admin/documents/${doc.id}/view`,
      isHtmlDocument: true,
    };
    setDocViewerTarget(base);
    const res = await fetch(`/api/admin/documents/${doc.id}`).then((r) => r.json()).catch(() => null);
    if (res?.data) {
      setDocViewerTarget({
        ...base,
        refine: { documentId: doc.id, docType: doc.type as "proposal" | "agreement", data: res.data.data },
        gating: { documentId: doc.id, gated: !!res.data.gated },
        onEmailClient: () => {
          setDocViewerTarget(null);
          setEmailDocTarget({ id: doc.id, title: doc.title });
          setEmailDocOpen(true);
        },
      });
    }
  }

  function resendGeneratedDoc(doc: GeneratedDoc) {
    setEmailDocTarget({ id: doc.id, title: doc.title });
    setEmailDocOpen(true);
  }

  async function generateDocForProject(type: "proposal" | "agreement") {
    if (!viewProject?.client_id) { alert("This project has no client on file."); return; }
    setGeneratingDocType(type);
    try {
      const summary = [
        `${type === "proposal" ? "Proposal" : "Agreement"} prepared for an already-running project: "${viewProject.name}".`,
        viewProject.notes,
        viewProject.type ? `Project type: ${viewProject.type}.` : "",
      ].filter(Boolean).join("\n") || `Prepare a ${type} for the project "${viewProject.name}".`;

      const res = await fetch("/api/admin/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          clientId: viewProject.client_id,
          projectId: viewProject.id,
          engagementSummary: summary,
          totalBudget: viewProject.budget || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { alert(json.error ?? `Failed to generate the ${type}.`); return; }
      setViewProject((p) => p ? { ...p, generated_documents: [json.data, ...(p.generated_documents ?? [])] } : p);
    } finally {
      setGeneratingDocType(null);
    }
  }

  async function handleDocUpload(file: File) {
    if (!viewProject) return;
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name);
      const res = await fetch(`/api/admin/projects/${viewProject.id}/documents`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.data) setDocuments((prev) => [json.data, ...prev]);
    } finally { setDocUploading(false); }
  }

  async function handleDocDelete(docId: string) {
    if (!viewProject) return;
    await fetch(`/api/admin/projects/${viewProject.id}/documents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_id: docId }),
    });
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }

  async function handleAddRate(e: React.FormEvent) {
    e.preventDefault();
    if (!viewProject) return;
    setRateSaving(true);
    setRateError("");
    try {
      const res = await fetch(`/api/admin/projects/${viewProject.id}/rate-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_rate: Number(rateForm.monthly_rate),
          effective_from: rateForm.effective_from,
          notes: rateForm.notes || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setRateError(json.error ?? "Failed to save"); return; }
      // Prepend to rate history + update current rate on viewProject
      setViewProject((p) => p ? {
        ...p,
        monthly_rate: Number(rateForm.monthly_rate),
        consultancy_rate_history: [json.data, ...(p.consultancy_rate_history ?? [])],
      } : p);
      setProjects((prev) => prev.map((p) => p.id === viewProject.id ? { ...p, monthly_rate: Number(rateForm.monthly_rate) } : p));
      setRateModalOpen(false);
      setRateForm(defaultRateForm);
    } catch { setRateError("Network error."); }
    finally { setRateSaving(false); }
  }

  async function handleDeleteRate(entryId: string) {
    if (!viewProject) return;
    await fetch(`/api/admin/projects/${viewProject.id}/rate-history`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry_id: entryId }),
    });
    setViewProject((p) => p ? {
      ...p,
      consultancy_rate_history: (p.consultancy_rate_history ?? []).filter((r) => r.id !== entryId),
    } : p);
  }

  // ── Derived stats ────────────────────────────────────────────────────────

  const activeProjects = projects.filter((p) => ["discovery", "design", "development"].includes(p.status));
  const inReview = projects.filter((p) => p.status === "review");
  const retainers = projects.filter((p) => p.is_retainer);
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget ?? 0), 0);

  // ── Financials for view sheet ────────────────────────────────────────────

  const invoiceTotal = (viewProject?.invoices ?? []).reduce((s, i) => s + Number(i.total), 0);
  const amountPaid = (viewProject?.invoices ?? []).reduce(
    (s, i) => s + i.payments.reduce((ps, p) => ps + Number(p.amount), 0), 0
  );
  const outstanding = invoiceTotal - amountPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">One-off projects and recurring retainers.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
        >
          <Plus size={15} />New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active" value={activeProjects.length} icon={FolderOpen} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="In Review" value={inReview.length} icon={FolderOpen} iconColor="text-orange-400" iconBg="bg-orange-400/10" />
        <StatCard title="Retainers" value={retainers.length} icon={RefreshCw} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Total Budget" value={`KES ${totalBudget.toLocaleString()}`} icon={FolderOpen} />
      </div>

      {/* Status filter strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...Object.keys(statusColors)].map((status) => (
          <div key={status} className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-muted border border-border shrink-0">
            <span className={cn("px-2 py-0.5 rounded-sm text-[11px] font-medium capitalize", statusColors[status])}>{status}</span>
            <span className="text-xs text-muted-foreground">{projects.filter((p) => p.status === status).length}</span>
          </div>
        ))}
      </div>

      {/* Project list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FolderOpen size={16} />All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No projects yet.</p>
              <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 transition-colors">
                <Plus size={13} />New Project
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border -mx-6">
              {projects.map((project) => (
                <div key={project.id} className="px-6 py-4 flex items-start justify-between gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{project.name}</p>
                      <span className={cn("px-2 py-0.5 rounded-sm text-[11px] font-medium capitalize", statusColors[project.status] ?? "bg-muted text-muted-foreground")}>
                        {project.status}
                      </span>
                      {project.is_retainer && (
                        <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium bg-brand-gold/10 text-brand-gold flex items-center gap-1">
                          <RefreshCw size={9} />Retainer
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.clients?.company || project.clients?.name || "No client linked"}
                      {project.type ? ` · ${project.type}` : ""}
                    </p>
                    {project.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{project.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openView(project)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View">
                      <Eye size={13} />
                    </button>
                    <button onClick={() => openEdit(project)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(project)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      {project.budget ? fmt(project.budget) : "Budget TBD"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString("en-KE") : "Start TBD"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit / Create Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Project Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={(v) => v && set("client_id", v)}>
                <SelectTrigger>
                  {form.client_id
                    ? (() => { const c = clients.find((c) => c.id === form.client_id); return <span className="text-sm">{c?.company || c?.name || "Unknown"}</span>; })()
                    : <span className="text-sm text-muted-foreground">No client (add later)</span>}
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => v && set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["website", "mobile", "erp", "consultancy", "design", "other"].map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => v && set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...Object.keys(statusColors)].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Retainer toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id="is_retainer"
                  type="checkbox"
                  checked={form.is_retainer}
                  onChange={(e) => set("is_retainer", e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="is_retainer" className="font-normal">This is a retainer (recurring engagement)</Label>
              </div>
              {form.is_retainer && (
                <div className="pl-6 space-y-1.5">
                  <Label>Billing Cycle</Label>
                  <Select value={form.retainer_cycle} onValueChange={(v) => v && set("retainer_cycle", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {(form.is_retainer || form.type === "consultancy") ? (
              <div className="space-y-1.5">
                <Label>Monthly Rate (KES)</Label>
                <Input type="number" min="0" value={form.monthly_rate} onChange={(e) => set("monthly_rate", e.target.value)} placeholder="e.g. 50000" />
                <p className="text-[11px] text-muted-foreground">Salary / monthly consultancy fee. You can record rate changes in the project view.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Budget (KES)</Label>
                <Input type="number" min="0" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="0" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{form.is_retainer ? "First Billing Date" : "End Date"}</Label>
                <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Update Rate Modal ───────────────────────────────────────────────── */}
      <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Consultancy Rate</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>New Monthly Rate (KES) *</Label>
              <Input
                type="number" min="0" required
                value={rateForm.monthly_rate}
                onChange={(e) => setRateForm((f) => ({ ...f, monthly_rate: e.target.value }))}
                placeholder="e.g. 55000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Effective From *</Label>
              <Input
                type="date" required
                value={rateForm.effective_from}
                onChange={(e) => setRateForm((f) => ({ ...f, effective_from: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={rateForm.notes}
                onChange={(e) => setRateForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Annual increment, promotion"
              />
            </div>
            {rateError && <p className="text-sm text-red-500">{rateError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setRateModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={rateSaving || !rateForm.monthly_rate || !rateForm.effective_from} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {rateSaving ? "Saving…" : "Save Rate"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View Sheet ───────────────────────────────────────────────────────── */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent side="right" className="sm:max-w-[820px] p-0 flex flex-col overflow-hidden">
          {viewLoading || !viewProject ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {viewLoading ? "Loading project…" : "Project not found."}
            </div>
          ) : (
            <>
              {/* Sticky header */}
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div className="flex items-start gap-3 pr-8">
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-lg font-display font-bold text-foreground leading-tight">
                      {viewProject.name}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {viewProject.clients?.company || viewProject.clients?.name || "No client linked"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("px-2 py-1 rounded-sm text-[11px] font-medium capitalize", statusColors[viewProject.status] ?? "bg-muted text-muted-foreground")}>
                      {viewProject.status}
                    </span>
                    {viewProject.is_retainer && (
                      <span className="px-2 py-1 rounded-sm text-[11px] font-medium bg-brand-gold/10 text-brand-gold flex items-center gap-1">
                        <RefreshCw size={9} />{viewProject.retainer_cycle ?? "Retainer"}
                      </span>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">

                {/* Progress pipeline */}
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Progress</p>
                  <Pipeline status={viewProject.status} isRetainer={viewProject.is_retainer} />
                </div>

                {/* Summary */}
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Summary</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Budget", value: viewProject.budget ? fmt(viewProject.budget) : "TBD" },
                      { label: "Type", value: viewProject.type ?? "—" },
                      { label: "Start", value: fmtDate(viewProject.start_date) },
                      { label: viewProject.is_retainer ? "First billing" : "End", value: fmtDate(viewProject.end_date) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium text-foreground capitalize mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  {viewProject.notes && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-sm">
                      <p className="text-xs text-muted-foreground leading-relaxed">{viewProject.notes}</p>
                    </div>
                  )}
                </div>

                {/* Automation & Comms Config */}
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Automation</p>
                  <div className="space-y-3">
                    {/* Auto-complete */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!viewProject.auto_complete_on_tasks}
                        onChange={async (e) => {
                          const v = e.target.checked;
                          await fetch(`/api/admin/projects/${viewProject.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ auto_complete_on_tasks: v }),
                          });
                          setViewProject((p) => p ? { ...p, auto_complete_on_tasks: v } : p);
                          setProjects((prev) => prev.map((p) => p.id === viewProject.id ? { ...p, auto_complete_on_tasks: v } : p));
                        }}
                        className="mt-0.5 accent-brand-gold"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">Auto-complete project</p>
                        <p className="text-xs text-muted-foreground">When all tasks are marked done, automatically set this project to Completed</p>
                      </div>
                    </label>

                    {/* Client comms */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!viewProject.client_comms_enabled}
                        onChange={async (e) => {
                          const v = e.target.checked;
                          await fetch(`/api/admin/projects/${viewProject.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ client_comms_enabled: v }),
                          });
                          setViewProject((p) => p ? { ...p, client_comms_enabled: v } : p);
                          setProjects((prev) => prev.map((p) => p.id === viewProject.id ? { ...p, client_comms_enabled: v } : p));
                        }}
                        className="mt-0.5 accent-brand-gold"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">Send client progress updates</p>
                        <p className="text-xs text-muted-foreground">
                          Email the client automatically when tasks are completed
                          {viewProject.clients?.email ? ` → ${viewProject.clients.email}` : " (no client email on record)"}
                        </p>
                      </div>
                    </label>

                    {/* Trigger timing */}
                    {viewProject.client_comms_enabled && (
                      <div className="ml-7">
                        <p className="text-xs text-muted-foreground mb-1">Send communication when:</p>
                        <select
                          value={viewProject.comm_trigger ?? "on_approval"}
                          onChange={async (e) => {
                            const v = e.target.value;
                            await fetch(`/api/admin/projects/${viewProject.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ comm_trigger: v }),
                            });
                            setViewProject((p) => p ? { ...p, comm_trigger: v } : p);
                            setProjects((prev) => prev.map((p) => p.id === viewProject.id ? { ...p, comm_trigger: v } : p));
                          }}
                          className="w-full px-2.5 py-1.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="on_approval">Task is reviewed &amp; approved (admin moves from In Review → Completed)</option>
                          <option value="on_completion">Task is marked done (any transition to Completed)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Client Portal ──────────────────────────────────────────── */}
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 size={13} className="text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client Portal</p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={!!viewProject.portal_enabled}
                      onChange={async (e) => {
                        const v = e.target.checked;
                        await fetch(`/api/admin/projects/${viewProject.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ portal_enabled: v }),
                        });
                        setViewProject((p) => p ? { ...p, portal_enabled: v } : p);
                        setProjects((prev) => prev.map((p) => p.id === viewProject.id ? { ...p, portal_enabled: v } : p));
                      }}
                      className="mt-0.5 accent-brand-gold"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">Activate client portal link</p>
                      <p className="text-xs text-muted-foreground">
                        When enabled, the client can visit a page showing project progress, tasks, and communications.
                        Include the link in your next update email or share it directly.
                      </p>
                    </div>
                  </label>

                  {viewProject.portal_token && (
                    <div className="space-y-2">
                      {/* Link preview */}
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-sm border text-xs font-mono truncate",
                        viewProject.portal_enabled
                          ? "border-brand-gold/30 bg-brand-gold/5 text-foreground"
                          : "border-border bg-muted/40 text-muted-foreground"
                      )}>
                        <ExternalLink size={11} className="shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {typeof window !== "undefined" ? window.location.origin : ""}/updates/{viewProject.portal_token}
                        </span>
                      </div>

                      {viewProject.portal_enabled && (
                        <div className="flex gap-2">
                          {/* Copy link */}
                          <button
                            onClick={async () => {
                              const url = `${window.location.origin}/updates/${viewProject.portal_token}`;
                              await navigator.clipboard.writeText(url);
                              setPortalCopied(true);
                              setTimeout(() => setPortalCopied(false), 2000);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-sm border border-border hover:border-brand-gold/40 hover:text-foreground text-muted-foreground transition-colors"
                          >
                            <Copy size={11} />
                            {portalCopied ? "Copied!" : "Copy link"}
                          </button>

                          {/* Share via WhatsApp */}
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/updates/${viewProject.portal_token}`;
                              const msg = encodeURIComponent(
                                `Hi${viewProject.clients?.name ? ` ${viewProject.clients.name.split(" ")[0]}` : ""},\n\nHere is your project updates link for *${viewProject.name}*:\n${url}\n\nYou can track progress, tasks, and all communications from this page.`
                              );
                              window.open(`https://wa.me/?text=${msg}`, "_blank");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-sm bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium"
                          >
                            💬 Share via WhatsApp
                          </button>

                          {/* Open in new tab */}
                          <a
                            href={`/updates/${viewProject.portal_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 flex items-center justify-center rounded-sm border border-border hover:border-brand-gold/40 text-muted-foreground hover:text-foreground transition-colors"
                            title="Preview portal"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}

                      {!viewProject.portal_enabled && (
                        <p className="text-xs text-muted-foreground/60 italic">
                          Enable the portal above to activate this link and share it with your client.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Retainer details */}
                {viewProject.is_retainer && (
                  <div className="px-6 py-5 border-b border-border bg-brand-gold/5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Retainer</p>
                    <div className="flex items-center gap-2">
                      <RefreshCw size={14} className="text-brand-gold" />
                      <p className="text-sm text-foreground">
                        {viewProject.retainer_cycle
                          ? `${viewProject.retainer_cycle.charAt(0).toUpperCase() + viewProject.retainer_cycle.slice(1)} billing cycle`
                          : "Recurring engagement"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Create an invoice each billing cycle from the Invoices module and link it to this project to track recurring payments.
                    </p>
                  </div>
                )}

                {/* Consultancy Rate History */}
                {(viewProject.is_retainer || viewProject.type === "consultancy") && (
                  <div className="px-6 py-5 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consultancy Rate</p>
                      <button
                        onClick={() => {
                          setRateForm({ ...defaultRateForm, effective_from: new Date().toISOString().split("T")[0] });
                          setRateError("");
                          setRateModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 hover:text-foreground transition-colors text-muted-foreground"
                      >
                        <TrendingUp size={12} />Update Rate
                      </button>
                    </div>

                    {/* Current rate */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-bold font-display text-foreground">
                        {viewProject.monthly_rate ? fmt(viewProject.monthly_rate) : "Rate not set"}
                      </span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>

                    {/* Rate history timeline */}
                    {(viewProject.consultancy_rate_history ?? []).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">History</p>
                        <div className="space-y-2">
                          {(viewProject.consultancy_rate_history ?? []).map((entry, idx) => (
                            <div key={entry.id} className="flex items-start gap-3 group/rate">
                              <div className="flex flex-col items-center shrink-0 pt-0.5">
                                <div className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  idx === 0 ? "bg-brand-gold" : "bg-border"
                                )} />
                                {idx < (viewProject.consultancy_rate_history?.length ?? 0) - 1 && (
                                  <div className="w-px h-full bg-border mt-1" style={{ minHeight: 16 }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-foreground">{fmt(entry.monthly_rate)}<span className="text-muted-foreground font-normal text-xs">/mo</span></span>
                                  <span className="text-[11px] text-muted-foreground">from {fmtDate(entry.effective_from)}</span>
                                  {idx === 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-brand-gold/10 text-brand-gold font-medium">Current</span>
                                  )}
                                </div>
                                {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
                              </div>
                              <button
                                onClick={() => handleDeleteRate(entry.id)}
                                className="p-1 rounded-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors opacity-0 group-hover/rate:opacity-100 shrink-0"
                                title="Remove entry"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(viewProject.consultancy_rate_history ?? []).length === 0 && !viewProject.monthly_rate && (
                      <p className="text-sm text-muted-foreground py-1">No rate set yet. Click "Update Rate" to record the starting rate.</p>
                    )}
                  </div>
                )}

                {/* Invoices & Payments */}
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoices & Payments</p>
                    {invoiceTotal > 0 && (
                      <div className="flex gap-3 text-xs">
                        <span className="text-muted-foreground">Total: <span className="text-foreground font-semibold">{fmt(invoiceTotal)}</span></span>
                        {outstanding > 0 && <span className="text-orange-400 font-semibold">Outstanding: {fmt(outstanding)}</span>}
                      </div>
                    )}
                  </div>
                  {(viewProject.invoices ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No invoices linked to this project yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {viewProject.invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)}
                    </div>
                  )}
                </div>

                {/* Proposals & Agreements */}
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proposals &amp; Agreements</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateDocForProject("proposal")}
                        disabled={generatingDocType !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 hover:text-foreground transition-colors text-muted-foreground disabled:opacity-50"
                      >
                        {generatingDocType === "proposal" ? <Loader2 size={12} className="animate-spin" /> : <Briefcase size={12} />}
                        {generatingDocType === "proposal" ? "Generating…" : "Generate Proposal"}
                      </button>
                      <button
                        onClick={() => generateDocForProject("agreement")}
                        disabled={generatingDocType !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 hover:text-foreground transition-colors text-muted-foreground disabled:opacity-50"
                      >
                        {generatingDocType === "agreement" ? <Loader2 size={12} className="animate-spin" /> : <ScrollText size={12} />}
                        {generatingDocType === "agreement" ? "Generating…" : "Generate Agreement"}
                      </button>
                    </div>
                  </div>
                  {(viewProject.generated_documents ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No proposal or agreement prepared for this project yet — generate one directly from what&apos;s already known about it.</p>
                  ) : (
                    <div className="space-y-2">
                      {(viewProject.generated_documents ?? []).map((doc) => {
                        const Icon = doc.type === "proposal" ? Briefcase : ScrollText;
                        return (
                          <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-sm border border-border group/gdoc hover:border-brand-gold/30 transition-colors">
                            <Icon size={16} className="text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{doc.title}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {doc.reference_code} · {fmtDate(doc.created_at)}
                                {doc.accepted_at ? " · Accepted" : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => viewGeneratedDoc(doc)} className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="View">
                                <Eye size={13} />
                              </button>
                              <button onClick={() => resendGeneratedDoc(doc)} className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Resend">
                                <Send size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={docUploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 hover:text-foreground transition-colors text-muted-foreground disabled:opacity-50"
                    >
                      <Upload size={12} />
                      {docUploading ? "Uploading…" : "Upload"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {documents.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-border rounded-sm p-6 text-center cursor-pointer hover:border-brand-gold/40 transition-colors"
                    >
                      <Upload size={20} className="mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">Upload proposals, contracts, briefs, or any project file</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">PDF, DOC, DOCX, images · max 10 MB</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-sm border border-border group/doc hover:border-brand-gold/30 transition-colors">
                          <FileText size={16} className="text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{doc.name}</p>
                            <p className="text-[11px] text-muted-foreground">{fmtDate(doc.uploaded_at)}{doc.size_bytes ? ` · ${fmtBytes(doc.size_bytes)}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover/doc:opacity-100 transition-opacity">
                            {doc.url && (
                              <a href={doc.url} target="_blank" rel="noreferrer" className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Open">
                                <ChevronRight size={13} />
                              </a>
                            )}
                            <button onClick={() => handleDocDelete(doc.id)} className="p-1 rounded-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Delete">
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasks */}
                <div className="px-6 py-5 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tasks ({tasks.length})
                    </p>
                    <button
                      onClick={() => { setTaskFormOpen(true); setTaskError(""); setTaskForm(defaultTaskForm); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[11px] font-semibold hover:bg-brand-gold/20 transition-colors"
                    >
                      <Plus size={11} /> Add Task
                    </button>
                  </div>

                  {tasksLoading ? (
                    <p className="text-xs text-muted-foreground">Loading tasks…</p>
                  ) : tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No tasks yet. Add the first task to get started.</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => {
                        const statusColors: Record<string, string> = {
                          todo: "text-muted-foreground bg-muted",
                          in_progress: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
                          review: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
                          done: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
                        };
                        const priorityDot: Record<string, string> = {
                          low: "bg-slate-400", normal: "bg-blue-400", high: "bg-red-400",
                        };
                        return (
                          <div key={task.id} className="flex items-start gap-2.5 p-2.5 rounded-sm border border-border bg-muted/20 hover:bg-muted/40 transition-colors group/task">
                            <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", priorityDot[task.priority] ?? "bg-slate-400")} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground leading-snug">{task.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-sm capitalize", statusColors[task.status] ?? "text-muted-foreground bg-muted")}>
                                  {task.status.replace(/_/g, " ")}
                                </span>
                                {task.team_members?.name && (
                                  <span className="text-[10px] text-muted-foreground">→ {task.team_members.name}</span>
                                )}
                                {task.due_date && (
                                  <span className="text-[10px] text-muted-foreground">{fmtDate(task.due_date)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity shrink-0">
                              {task.status !== "done" && (
                                <button
                                  onClick={() => handleTaskStatus(task.id, task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "review" : "done")}
                                  className="px-2 py-0.5 text-[10px] font-medium rounded-sm border border-border hover:border-brand-gold/40 text-muted-foreground hover:text-foreground transition-colors"
                                  title="Advance status"
                                >
                                  {task.status === "todo" ? "Start" : task.status === "in_progress" ? "Review" : "Done"}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 rounded-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                title="Delete task"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Task form */}
                  {taskFormOpen && (
                    <form onSubmit={handleCreateTask} className="mt-3 space-y-3 p-3 rounded-sm border border-brand-gold/20 bg-muted/20">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Task Title *</label>
                        <input
                          value={taskForm.title}
                          onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                          required
                          placeholder="e.g. Design homepage wireframes"
                          className="w-full px-2.5 py-1.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Priority</label>
                          <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value as "low" | "normal" | "high" }))}
                            className="w-full px-2.5 py-1.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50">
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Due Date</label>
                          <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Assign To</label>
                        <select value={taskForm.assigned_to} onChange={(e) => setTaskForm((f) => ({ ...f, assigned_to: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50">
                          <option value="">Unassigned (Godwin)</option>
                          {subcontractors.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description (optional)</label>
                        <textarea value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                          rows={2} placeholder="Task details, requirements…"
                          className="w-full px-2.5 py-1.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50 resize-none" />
                      </div>
                      {taskError && <p className="text-xs text-red-400">{taskError}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setTaskFormOpen(false)}
                          className="flex-1 py-1.5 text-xs rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          Cancel
                        </button>
                        <button type="submit" disabled={taskSaving}
                          className="flex-1 py-1.5 text-xs rounded-sm bg-brand-gold text-brand-navy font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-60">
                          {taskSaving ? "Creating…" : "Create Task"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Sticky footer — primary actions */}
              <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex-row items-center gap-3">
                {/* Status quick-change */}
                <div className="flex-1">
                  <select
                    value={viewProject.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusChanging}
                    className="w-full px-3 py-2 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    {[...Object.keys(statusColors)].map((s) => (
                      <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Mark completed */}
                {viewProject.status !== "completed" && (
                  <Button
                    onClick={() => handleStatusChange("completed")}
                    disabled={statusChanging}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <CheckCircle2 size={14} className="mr-1.5" />
                    Mark Completed
                  </Button>
                )}

                {/* Edit button */}
                <Button
                  variant="outline"
                  onClick={() => { setViewOpen(false); openEdit(viewProject); }}
                  className="shrink-0"
                >
                  <Pencil size={13} className="mr-1.5" />Edit
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DocumentViewerSheet doc={docViewerTarget} onClose={() => setDocViewerTarget(null)} />

      <EmailComposer
        open={emailDocOpen}
        onClose={() => { setEmailDocOpen(false); setEmailDocTarget(null); }}
        recipient={viewProject?.clients?.email ? { clientId: viewProject.client_id ?? undefined, name: viewProject.clients.name ?? "Client", email: viewProject.clients.email } : null}
        linkDocument={emailDocTarget}
      />
    </div>
  );
}
