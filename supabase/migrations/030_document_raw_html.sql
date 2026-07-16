-- Lets a generated_documents row be served as verbatim, pre-authored HTML
-- (e.g. a bespoke client proposal that already exists as a real file) instead
-- of being rendered from the generic ProposalData/AgreementData shape, which
-- can't represent bespoke structure (custom sections, retainer tiers, etc.)
-- without lossy flattening. When raw_html is set, the view routes serve it
-- directly; raw_html_gated is the pre-built teaser variant used when `gated`
-- is true on the public link.
ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS raw_html text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS raw_html_gated text DEFAULT NULL;
