-- Tracks every real AI call (never a template/rule-based fallback) so the
-- Brixo Chat "AI Usage" tab can show real call volume, free vs paid tier
-- split, and token consumption instead of static placeholder stats.
create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  -- e.g. brixo_chat | admin_ai:draft_reply | suggested_actions | assistant_chat | document_generate:proposal
  provider text not null,
  -- anthropic | gemini
  model text,
  is_free_tier boolean default true,
  tokens_in integer default 0,
  tokens_out integer default 0,
  created_at timestamptz default now()
);

grant all on ai_usage_logs to service_role;

create index if not exists idx_ai_usage_logs_created
  on ai_usage_logs (created_at desc);
create index if not exists idx_ai_usage_logs_feature
  on ai_usage_logs (feature, created_at desc);
