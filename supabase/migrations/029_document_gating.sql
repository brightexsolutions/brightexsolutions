-- Per-document toggle: when true, the public link shows a teaser (summary +
-- headline price, full pricing/legal detail withheld) instead of the full
-- document, until Godwin flips it back off after the walkthrough call.
-- Not tied to any payment record — a plain admin judgment call per client.
ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS gated boolean DEFAULT false;
