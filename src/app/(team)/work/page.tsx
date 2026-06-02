"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, RotateCcw,
  Link2, Loader2, ArrowRight, Plus, FileText, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  deliverable_url: string | null;
  notes: string | null;
  completed_at: string | null;
  projects: { id: string; name: string; status: string } | null;
};

type Project = { id: string; name: string; status: string };
type Member = { id: string; name: string; role: string };

const STATUS_CONFIG: Record<string, { label: string; icon: typeof ClipboardList; colour: string; bg: string }> = {
  todo:        { label: "To Do",       icon: ClipboardList, colour: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-800" },
  in_progress: { label: "In Progress", icon: RotateCcw,     colour: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  review:      { label: "In Review",   icon: AlertCircle,   colour: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  done:        { label: "Done",        icon: CheckCircle2,  colour: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
};

const PRIORITY_BADGE: Record<string, string> = {
  high:   "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  normal: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  low:    "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
};

const NEXT_STATUS: Record<string, string> = {
  todo: "in_progress",
  in_progress: "review",
  review: "done",
};

const EMPTY_TASK_FORM = { project_id: "", title: "", description: "", priority: "normal", due_date: "" };

export default function WorkPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [deliverableInput, setDeliverableInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add task modal
  const [addOpen, setAddOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [addingSaving, setAddingSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Progress note modal
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteProjectId, setNoteProjectId] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch("/api/team/tasks"),
        fetch("/api/team/tasks?projects=1"),
      ]);
      const [tasksJson, projectsJson] = await Promise.all([tasksRes.json(), projectsRes.json()]);
      if (tasksRes.ok) {
        setTasks(tasksJson.data ?? []);
        setMember(tasksJson.member ?? null);
      }
      if (projectsRes.ok) setProjects(projectsJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(task: Task, newStatus: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/team/tasks?id=${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const json = await res.json();
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, ...json.data } : t));
        if (activeTask?.id === task.id) setActiveTask((d) => d ? { ...d, ...json.data } : d);
      }
    } finally {
      setSaving(false);
    }
  }

  async function submitDeliverable() {
    if (!activeTask || !deliverableInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/tasks?id=${activeTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverable_url: deliverableInput.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setTasks((prev) => prev.map((t) => t.id === activeTask.id ? { ...t, ...json.data } : t));
        setActiveTask((d) => d ? { ...d, deliverable_url: deliverableInput.trim() } : d);
        setDeliverableInput("");
      } else {
        const json = await res.json();
        setError(json.error ?? "Failed to save deliverable.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    setAddingSaving(true);
    setAddError("");
    try {
      const res = await fetch("/api/team/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          due_date: taskForm.due_date || undefined,
          description: taskForm.description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setAddError(json.error ?? "Failed to create task"); return; }
      setTasks((prev) => [json.data, ...prev]);
      setAddOpen(false);
      setTaskForm(EMPTY_TASK_FORM);
    } finally {
      setAddingSaving(false);
    }
  }

  async function handleProgressNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteProjectId || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      // Progress note = a new task titled "Progress Update" with the note as description, auto-set to done
      const res = await fetch("/api/team/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: noteProjectId,
          title: `Progress Update — ${new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}`,
          description: noteText.trim(),
          priority: "normal",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        // Immediately mark done so it surfaces as a completed progress note
        await fetch(`/api/team/tasks?id=${json.data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        });
        await load();
        setNoteOpen(false);
        setNoteText("");
        setNoteProjectId("");
      }
    } finally {
      setNoteSaving(false);
    }
  }

  const todo        = tasks.filter((t) => t.status === "todo");
  const inProgress  = tasks.filter((t) => t.status === "in_progress");
  const inReview    = tasks.filter((t) => t.status === "review");
  const done        = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            My Tasks{member ? `, ${member.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tasks assigned to you across active projects.
          </p>
        </div>
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setNoteProjectId(projects[0].id); setNoteOpen(true); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-border text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
            >
              <FileText size={14} /> Progress Note
            </button>
            <button
              onClick={() => { setTaskForm({ ...EMPTY_TASK_FORM, project_id: projects[0].id }); setAddOpen(true); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
            >
              <Plus size={14} /> Add Task
            </button>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "To Do",       count: todo.length,       colour: "text-slate-500" },
          { label: "In Progress", count: inProgress.length, colour: "text-blue-500" },
          { label: "In Review",   count: inReview.length,   colour: "text-amber-500" },
          { label: "Done",        count: done.length,       colour: "text-emerald-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-sm border border-border bg-card p-3 text-center">
            <p className={cn("text-2xl font-display font-bold", s.colour)}>{s.count}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="rounded-sm border border-border bg-card py-16 text-center text-sm text-muted-foreground">
          Loading your tasks…
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-sm border border-border bg-card py-16 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-20 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
          <p className="text-xs mt-1 text-muted-foreground">Check back when a project manager assigns work to you.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(["todo", "in_progress", "review", "done"] as const).map((statusKey) => {
            const group = tasks.filter((t) => t.status === statusKey);
            if (group.length === 0) return null;
            const config = STATUS_CONFIG[statusKey];
            const Icon = config.icon;
            return (
              <div key={statusKey} className="rounded-sm border border-border bg-card overflow-hidden">
                <div className={cn("px-4 py-2.5 border-b border-border flex items-center gap-2", config.bg)}>
                  <Icon size={14} className={config.colour} />
                  <span className={cn("text-xs font-semibold uppercase tracking-wider", config.colour)}>
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{group.length}</span>
                </div>
                <div className="divide-y divide-border">
                  {group.map((task) => {
                    const isOverdue = task.due_date && task.status !== "done" &&
                      new Date(task.due_date) < new Date();
                    const nextStatus = NEXT_STATUS[task.status];
                    const nextLabel = nextStatus ? STATUS_CONFIG[nextStatus]?.label : null;

                    return (
                      <div key={task.id} className="px-4 py-3.5 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                setActiveTask(task);
                                setDeliverableInput(task.deliverable_url ?? "");
                                setError(null);
                              }}
                              className="text-sm font-semibold text-foreground hover:text-brand-gold text-left transition-colors"
                            >
                              {task.title}
                            </button>
                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", PRIORITY_BADGE[task.priority])}>
                              {task.priority}
                            </span>
                          </div>
                          {task.projects && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Project: {task.projects.name}
                            </p>
                          )}
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1.5">
                            {task.due_date && (
                              <span className={cn("flex items-center gap-1 text-xs",
                                isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                                <Clock size={10} />
                                Due {new Date(task.due_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}
                                {isOverdue && " (overdue)"}
                              </span>
                            )}
                            {task.deliverable_url && (
                              <a
                                href={task.deliverable_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-brand-gold hover:underline"
                              >
                                <Link2 size={10} /> Deliverable
                              </a>
                            )}
                          </div>
                        </div>

                        {nextStatus && (
                          <button
                            disabled={saving}
                            onClick={() => void updateStatus(task, nextStatus)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 hover:text-brand-gold transition-colors text-muted-foreground whitespace-nowrap"
                          >
                            <ArrowRight size={11} /> Mark {nextLabel}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Task detail drawer ── */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setActiveTask(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative z-10 w-full sm:max-w-lg bg-background border border-border rounded-t-lg sm:rounded-sm shadow-xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">{activeTask.title}</h2>
                {activeTask.projects && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activeTask.projects.name}</p>
                )}
              </div>
              <button onClick={() => setActiveTask(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">
                <X size={16} />
              </button>
            </div>

            {activeTask.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{activeTask.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Status</p>
                <span className={cn("font-semibold", STATUS_CONFIG[activeTask.status]?.colour)}>
                  {STATUS_CONFIG[activeTask.status]?.label}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Priority</p>
                <span className="font-semibold capitalize">{activeTask.priority}</span>
              </div>
              {activeTask.due_date && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Due date</p>
                  <span className="font-semibold">
                    {new Date(activeTask.due_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>

            {activeTask.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-sm p-3 border border-border">{activeTask.notes}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Deliverable URL</p>
              {activeTask.deliverable_url && (
                <a href={activeTask.deliverable_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-brand-gold hover:underline mb-2">
                  <Link2 size={13} /> {activeTask.deliverable_url}
                </a>
              )}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={deliverableInput}
                  onChange={(e) => setDeliverableInput(e.target.value)}
                  placeholder="https://… (Google Drive, GitHub, Figma, etc.)"
                  className="flex-1 px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => void submitDeliverable()}
                  disabled={saving || !deliverableInput.trim()}
                  className="px-3 py-2 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : "Save"}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
            </div>

            {activeTask.status !== "done" && NEXT_STATUS[activeTask.status] && (
              <div className="flex gap-2 pt-1 border-t border-border">
                <button
                  disabled={saving}
                  onClick={() => void updateStatus(activeTask, NEXT_STATUS[activeTask.status])}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={14} />}
                  Move to {STATUS_CONFIG[NEXT_STATUS[activeTask.status]]?.label}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Task modal ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setAddOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative z-10 w-full sm:max-w-lg bg-background border border-border rounded-t-lg sm:rounded-sm shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-base font-bold text-foreground">Add New Task</h2>
              <button onClick={() => setAddOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              {projects.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Project</label>
                  <select value={taskForm.project_id}
                    onChange={(e) => setTaskForm((f) => ({ ...f, project_id: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Task Title *</label>
                <input required value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
                <textarea rows={3} value={taskForm.description}
                  onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Details, context, requirements…"
                  className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Priority</label>
                  <select value={taskForm.priority}
                    onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Due Date</label>
                  <input type="date" value={taskForm.due_date}
                    onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>
              {addError && <p className="text-xs text-red-500">{addError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAddOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-sm border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={addingSaving || !taskForm.project_id}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover disabled:opacity-50 transition-colors">
                  {addingSaving && <Loader2 size={13} className="animate-spin" />} Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Progress Note modal ── */}
      {noteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setNoteOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative z-10 w-full sm:max-w-lg bg-background border border-border rounded-t-lg sm:rounded-sm shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-base font-bold text-foreground">Write Progress Note</h2>
              <button onClick={() => setNoteOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              A progress note is logged as a completed task for your project manager to review.
            </p>
            <form onSubmit={handleProgressNote} className="space-y-4">
              {projects.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Project</label>
                  <select value={noteProjectId}
                    onChange={(e) => setNoteProjectId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Progress Update *
                </label>
                <textarea required rows={5} value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="What did you complete? What's in progress? Any blockers?"
                  className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setNoteOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-sm border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={noteSaving || !noteProjectId}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover disabled:opacity-50 transition-colors">
                  {noteSaving && <Loader2 size={13} className="animate-spin" />} Submit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
