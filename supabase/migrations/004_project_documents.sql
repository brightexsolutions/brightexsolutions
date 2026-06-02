-- Migration 004 — Project Documents (2026-05-26)
-- Run this in the Supabase SQL editor on your project.

-- ─── 1. project-docs storage bucket ─────────────────────────────────────────
-- Private bucket — files are served only via short-lived signed URLs (1 hour).
-- Set to private in the Supabase dashboard (default).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-docs',
  'project-docs',
  false,           -- private: access via signed URLs only
  10485760,        -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/png', 'image/webp'
      ];

-- ─── 2. project_documents table ──────────────────────────────────────────────
-- Tracks files uploaded per project (proposals, briefs, contracts, etc.)
-- Files are stored in the project-docs bucket under {project_id}/{uuid}.ext
-- Access is via signed URLs generated at request time — never public links.

CREATE TABLE IF NOT EXISTS project_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         text NOT NULL,          -- display label (from upload form or filename)
  storage_path text NOT NULL,          -- relative path inside the bucket: {project_id}/{uuid}.ext
  size_bytes   integer,                -- stored (post-compression) file size
  uploaded_at  timestamptz DEFAULT now()
);

GRANT ALL ON project_documents TO service_role;

-- Index for fast per-project lookups
CREATE INDEX IF NOT EXISTS idx_project_documents_project
  ON project_documents (project_id, uploaded_at DESC);

-- Enable RLS (service_role bypasses it — consistent with all other tables)
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
