-- AI-assisted document generation: proposals, client agreements/terms, and
-- internal SOPs. `data` holds the structured content (matching the relevant
-- PDF component's *Data type in src/components/admin/*-pdf.tsx) — the PDF
-- itself is always rendered on demand from this, never stored as a blob.
create table if not exists generated_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  -- proposal | agreement | sop
  client_id uuid references clients(id) on delete set null,
  sale_id uuid references sales(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  reference_code text,
  data jsonb not null,
  status text default 'draft',
  -- draft | sent | final
  source text default 'ai',
  -- ai | manual
  engagement_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sent_at timestamptz
);

grant all on generated_documents to service_role;

create index if not exists idx_generated_documents_client
  on generated_documents (client_id, created_at desc);
create index if not exists idx_generated_documents_type
  on generated_documents (type, created_at desc);
