-- Repairs the audit trail.
--
-- Migration 021_activity_log_source.sql was never actually applied to this
-- database: activity_log has no `source` column. Because logAction() in
-- src/lib/audit.ts always sends `source`, EVERY audit write has been rejected
-- with PGRST204 since that code shipped, and the swallowed error in logAction
-- meant nothing ever surfaced. The last surviving entry is 2026-07-01.
--
-- Consequence: roughly a month of "who changed what" is gone and cannot be
-- recovered. From here on it records again.
--
-- This is a straight re-run of 021, kept as its own migration so the applied
-- history stays honest rather than implying 021 was run twice.

ALTER TABLE activity_log
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user'
    CHECK (source IN ('user', 'system'));

CREATE INDEX IF NOT EXISTS idx_activity_log_source
  ON activity_log (source, created_at DESC);

GRANT ALL ON activity_log TO service_role;
