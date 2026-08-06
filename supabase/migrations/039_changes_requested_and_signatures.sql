-- Two additions completing the proposal to signed agreement path.
--
-- 1. "Request changes" as a first-class response to a proposal
--    Accept or silence are not the only two outcomes, and treating them as such
--    is why negotiation ends up in WhatsApp. A client who wants the timeline
--    moved or a phase dropped currently has no route back through the document
--    they are reading. Recording the request against the document means the
--    thing being discussed and the discussion are in the same place.
--
--    Deliberately notification-only: it records the ask and tells Godwin, who
--    then schedules a call. No threaded reply, no negotiation state machine. A
--    proposal is not renegotiated in a form, it is renegotiated on a call, and
--    the system's job is to make sure the call happens with the ask in hand.
--
-- 2. Signature evidence as rows, not columns
--    Migration 034 put the client's acceptance on generated_documents, which
--    works for exactly one signer. A countersigned agreement has two, and a
--    witness or a second director would be a third. Columns cannot express
--    that, so signatures move to their own table, one row per party.
--
--    The accepted_* columns on generated_documents STAY as the canonical
--    summary of "did the client accept, when, and who", because every existing
--    query, badge, cron and filter reads them. This table is the evidence
--    behind that summary, not a replacement for it.

ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS changes_requested_at   timestamptz,
  ADD COLUMN IF NOT EXISTS changes_requested_by   text,
  ADD COLUMN IF NOT EXISTS changes_requested_note text;

CREATE INDEX IF NOT EXISTS generated_documents_changes_requested_idx
  ON generated_documents (changes_requested_at DESC)
  WHERE changes_requested_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- SIGNATURES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_signatures (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,

  -- 'brightex' is stamped when the agreement is created, so the client never
  -- receives an agreement that is unsigned on our side. 'client' is added when
  -- they sign.
  party         text NOT NULL CHECK (party IN ('brightex', 'client', 'witness')),

  signer_name   text NOT NULL,
  signer_title  text,
  signer_email  text,
  -- The legal entity being bound, which is frequently not the same string as
  -- the client record's name.
  entity        text,

  -- drawn:  signed on a canvas, in the browser
  -- upload: photographed from paper, background removed server side
  -- typed:  name only, no image. Weakest of the three, recorded as such.
  method        text NOT NULL CHECK (method IN ('drawn', 'upload', 'typed')),
  -- Path in the private `signatures` storage bucket. Null for 'typed'.
  image_path    text,

  -- Per-term confirmations: [{ key, label, at }]. A single blanket tick proves
  -- nothing about which term was understood, so each material term is its own
  -- checkbox and carries its own timestamp.
  terms_accepted jsonb DEFAULT '[]',

  ip            text,
  user_agent    text,
  signed_at     timestamptz DEFAULT now()
);

-- One signature per party per document: signing twice is a mistake, not a
-- second signature.
CREATE UNIQUE INDEX IF NOT EXISTS document_signatures_party_idx
  ON document_signatures (document_id, party);
CREATE INDEX IF NOT EXISTS document_signatures_document_idx
  ON document_signatures (document_id);

ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

GRANT ALL ON generated_documents  TO service_role;
GRANT ALL ON document_signatures  TO service_role;
