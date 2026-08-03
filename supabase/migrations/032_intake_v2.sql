-- Intake v2: the original questionnaire captured a service type, a free-text
-- description and an email. That is enough to file a lead but not enough to
-- scope, quote or run a discovery call from. This adds the business context,
-- readiness and decision-making signals the proposal generator and the sales
-- pipeline actually need, plus the contact detail (phone, role, CC list) that
-- was silently dropped before.
--
-- Note: submitter_company was already accepted by /api/intake but had no
-- column to land in, so every company name submitted so far was discarded.

ALTER TABLE client_intakes
  -- ── What they are asking for ───────────────────────────────────────────────
  -- Real enquiries are frequently combined ("a website, plus branding, plus
  -- an assistant to answer WhatsApp"). service_type stays as the primary /
  -- lead service so existing filters, emails and AI prompts keep working;
  -- service_types carries the full set.
  ADD COLUMN IF NOT EXISTS service_types      text[] DEFAULT '{}',

  -- ── Who is submitting ──────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS submitter_company  text,
  ADD COLUMN IF NOT EXISTS submitter_role     text,
  ADD COLUMN IF NOT EXISTS submitter_phone    text,
  -- Additional people this client wants looped into project correspondence.
  ADD COLUMN IF NOT EXISTS cc_emails          text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_contact  text,   -- email | whatsapp | phone | any

  -- ── Business context ───────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS industry           text,
  ADD COLUMN IF NOT EXISTS business_summary   text,   -- what the business actually does
  ADD COLUMN IF NOT EXISTS target_audience    text,   -- who they serve
  ADD COLUMN IF NOT EXISTS online_presence    text,   -- current site / socials, free text

  -- ── Outcome definition ─────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS success_criteria   text,   -- "what does done/working look like"
  ADD COLUMN IF NOT EXISTS reference_links    text,   -- inspiration, any service type

  -- ── Readiness & commercial signals ─────────────────────────────────────────
  -- assets: { logo, brand_guidelines, copy, images, domain, hosting, content_plan }
  ADD COLUMN IF NOT EXISTS assets             jsonb  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hard_deadline      text,   -- fixed date/event driving the timeline
  ADD COLUMN IF NOT EXISTS decision_stage     text,   -- exploring | comparing | ready | approved
  ADD COLUMN IF NOT EXISTS budget_confidence  text,   -- firm | flexible | guidance_needed
  ADD COLUMN IF NOT EXISTS heard_from         text,

  -- ── Consent ────────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS contact_consent    boolean DEFAULT true,

  -- ── Draft support ──────────────────────────────────────────────────────────
  -- Partial submissions are kept so a half-finished form is still a lead.
  ADD COLUMN IF NOT EXISTS is_partial         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_steps    int     DEFAULT 0;

-- Backfill the array for submissions made before multi-service was supported.
UPDATE client_intakes
SET service_types = ARRAY[service_type]
WHERE service_type IS NOT NULL
  AND (service_types IS NULL OR cardinality(service_types) = 0);

CREATE INDEX IF NOT EXISTS client_intakes_status_idx ON client_intakes(status);
CREATE INDEX IF NOT EXISTS client_intakes_client_id_idx ON client_intakes(client_id);

GRANT ALL ON client_intakes TO service_role;
