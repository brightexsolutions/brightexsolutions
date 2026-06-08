-- Migration 003 — Logo storage + Withholding Tax support (2026-05-26)
-- Run this in the Supabase SQL editor on your project.

-- ─── 1. Logos storage bucket ─────────────────────────────────────────────────
-- NOTE: The 'logos' bucket was created manually via the Supabase dashboard.
--       Set it to PUBLIC in the dashboard so logo URLs work in the public site.
--       The INSERT below is a no-op if the bucket already exists.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,          -- public so logo URLs can be used directly in emails/PDFs
  2097152,       -- 2 MB
  ARRAY['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];

-- ─── 2. Withholding Tax columns on income_records ────────────────────────────

-- gross_amount: what was invoiced / agreed before WHT deduction
-- withholding_tax: amount deducted by the client before remitting
-- withholding_type: key matching the WHT_TYPES list in the finance UI
--   none | consultancy_5 | professional_5 | management_fees_12 |
--   dividends_5 | interest_15 | rent_7_5 | custom
-- amount (existing column) stays as the NET received — no rename needed

ALTER TABLE income_records
  ADD COLUMN IF NOT EXISTS gross_amount       numeric,
  ADD COLUMN IF NOT EXISTS withholding_tax    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS withholding_type   text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS withholding_rate   numeric DEFAULT 0;   -- stored rate % for custom entries

-- Backfill: for existing rows, gross = amount (no WHT was tracked previously)
UPDATE income_records
  SET gross_amount = amount
  WHERE gross_amount IS NULL;

GRANT ALL ON income_records TO service_role;
