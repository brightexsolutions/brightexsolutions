"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, X, Pencil, Trash2, User, FolderOpen, Calendar, Flag,
  CheckCircle2, BarChart3, Clock, AlertTriangle, CheckSquare,
  Link2Off, RefreshCw, Sparkles, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/admin/confirm-dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = { id: string; name: string; role: string };
type Project = { id: string; name: string; status: string; type?: string | null; notes?: string | null; budget?: number | null };

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  board_order: number;
  category: string | null;
  assigned_to: string | null;
  project_id: string | null;
  completed_at: string | null;
  approved_at: string | null;
  notes: string | null;
  team_members: { id: string; name: string; role: string } | null;
  projects: { id: string; name: string; status: string } | null;
};

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS = [
  { id: "backlog",     label: "Backlog",     color: "border-t-slate-400",   dot: "bg-slate-400",   description: "Not yet started" },
  { id: "todo",        label: "To Do",       color: "border-t-blue-400",    dot: "bg-blue-400",    description: "Ready to work on" },
  { id: "in_progress", label: "In Progress", color: "border-t-amber-400",   dot: "bg-amber-400",   description: "Actively being worked on" },
  { id: "review",      label: "In Review",   color: "border-t-purple-400",  dot: "bg-purple-400",  description: "Awaiting review / approval" },
  { id: "done",        label: "Completed",   color: "border-t-emerald-400", dot: "bg-emerald-400", description: "Done and approved" },
] as const;

type ColId = typeof COLUMNS[number]["id"];

const PRIORITY_STYLES: Record<string, string> = {
  high:   "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  normal: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  low:    "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
};

const CATEGORIES = ["general", "design", "development", "admin", "marketing", "finance", "support", "other"];

type Priority = "low" | "normal" | "high";

const EMPTY_FORM = {
  title: "", description: "", priority: "normal" as Priority,
  status: "todo" as ColId, due_date: "", project_id: "", assigned_to: "", category: "general", notes: "",
};

// ── Sortable Task Card ────────────────────────────────────────────────────────

function TaskCard({ task, onClick, isDragOverlay }: { task: Task; onClick: () => void; isDragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const daysRemaining = task.due_date && task.status !== "done"
    ? Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000)
    : null;
  const isOverdue = daysRemaining !== null && daysRemaining < 0;
  const isDueSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 2;

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-sm p-3 cursor-grab active:cursor-grabbing select-none",
        "hover:border-brand-gold/40 hover:shadow-sm transition-all group",
        isOverdue && "border-red-500/30 dark:border-red-500/20",
        isDragOverlay && "shadow-xl rotate-1 border-brand-gold/50 cursor-grabbing",
      )}
    >
      {/* Overdue banner */}
      {isOverdue && (
        <div className="flex items-center gap-1 mb-1.5 -mx-3 -mt-3 px-3 pt-1.5 pb-1.5 bg-red-500/10 border-b border-red-500/20 rounded-t-sm">
          <AlertTriangle size={10} className="text-red-500 shrink-0" />
          <span className="text-[10px] font-semibold text-red-500">Overdue · {Math.abs(daysRemaining!)}d past due</span>
        </div>
      )}

      {/* Project badge */}
      {task.projects && (
        <div className="flex items-center gap-1 mb-1.5">
          <FolderOpen size={10} className="text-brand-gold shrink-0" />
          <span className="text-[10px] text-brand-gold/80 truncate font-medium">{task.projects.name}</span>
        </div>
      )}
      {!task.projects && task.category && (
        <div className="mb-1.5">
          <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 rounded bg-muted">{task.category}</span>
        </div>
      )}

      <p className="text-sm font-medium text-foreground leading-snug mb-2">{task.title}</p>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize", PRIORITY_STYLES[task.priority])}>
          {task.priority}
        </span>

        {task.due_date && task.status !== "done" && daysRemaining !== null && (
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-medium",
            isOverdue ? "text-red-500" : isDueSoon ? "text-amber-500" : "text-muted-foreground"
          )}>
            <Clock size={10} />
            {isOverdue
              ? `${Math.abs(daysRemaining)}d overdue`
              : daysRemaining === 0
                ? "Due today"
                : daysRemaining === 1
                  ? "Due tomorrow"
                  : `${daysRemaining}d left`}
          </span>
        )}

        {task.due_date && task.status === "done" && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar size={10} />
            {new Date(task.due_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
          </span>
        )}

        {task.team_members && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
            <User size={10} />
            {task.team_members.name.split(" ")[0]}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Droppable Column ──────────────────────────────────────────────────────────

function Column({
  col, tasks, onCardClick, onAddInColumn,
}: {
  col: typeof COLUMNS[number];
  tasks: Task[];
  onCardClick: (t: Task) => void;
  onAddInColumn: (colId: ColId) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className={cn("flex flex-col min-w-[240px] w-[240px] xl:w-[260px] shrink-0")}>
      {/* Column header */}
      <div className={cn("bg-card border border-border rounded-sm border-t-4 p-3 mb-2", col.color)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full shrink-0", col.dot)} />
            <span className="font-semibold text-sm text-foreground">{col.label}</span>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 font-medium">{tasks.length}</span>
          </div>
          <button
            onClick={() => onAddInColumn(col.id)}
            className="w-6 h-6 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={`Add task to ${col.label}`}
          >
            <Plus size={13} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{col.description}</p>
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] space-y-2 p-1 rounded-sm transition-colors",
          isOver && "bg-brand-gold/5 ring-1 ring-brand-gold/30",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onClick={() => onCardClick(t)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-16 flex items-center justify-center border border-dashed border-border rounded-sm">
            <span className="text-xs text-muted-foreground">Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TasksClient() {
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [search, setSearch] = useState("");

  // Task detail / edit panel
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Create task dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, membersRes, projectsRes] = await Promise.all([
        fetch("/api/admin/tasks"),
        fetch("/api/admin/team?role=subcontractor"),
        fetch("/api/admin/projects"),
      ]);
      const [tasksJson, membersJson, projectsJson] = await Promise.all([
        tasksRes.json().catch(() => ({})),
        membersRes.json().catch(() => ({})),
        projectsRes.json().catch(() => ({})),
      ]);
      if (!tasksRes.ok) console.error("[tasks] load failed:", tasksJson.error);
      setTasks(tasksJson.data ?? []);
      setMembers(membersJson.data ?? []);
      setProjects(projectsJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let t = tasks;
    if (filterProject) t = t.filter((x) => x.project_id === filterProject);
    if (filterAssignee === "__unassigned") t = t.filter((x) => !x.assigned_to);
    else if (filterAssignee) t = t.filter((x) => x.assigned_to === filterAssignee);
    if (filterPriority) t = t.filter((x) => x.priority === filterPriority);
    if (search.trim()) {
      const q = search.toLowerCase();
      t = t.filter((x) => x.title.toLowerCase().includes(q) || x.projects?.name.toLowerCase().includes(q));
    }
    return t;
  }, [tasks, filterProject, filterAssignee, filterPriority, search]);

  const byColumn = useMemo(() => {
    const map: Record<ColId, Task[]> = { backlog: [], todo: [], in_progress: [], review: [], done: [] };
    filtered.forEach((t) => {
      const col = (t.status as ColId) in map ? (t.status as ColId) : "todo";
      map[col].push(t);
    });
    // Sort within each column by board_order
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.board_order - b.board_order));
    return map;
  }, [filtered]);

  // ── Analytics ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const overdue = tasks.filter((t) => t.due_date && t.status !== "done" && new Date(t.due_date) < new Date()).length;
    const unassigned = tasks.filter((t) => !t.assigned_to && t.status !== "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, overdue, unassigned, completionRate };
  }, [tasks]);

  // ── DnD Handlers ──────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine if over a column or over another task
    const isColumn = COLUMNS.some((c) => c.id === overId);
    const targetCol: ColId = isColumn
      ? (overId as ColId)
      : ((tasks.find((t) => t.id === overId)?.status as ColId) ?? task.status as ColId);

    const sameCol = task.status === targetCol;

    if (sameCol && isColumn) return; // dropped on same column header, no change

    if (sameCol) {
      // Reorder within same column
      const colTasks = [...byColumn[targetCol]];
      const oldIdx = colTasks.findIndex((t) => t.id === taskId);
      const newIdx = colTasks.findIndex((t) => t.id === overId);
      if (oldIdx === newIdx || newIdx === -1) return;

      const reordered = arrayMove(colTasks, oldIdx, newIdx);
      setTasks((prev) => {
        const others = prev.filter((t) => t.status !== targetCol);
        return [...others, ...reordered.map((t, i) => ({ ...t, board_order: i }))];
      });
      // Persist new order
      await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_order: newIdx }),
      });
    } else {
      // Move to different column
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: targetCol } : t));
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetCol }),
      });
      if (res.ok) {
        const json = await res.json();
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...json.data } : t));
      }
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  // ── Create Task ────────────────────────────────────────────────────────────

  function openCreate(defaultStatus?: ColId) {
    setCreateForm({ ...EMPTY_FORM, status: defaultStatus ?? "todo" });
    setCreateError("");
    setCreateOpen(true);
  }

  async function suggestTasksWithAI() {
    const projectId = createForm.project_id;
    const project = projects.find((p) => p.id === projectId);
    if (!project) { setCreateError("Select a project first so AI can suggest relevant tasks."); return; }
    setAiSuggesting(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "suggest_tasks",
          projectName: project.name,
          projectType: project.type || undefined,
          description: project.notes || undefined,
          budget: project.budget || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.result) && data.result.length > 0) {
        const first = data.result[0];
        setCreateForm((f) => ({
          ...f,
          title: first.title ?? f.title,
          description: first.description ?? f.description,
          priority: (first.priority as "low" | "normal" | "high") ?? f.priority,
          category: first.category ?? f.category,
        }));
        setCreateError(`AI suggested ${data.result.length} tasks. Showing task 1 of ${data.result.length}. Edit and save, then create the rest manually or re-run AI.`);
      } else {
        setCreateError(data.error ?? "AI suggestion failed. Try again.");
      }
    } catch { setCreateError("Network error."); }
    finally { setAiSuggesting(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description || undefined,
          priority: createForm.priority,
          status: createForm.status,
          due_date: createForm.due_date || undefined,
          assigned_to: createForm.assigned_to || null,
          project_id: createForm.project_id || null,
          category: createForm.category,
          notes: createForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setCreateError(json.error ?? "Failed to create task"); return; }
      setTasks((prev) => [json.data, ...prev]);
      setCreateOpen(false);
    } finally {
      setCreateSaving(false);
    }
  }

  // ── Task Detail / Edit ─────────────────────────────────────────────────────

  function openDetail(task: Task) {
    setDetailTask(task);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority as "low" | "normal" | "high",
      status: task.status as ColId,
      due_date: task.due_date ?? "",
      assigned_to: task.assigned_to ?? "",
      project_id: task.project_id ?? "",
      category: task.category ?? "general",
      notes: task.notes ?? "",
    });
    setDetailError("");
  }

  async function handleSaveDetail(e: React.FormEvent) {
    e.preventDefault();
    if (!detailTask) return;
    setSaving(true);
    setDetailError("");
    try {
      const res = await fetch(`/api/admin/tasks/${detailTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          priority: editForm.priority,
          status: editForm.status,
          due_date: editForm.due_date || null,
          assigned_to: editForm.assigned_to || null,
          project_id: editForm.project_id || null,
          category: editForm.category,
          notes: editForm.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setDetailError(json.error ?? "Failed to save"); return; }
      setTasks((prev) => prev.map((t) => t.id === detailTask.id ? { ...t, ...json.data } : t));
      setDetailTask(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(task: Task) {
    if (!await confirm({ message: `Delete "${task.title}"? This cannot be undone.` })) return;
    await fetch(`/api/admin/tasks/${task.id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setDetailTask(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare size={22} className="text-brand-gold" />
            Tasks Board
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stats.total} tasks total · {stats.completionRate}% complete</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="w-8 h-8 flex items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
          >
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Tasks", value: stats.total, icon: CheckSquare, color: "text-foreground" },
          { label: "Completion Rate", value: `${stats.completionRate}%`, icon: BarChart3, color: "text-emerald-500" },
          { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: stats.overdue > 0 ? "text-red-500" : "text-muted-foreground" },
          { label: "Unassigned Active", value: stats.unassigned, icon: User, color: stats.unassigned > 0 ? "text-amber-500" : "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-sm p-3">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={14} className={s.color} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</span>
            </div>
            <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm w-48"
        />
        <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
          className="h-8 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="__standalone">Standalone only</option>
        </select>
        <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}
          className="h-8 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">All assignees</option>
          <option value="__unassigned">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
          className="h-8 px-2.5 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        {(filterProject || filterAssignee || filterPriority || search) && (
          <button onClick={() => { setFilterProject(""); setFilterAssignee(""); setFilterPriority(""); setSearch(""); }}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-muted transition-colors">
            Clear
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} tasks shown</span>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Overall completion</span>
          <span>{stats.done} / {stats.total} done</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              col={col}
              tasks={byColumn[col.id]}
              onCardClick={openDetail}
              onAddInColumn={openCreate}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onClick={() => {}} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Create Task Dialog ──────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 mt-1">
            <div>
              <Label>Link to Project <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <select value={createForm.project_id} onChange={(e) => setCreateForm((f) => ({ ...f, project_id: e.target.value }))}
                className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Standalone (no project)</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Title *</Label>
                <button
                  type="button"
                  onClick={suggestTasksWithAI}
                  disabled={aiSuggesting || !createForm.project_id}
                  title={!createForm.project_id ? "Select a project first" : "Suggest task with AI"}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-hover font-medium transition-colors disabled:opacity-40"
                >
                  {aiSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {aiSuggesting ? "Thinking…" : "Suggest with AI"}
                </button>
              </div>
              <Input value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                required placeholder="What needs to be done?" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <select value={createForm.status} onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value as ColId }))}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={createForm.due_date} onChange={(e) => setCreateForm((f) => ({ ...f, due_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <select value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring capitalize">
                  {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Assign To <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <select value={createForm.assigned_to} onChange={(e) => setCreateForm((f) => ({ ...f, assigned_to: e.target.value }))}
                className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Unassigned (Godwin)</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Task details, requirements…" className="mt-1 resize-none text-sm" />
            </div>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={createSaving} className="flex-1 bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {createSaving ? "Creating…" : "Create Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Task Detail / Edit Panel ────────────────────────────────────────── */}
      {detailTask && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDetailTask(null)} />
          <div className="w-full max-w-md bg-background border-l border-border flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Edit Task</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => handleDelete(detailTask)}
                  className="w-8 h-8 flex items-center justify-center rounded-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                  <Trash2 size={15} />
                </button>
                <button onClick={() => setDetailTask(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveDetail} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  required className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as ColId }))}
                    className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <select value={editForm.priority} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                    className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Category</Label>
                  <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-1.5">
                  <FolderOpen size={13} /> Project Link
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <select value={editForm.project_id} onChange={(e) => setEditForm((f) => ({ ...f, project_id: e.target.value }))}
                    className="flex-1 px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Standalone</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {editForm.project_id && (
                    <button type="button" onClick={() => setEditForm((f) => ({ ...f, project_id: "" }))}
                      className="text-muted-foreground hover:text-foreground" title="Remove project link">
                      <Link2Off size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-1.5">
                  <User size={13} /> Assigned To
                </Label>
                <select value={editForm.assigned_to} onChange={(e) => setEditForm((f) => ({ ...f, assigned_to: e.target.value }))}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Unassigned (Godwin)</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3} className="mt-1 resize-none text-sm" />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Internal notes…" className="mt-1 resize-none text-sm" />
              </div>

              {/* Meta info */}
              {(detailTask.completed_at || detailTask.approved_at) && (
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                  {detailTask.completed_at && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-emerald-500" />
                      Completed {new Date(detailTask.completed_at).toLocaleDateString("en-KE")}
                    </div>
                  )}
                  {detailTask.approved_at && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-brand-gold" />
                      Admin-approved {new Date(detailTask.approved_at).toLocaleDateString("en-KE")}
                    </div>
                  )}
                </div>
              )}

              {detailError && <p className="text-xs text-red-500">{detailError}</p>}
            </form>

            <div className="px-5 py-4 border-t border-border flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDetailTask(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSaveDetail}
                disabled={saving}
                className="flex-1 bg-brand-gold text-brand-navy hover:bg-brand-gold-hover"
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
