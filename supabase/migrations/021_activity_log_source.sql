-- Tag activity log rows as user-initiated or system-initiated.
-- Cron/automated actions set source = 'system'; admin UI actions stay 'user'.
ALTER TABLE activity_log
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user'
    CHECK (source IN ('user', 'system'));

CREATE INDEX IF NOT EXISTS idx_activity_log_source
  ON activity_log (source, created_at DESC);

GRANT ALL ON activity_log TO service_role;
