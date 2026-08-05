-- Document templates, and gating a document behind a fee.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TEMPLATES
-- ─────────────────────────────────────────────────────────────────────────────
-- Every proposal so far has started from the last proposal, which means the
-- structure of a Brightex document lives in whichever file was copied most
-- recently. A template makes the structure the thing that is reused, and the
-- prose the thing that is written fresh, which is the correct way round: the
-- shape of a proposal is a house standard, its content never is.
--
-- Templates store SKELETONS: section order, kinds, headings, and the fixed
-- scaffolding, with client-specific prose stripped. Saving a document as a
-- template therefore cannot leak one client's copy into another's proposal.

CREATE TABLE IF NOT EXISTS document_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  type          text NOT NULL DEFAULT 'proposal',
  -- proposal | agreement | techdoc | sop
  -- Surfaces the right template first when the intake names a service.
  service_types text[] DEFAULT '{}',
  -- The block document skeleton: { version, type, meta, sections[] }.
  blocks        jsonb NOT NULL,
  -- Offered as the default for its type when creating a new document.
  is_default    boolean DEFAULT false,
  -- Seeded templates are replaced on redeploy; ones saved from a real document
  -- are never touched by seeding.
  is_seeded     boolean DEFAULT false,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS document_templates_type_idx ON document_templates (type, name);
-- One default per type, enforced rather than left to the UI.
CREATE UNIQUE INDEX IF NOT EXISTS document_templates_one_default_idx
  ON document_templates (type) WHERE is_default AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS document_templates_seeded_name_idx
  ON document_templates (name) WHERE is_seeded;

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
GRANT ALL ON document_templates TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FEE GATING
-- ─────────────────────────────────────────────────────────────────────────────
-- `gated` has been a plain boolean flipped by hand: show the client a teaser
-- until after the walkthrough call. That stays, and remains the common case.
--
-- What it could not express is a document unlocked by paying for it, which is
-- how a paid discovery or a scoping document is actually sold: the client sees
-- the shape of the work and the headline number, and the detail arrives when
-- the scoping fee does.
--
-- Deliberately NOT automatic. The unlock is tied to an invoice, and marking
-- that invoice paid is what unlocks the document. Automatic unlocking needs a
-- payment webhook this app does not have, and inventing one for a rare event
-- would be building the hard half of a feature for the easy half of a use case.
--
-- gate_mode supersedes `gated` without replacing it: `gated` remains the single
-- flag every existing query, cron and badge reads, and is kept in step by the
-- routes. Two sources of truth would be worse than one slightly redundant one.

ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS gate_mode         text DEFAULT 'off',
  -- off | manual | fee
  ADD COLUMN IF NOT EXISTS unlock_fee        numeric,
  ADD COLUMN IF NOT EXISTS unlock_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unlocked_at       timestamptz,
  ADD COLUMN IF NOT EXISTS unlocked_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE generated_documents
  DROP CONSTRAINT IF EXISTS generated_documents_gate_mode_check;
ALTER TABLE generated_documents
  ADD CONSTRAINT generated_documents_gate_mode_check
    CHECK (gate_mode IN ('off', 'manual', 'fee'));

-- Backfill: documents already gated by hand are 'manual', the rest are 'off'.
UPDATE generated_documents
SET gate_mode = CASE WHEN gated THEN 'manual' ELSE 'off' END
WHERE gate_mode IS NULL OR gate_mode = 'off';

CREATE INDEX IF NOT EXISTS generated_documents_gate_mode_idx
  ON generated_documents (gate_mode) WHERE gate_mode <> 'off';

GRANT ALL ON generated_documents TO service_role;
