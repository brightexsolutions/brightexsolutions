-- Human-in-the-loop queue: AI drafts a concrete action (an email to send),
-- but it always sits here pending Godwin's explicit approval before anything
-- is actually sent — the AI never executes on its own.
create table if not exists pending_ai_actions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  -- invoice_reminder | lead_followup | client_checkin
  status text default 'pending',
  -- pending | approved | dismissed | failed
  client_id uuid references clients(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,
  sale_id uuid references sales(id) on delete set null,
  title text not null,
  rationale text,
  draft_subject text,
  draft_body text,
  sender text default 'info',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

grant all on pending_ai_actions to service_role;

create index if not exists idx_pending_ai_actions_status
  on pending_ai_actions (status, created_at desc);
