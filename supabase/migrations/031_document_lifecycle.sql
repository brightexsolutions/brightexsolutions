-- Proposal -> Agreement -> Project lifecycle:
--   - accepted_at: set when a client digitally accepts an agreement on the
--     public link (see /api/public/documents/[id]/accept)
--   - source_document_id: lets an Agreement reference the Proposal it was
--     prepared from (or either reference a Project it was prepared for),
--     so "resend" and cross-navigation work from any direction
--   - communications.document_id: lets the comms log show which generated
--     document (if any) a given email was actually about
ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_document_id uuid REFERENCES generated_documents(id) ON DELETE SET NULL;

ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES generated_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS generated_documents_source_document_idx ON generated_documents(source_document_id);
CREATE INDEX IF NOT EXISTS communications_document_id_idx ON communications(document_id);

GRANT ALL ON generated_documents TO service_role;
GRANT ALL ON communications TO service_role;
