/**
 * Shared TypeScript types derived from the Brightex database schema.
 * These supplement the inline Zod schemas in API routes and provide
 * a single source of truth for row shapes used across the codebase.
 */

// ─── Common ──────────────────────────────────────────────────────────────────

export type SoftDeletable = {
  deleted_at: string | null;
};

export type Timestamped = {
  created_at: string;
};

// ─── Clients & Leads ─────────────────────────────────────────────────────────

export type ClientClassification =
  | "lead"
  | "qualified"
  | "unqualified"
  | "ghost"
  | "active"
  | "past";

export type Client = Timestamped &
  SoftDeletable & {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    classification: ClientClassification;
    source: string | null;
    notes: string | null;
    last_contacted_at: string | null;
  };

// ─── Projects ────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | "discovery"
  | "design"
  | "development"
  | "review"
  | "live"
  | "paused"
  | "completed";

export type Project = Timestamped &
  SoftDeletable & {
    id: string;
    client_id: string | null;
    name: string;
    type: string | null;
    status: ProjectStatus;
    budget: number | null;
    start_date: string | null;
    end_date: string | null;
    is_retainer: boolean;
    retainer_cycle: "monthly" | "quarterly" | "yearly" | null;
    monthly_rate: number | null;
    notes: string | null;
    auto_complete_on_tasks: boolean;
    client_comms_enabled: boolean;
    comm_trigger: "on_approval" | "on_completion";
    clients?: Pick<Client, "id" | "name" | "company" | "email"> | null;
  };

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "normal" | "high";

export type Task = Timestamped &
  SoftDeletable & {
    id: string;
    project_id: string | null;
    title: string;
    description: string | null;
    assigned_to: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    deliverable_url: string | null;
    notes: string | null;
    board_order: number;
    category: string | null;
    completed_at: string | null;
    approved_by: string | null;
    approved_at: string | null;
    team_members?: Pick<TeamMember, "id" | "name" | "role"> | null;
    projects?: Pick<Project, "id" | "name" | "status"> | null;
  };

// ─── Sales ───────────────────────────────────────────────────────────────────

export type SaleStatus = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export type Sale = Timestamped &
  SoftDeletable & {
    id: string;
    client_id: string | null;
    service: string | null;
    estimated_value: number | null;
    status: SaleStatus;
    notes: string | null;
    clients?: Pick<Client, "id" | "name" | "company"> | null;
  };

// ─── Invoices ────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type InvoiceLineItem = {
  description: string;
  qty: number;
  unit_price: number;
  total: number;
};

export type Invoice = Timestamped &
  SoftDeletable & {
    id: string;
    client_id: string | null;
    project_id: string | null;
    invoice_number: string | null;
    items: InvoiceLineItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: InvoiceStatus;
    due_date: string | null;
    notes: string | null;
    clients?: Pick<Client, "id" | "name" | "email"> | null;
    projects?: Pick<Project, "id" | "name"> | null;
    payments?: Payment[];
  };

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentMethod = "mpesa" | "bank" | "paypal" | "cash" | "other";

export type Payment = Timestamped & {
  id: string;
  invoice_id: string | null;
  amount: number;
  method: PaymentMethod | null;
  reference: string | null;
  confirmation_sent: boolean;
  date: string;
  notes: string | null;
  invoices?: Pick<Invoice, "id" | "invoice_number" | "total" | "client_id"> | null;
};

// ─── Team Members ─────────────────────────────────────────────────────────────

export type TeamRole = "subcontractor" | "marketing" | "finance" | "support";

export type TeamMember = Timestamped &
  SoftDeletable & {
    id: string;
    user_id: string | null;
    name: string;
    email: string;
    phone: string | null;
    role: TeamRole;
    skill_tags: string[];
    rate_type: "fixed" | "hourly" | null;
    default_rate: number | null;
    notes: string | null;
    active: boolean;
  };

// ─── Bookings ────────────────────────────────────────────────────────────────

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type Booking = Timestamped &
  SoftDeletable & {
    id: string;
    booker_name: string;
    booker_email: string;
    booker_phone: string | null;
    purpose: string | null;
    scheduled_at: string;
    duration_minutes: number;
    status: BookingStatus;
    meeting_link: string | null;
    notes: string | null;
    reminder_sent: boolean;
  };

// ─── Subscriptions ───────────────────────────────────────────────────────────

export type SubscriptionCategory = "domain" | "hosting" | "tool" | "software" | "other";
export type SubscriptionOwnership = "internal" | "on_behalf" | "client_managed";
export type BillingCycle = "monthly" | "yearly" | "one_time";

export type Subscription = Timestamped &
  SoftDeletable & {
    id: string;
    name: string;
    provider: string | null;
    category: SubscriptionCategory;
    ownership: SubscriptionOwnership;
    client_id: string | null;
    amount: number | null;
    currency: string;
    billing_cycle: BillingCycle;
    next_renewal_date: string;
    last_paid_date: string | null;
    auto_renew: boolean;
    login_url: string | null;
    notes: string | null;
    active: boolean;
  };

// ─── Sites ───────────────────────────────────────────────────────────────────

export type SiteStatus = "up" | "down" | "degraded" | "unknown";
export type SiteIntegrationLevel = "passive" | "active" | "wordpress";

export type Site = Timestamped & {
  id: string;
  name: string;
  url: string;
  platform: string | null;
  hosting: string | null;
  status: SiteStatus;
  last_checked: string | null;
  response_time_ms: number | null;
  ssl_expiry: string | null;
  wp_version: string | null;
  requires_update: boolean;
  notes: string | null;
  integration_level: SiteIntegrationLevel | null;
  health_endpoint: string | null;
  health_token: string | null;
};

// ─── Calendar Events ──────────────────────────────────────────────────────────

export type CalendarEventType =
  | "project_milestone"
  | "task_deadline"
  | "social_post"
  | "subscription_renewal"
  | "booking"
  | "reminder"
  | "personal";

export type CalendarEvent = Timestamped & {
  id: string;
  title: string;
  description: string | null;
  type: CalendarEventType;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string | null;
  entity_type: string | null;
  entity_id: string | null;
  repeat_rule: "monthly" | "yearly" | null;
  reminder_sent: boolean;
};

// ─── System Alerts ────────────────────────────────────────────────────────────

export type AlertType =
  | "site_down"
  | "ssl_expiring"
  | "wp_update"
  | "invoice_overdue"
  | "subscription_renewal"
  | "subscription_overdue"
  | "db_warn";

export type AlertSeverity = "info" | "warning" | "critical";

export type SystemAlert = Timestamped & {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  entity_id: string | null;
  entity_type: string | null;
  acknowledged: boolean;
};

// ─── Social Posts ─────────────────────────────────────────────────────────────

export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "linkedin" | "whatsapp";
export type SocialPostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "posted"
  | "archived";

export type SocialPost = Timestamped &
  SoftDeletable & {
    id: string;
    created_by: string | null;
    platforms: SocialPlatform[];
    caption: string;
    media_urls: string[];
    hashtags: string[];
    scheduled_at: string | null;
    status: SocialPostStatus;
    approved_by: string | null;
    approved_at: string | null;
    posted_at: string | null;
    notes: string | null;
  };

// ─── Communications ───────────────────────────────────────────────────────────

export type CommType = "email" | "whatsapp" | "call" | "meeting";
export type CommDirection = "out" | "in";

export type Communication = Timestamped & {
  id: string;
  client_id: string | null;
  type: CommType;
  subject: string | null;
  body: string | null;
  direction: CommDirection;
  sent_at: string;
  status: string | null;
};

// ─── Finance ─────────────────────────────────────────────────────────────────

export type IncomeRecord = Timestamped & {
  id: string;
  source: string;
  description: string | null;
  client_id: string | null;
  payment_id: string | null;
  amount: number;
  currency: string;
  date: string;
  category: string;
  tax_applicable: boolean;
  notes: string | null;
};

export type Expense = Timestamped & {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  reference: string | null;
  receipt_url: string | null;
  tax_deductible: boolean;
  notes: string | null;
  added_by: string | null;
};

// ─── AI Settings (for admin toggle) ──────────────────────────────────────────

export type AIProvider = "anthropic" | "gemini";

export type AISettings = {
  ai_enabled: boolean;
  ai_provider: AIProvider;
  ai_model: string;
};

// Canonical model IDs per provider (free-tier first)
export const CLAUDE_MODELS = {
  haiku:  "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus:   "claude-opus-4-8",
} as const;

export const GEMINI_MODELS = {
  flash:      "gemini-2.0-flash",
  flash_15:   "gemini-1.5-flash",
  pro_15:     "gemini-1.5-pro",
} as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];
export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];
