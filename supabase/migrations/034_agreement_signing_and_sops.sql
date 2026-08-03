-- Working agreements, signature evidence, and service-specific SOPs.
--
-- 1. Signature evidence
--    Acceptance previously recorded only a timestamp. If an agreement is ever
--    disputed, "someone clicked a button" is not much of a record. These
--    columns capture who signed, that they confirmed reading it, and the
--    request metadata, which is what makes a click defensible.
--
-- 2. Read confirmation
--    The accept button is now gated behind actually scrolling the agreement
--    and ticking a confirmation, so accepted_terms_at is a separate, earlier
--    moment than accepted_at.
--
-- 3. Uploaded documents
--    A proposal finished locally (in Docs, Canva, whatever) can be uploaded
--    rather than AI-generated. `source` already distinguishes ai | manual;
--    'upload' joins it, with the original filename kept for the audit trail.

ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS accepted_by_name    text,
  ADD COLUMN IF NOT EXISTS accepted_by_email   text,
  ADD COLUMN IF NOT EXISTS accepted_ip         text,
  ADD COLUMN IF NOT EXISTS accepted_user_agent text,
  ADD COLUMN IF NOT EXISTS accepted_terms_at   timestamptz,
  -- Set when the client opens the public link, so "sent but never opened" is
  -- distinguishable from "read and ignored" when chasing a decision.
  ADD COLUMN IF NOT EXISTS first_viewed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS view_count          integer DEFAULT 0,
  -- Upload path metadata.
  ADD COLUMN IF NOT EXISTS original_filename   text,
  -- Which service the document covers, so a proposal can be matched to the
  -- right SOP and the right template.
  ADD COLUMN IF NOT EXISTS service_types       text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS generated_documents_accepted_idx
  ON generated_documents(accepted_at) WHERE accepted_at IS NOT NULL;

GRANT ALL ON generated_documents TO service_role;

-- Per-service SOPs live in code (src/lib/brightex-sop.ts) so they are version
-- controlled and cannot drift from the process shown publicly. This table
-- records only the acknowledgement that a team member has read one, which is
-- the part that has to be auditable.
CREATE TABLE IF NOT EXISTS sop_acknowledgements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_key        text NOT NULL,          -- matches SOP_LIBRARY key in code
  sop_revision   text NOT NULL,
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sop_ack_unique_idx
  ON sop_acknowledgements(sop_key, sop_revision, user_id);

ALTER TABLE sop_acknowledgements ENABLE ROW LEVEL SECURITY;
GRANT ALL ON sop_acknowledgements TO service_role;
