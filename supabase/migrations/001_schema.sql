-- Brightex Solutions — Full Database Schema
-- Run this against your Supabase project (SQL Editor → Run)
-- New projects (May 30 2026+) require explicit GRANTs per table.

-- ─────────────────────────────────────────────
-- Enable uuid generation
-- ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- CONTACTS — public form submissions
-- ─────────────────────────────────────────────
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  contact text not null,
  service text,
  message text,
  status text default 'new',  -- new | read | replied
  created_at timestamptz default now()
);
grant all on contacts to service_role;

-- ─────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  classification text default 'lead',
  -- lead | qualified | unqualified | ghost | active | past
  source text,
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz default now()
);
grant all on clients to service_role;

-- ─────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  name text not null,
  type text,
  status text default 'discovery',
  -- discovery | design | development | review | live | paused
  budget numeric,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz default now()
);
grant all on projects to service_role;

-- ─────────────────────────────────────────────
-- SALES / PIPELINE
-- ─────────────────────────────────────────────
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  service text,
  estimated_value numeric,
  status text default 'lead',
  -- lead | proposal | negotiation | won | lost
  notes text,
  created_at timestamptz default now()
);
grant all on sales to service_role;

-- ─────────────────────────────────────────────
-- COMMUNICATIONS LOG
-- ─────────────────────────────────────────────
create table if not exists communications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  type text,  -- email | whatsapp | call | meeting
  subject text,
  body text,
  direction text default 'out',  -- out | in
  sent_at timestamptz default now(),
  status text default 'sent'
);
grant all on communications to service_role;

-- ─────────────────────────────────────────────
-- TEAM MEMBERS
-- ─────────────────────────────────────────────
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  role text not null,
  -- subcontractor | marketing | finance
  skill_tags text[],
  rate_type text,  -- fixed | hourly
  default_rate numeric,
  notes text,
  active boolean default true,
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
grant all on team_members to service_role;

-- ─────────────────────────────────────────────
-- TEAM INVITES
-- ─────────────────────────────────────────────
create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  role text not null,
  token text unique not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted boolean default false,
  accepted_at timestamptz,
  expires_at timestamptz default now() + interval '7 days',
  created_at timestamptz default now()
);
grant all on team_invites to service_role;

-- ─────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references team_members(id) on delete set null,
  status text default 'todo',
  -- todo | in_progress | review | done
  priority text default 'normal',
  -- low | normal | high
  due_date date,
  deliverable_url text,
  notes text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
grant all on tasks to service_role;

-- ─────────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────────
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  invoice_number text unique,
  items jsonb,
  subtotal numeric,
  tax numeric default 0,
  total numeric,
  status text default 'draft',
  -- draft | sent | paid | overdue | cancelled
  due_date date,
  notes text,
  created_at timestamptz default now()
);
grant all on invoices to service_role;

-- ─────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete set null,
  amount numeric not null,
  method text,  -- mpesa | bank | paypal | cash
  reference text,
  confirmation_sent boolean default false,
  date date default current_date,
  notes text,
  created_at timestamptz default now()
);
grant all on payments to service_role;

-- ─────────────────────────────────────────────
-- INCOME RECORDS
-- ─────────────────────────────────────────────
create table if not exists income_records (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  -- invoice_payment | retainer | other
  description text,
  client_id uuid references clients(id) on delete set null,
  payment_id uuid references payments(id) on delete set null,
  amount numeric not null,
  currency text default 'KES',
  date date not null default current_date,
  category text default 'service_revenue',
  -- service_revenue | retainer | consulting | other
  tax_applicable boolean default true,
  notes text,
  created_at timestamptz default now()
);
grant all on income_records to service_role;

-- ─────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null,
  amount numeric not null,
  currency text default 'KES',
  date date not null default current_date,
  vendor text,
  reference text,
  receipt_url text,
  tax_deductible boolean default true,
  notes text,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
grant all on expenses to service_role;

-- ─────────────────────────────────────────────
-- SUBCONTRACTOR PAYOUTS
-- ─────────────────────────────────────────────
create table if not exists subcontractor_payouts (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid references team_members(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  amount numeric not null,
  currency text default 'KES',
  status text default 'pending',  -- pending | paid
  due_date date,
  paid_date date,
  method text,
  reference text,
  notes text,
  created_at timestamptz default now()
);
grant all on subcontractor_payouts to service_role;

-- ─────────────────────────────────────────────
-- SUBCONTRACTOR EXPENSES
-- ─────────────────────────────────────────────
create table if not exists subcontractor_expenses (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid references team_members(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  description text,
  amount numeric not null,
  currency text default 'KES',
  file_url text,
  status text default 'received',  -- received | approved | paid
  received_date date default current_date,
  notes text,
  created_at timestamptz default now()
);
grant all on subcontractor_expenses to service_role;

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS (business costs)
-- ─────────────────────────────────────────────
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text,
  category text,  -- domain | hosting | tool | software | other
  amount numeric,
  currency text default 'KES',
  billing_cycle text,  -- monthly | yearly | one_time
  next_renewal_date date not null,
  auto_renew boolean default false,
  login_url text,
  owner_name text,
  owner_email text,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);
grant all on subscriptions to service_role;

-- ─────────────────────────────────────────────
-- PRODUCTS (Brightex-built, licensable)
-- ─────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  tagline text,
  description text,
  category text,
  features jsonb,
  screenshots text[],
  demo_url text,
  trial_days integer default 7,
  pricing_tiers jsonb,
  target_industries text[],
  status text default 'draft',  -- draft | published
  created_at timestamptz default now()
);
grant all on products to service_role;

-- ─────────────────────────────────────────────
-- AVAILABILITY SLOTS
-- ─────────────────────────────────────────────
create table if not exists availability_slots (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer,  -- 0=Sun … 6=Sat
  start_time time not null,
  end_time time not null,
  active boolean default true
);
grant all on availability_slots to service_role;

-- ─────────────────────────────────────────────
-- BLOCKED DATES
-- ─────────────────────────────────────────────
create table if not exists blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  reason text
);
grant all on blocked_dates to service_role;

-- ─────────────────────────────────────────────
-- BOOKINGS (public booking page)
-- ─────────────────────────────────────────────
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booker_name text not null,
  booker_email text not null,
  booker_phone text,
  purpose text,
  -- intro_call | project_review | consultation | other
  scheduled_at timestamptz not null,
  duration_minutes integer default 30,
  status text default 'pending',
  -- pending | confirmed | cancelled | completed
  meeting_link text,
  notes text,
  reminder_sent boolean default false,
  created_at timestamptz default now()
);
grant all on bookings to service_role;

-- ─────────────────────────────────────────────
-- PRODUCT TRIALS
-- ─────────────────────────────────────────────
create table if not exists product_trials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  requester_company text,
  requester_phone text,
  started_at timestamptz default now(),
  expires_at timestamptz,
  status text default 'active',
  -- active | expired | converted | cancelled
  demo_booked boolean default false,
  booking_id uuid references bookings(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);
grant all on product_trials to service_role;

-- ─────────────────────────────────────────────
-- PRODUCT SUBSCRIPTIONS
-- ─────────────────────────────────────────────
create table if not exists product_subscriptions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  plan_name text,
  billing_cycle text,  -- monthly | yearly
  amount numeric not null,
  currency text default 'KES',
  status text default 'active',
  -- active | cancelled | expired | paused
  started_at timestamptz default now(),
  next_billing_date date,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz default now()
);
grant all on product_subscriptions to service_role;

-- ─────────────────────────────────────────────
-- SOCIAL POSTS
-- ─────────────────────────────────────────────
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references team_members(id) on delete set null,
  platforms text[],
  caption text not null,
  media_urls text[],
  hashtags text[],
  scheduled_at timestamptz,
  status text default 'draft',
  -- draft | pending_approval | approved | posted | archived
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  posted_at timestamptz,
  notes text,
  created_at timestamptz default now()
);
grant all on social_posts to service_role;

-- ─────────────────────────────────────────────
-- ANNOUNCEMENTS
-- ─────────────────────────────────────────────
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  type text default 'info',
  -- info | offer | promo | alert
  cta_label text,
  cta_url text,
  display_location text[],
  -- banner | home_hero | contact_page
  active boolean default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);
grant all on announcements to service_role;

-- ─────────────────────────────────────────────
-- CHAT FAQs
-- ─────────────────────────────────────────────
create table if not exists chat_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  keywords text[],
  category text,
  -- services | products | pricing | process | general
  order_index integer default 0,
  active boolean default true,
  created_at timestamptz default now()
);
grant all on chat_faqs to service_role;

-- ─────────────────────────────────────────────
-- CHAT SESSIONS
-- ─────────────────────────────────────────────
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text,
  messages jsonb default '[]',
  escalated boolean default false,
  escalation_type text,  -- whatsapp | contact_form | null
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);
grant all on chat_sessions to service_role;

-- ─────────────────────────────────────────────
-- SITES (monitoring)
-- ─────────────────────────────────────────────
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  platform text,
  -- nextjs | wordpress | custom | other
  hosting text,
  integration_level text default 'passive',
  -- passive | active | wordpress
  health_token text,
  status text default 'unknown',
  -- up | down | degraded | unknown
  last_checked timestamptz,
  response_time_ms integer,
  ssl_expiry date,
  wp_version text,
  requires_update boolean default false,
  notes text,
  created_at timestamptz default now()
);
grant all on sites to service_role;

-- ─────────────────────────────────────────────
-- CALENDAR EVENTS
-- ─────────────────────────────────────────────
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null,
  -- project_milestone | task_deadline | social_post | subscription_renewal
  -- booking | reminder | personal
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean default false,
  color text,
  entity_type text,
  entity_id uuid,
  repeat_rule text,
  reminder_sent boolean default false,
  created_at timestamptz default now()
);
grant all on calendar_events to service_role;

-- ─────────────────────────────────────────────
-- SYSTEM ALERTS
-- ─────────────────────────────────────────────
create table if not exists system_alerts (
  id uuid primary key default gen_random_uuid(),
  type text,
  -- site_down | ssl_expiring | wp_update | overdue_invoice | db_warn
  severity text default 'info',
  -- info | warning | critical
  message text not null,
  entity_id uuid,
  entity_type text,
  acknowledged boolean default false,
  created_at timestamptz default now()
);
grant all on system_alerts to service_role;

-- ─────────────────────────────────────────────
-- SETTINGS (business config, editable from admin)
-- ─────────────────────────────────────────────
create table if not exists settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
grant all on settings to service_role;

-- Seed default settings
insert into settings (key, value) values
  ('business_name', 'Brightex Solutions'),
  ('tagline', 'We Build Digital Things That Work'),
  ('email', 'info.brightexsolutions@gmail.com'),
  ('phone', '+254 741 980 127'),
  ('whatsapp', '254741980127'),
  ('address', 'Nairobi, Kenya'),
  ('booking_url', '/book'),
  ('instagram', 'brightexsolutions'),
  ('facebook', 'brightexsolutions'),
  ('linkedin', 'brightex-solutions'),
  ('youtube', ''),
  ('tiktok', ''),
  ('google_tag', '')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────
-- Row Level Security: lock everything to service_role only
-- (browser never touches Supabase directly — only API routes do)
-- ─────────────────────────────────────────────
alter table contacts enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table sales enable row level security;
alter table communications enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;
alter table tasks enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table income_records enable row level security;
alter table expenses enable row level security;
alter table subcontractor_payouts enable row level security;
alter table subcontractor_expenses enable row level security;
alter table subscriptions enable row level security;
alter table products enable row level security;
alter table availability_slots enable row level security;
alter table blocked_dates enable row level security;
alter table bookings enable row level security;
alter table product_trials enable row level security;
alter table product_subscriptions enable row level security;
alter table social_posts enable row level security;
alter table announcements enable row level security;
alter table chat_faqs enable row level security;
alter table chat_sessions enable row level security;
alter table sites enable row level security;
alter table calendar_events enable row level security;
alter table system_alerts enable row level security;
alter table settings enable row level security;

-- Service role bypasses RLS — anon key gets nothing
-- No additional policies needed. service_role always bypasses RLS in Supabase.
