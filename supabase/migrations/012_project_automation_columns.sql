-- Migration 012 — Project automation columns (2026-06-12)
-- These columns are referenced in the tasks PATCH route automation logic
-- but were never added to the projects table.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS auto_complete_on_tasks boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_comms_enabled   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS comm_trigger           text    DEFAULT 'on_completion';
  -- comm_trigger: 'on_completion' | 'on_approval'

GRANT ALL ON projects TO service_role;
