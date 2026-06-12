-- Migration 010 — Tasks table missing columns (2026-06-12)
-- Migration 005 added deleted_at to all main tables but omitted tasks.
-- board_order and category were added to application code without a matching migration.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at  timestamptz DEFAULT null;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS board_order  integer     DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category     text        DEFAULT 'general';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_at  timestamptz DEFAULT null;

-- Fast filter for the global tasks board query
CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted ON tasks (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_board_order ON tasks (board_order, created_at DESC);

GRANT ALL ON tasks TO service_role;
