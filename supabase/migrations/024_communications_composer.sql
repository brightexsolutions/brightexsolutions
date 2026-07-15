-- Support for the redesigned email composer: which department sent the
-- email (maps to lib/mail.ts SENDERS) and lightweight attachment metadata
-- (filename/size only — attachment bytes are never persisted, they're
-- forwarded straight through to Resend at send time).
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS sender text,
  ADD COLUMN IF NOT EXISTS attachments jsonb;

GRANT ALL ON communications TO service_role;
