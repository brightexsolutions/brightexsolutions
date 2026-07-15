-- Persists the AI analysis of a client intake so it survives closing/reopening
-- the detail panel instead of being regenerated (and re-billed) every time.
ALTER TABLE client_intakes
  ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz DEFAULT NULL;
