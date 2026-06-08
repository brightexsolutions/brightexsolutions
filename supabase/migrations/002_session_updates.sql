-- Migration 002 — Session updates (2026-05-26)
-- Adds: consultancy rate history, invoice payment method + billing fields,
--       subscription ownership + payment tracking, activity log
-- Run this in the Supabase SQL editor on your project.

-- ─── 1. Consultancy rate history ─────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS monthly_rate numeric;

CREATE TABLE IF NOT EXISTS consultancy_rate_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  monthly_rate    numeric NOT NULL,
  effective_from  date NOT NULL,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

GRANT ALL ON consultancy_rate_history TO service_role;

-- ─── 2. Invoice payment method + company billing ──────────────────────────────

-- Payment method controls which payment details appear on the PDF invoice.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'all'
  CHECK (payment_method IN ('all', 'mpesa_send_money', 'mpesa_till', 'paypal', 'bank', 'cash'));

-- Client-facing billing address fields (company name + phone for invoices)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS phone text;

-- ─── 3. Subscription ownership + payment tracking ────────────────────────────

-- ownership: who pays for this subscription
--   internal       → Brightex's own business subscription (e.g. our domain, Vercel)
--   on_behalf      → We pay it, but it belongs to / benefits a specific client
--   client_managed → Client pays themselves; we only track the renewal date
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS ownership text DEFAULT 'internal'
  CHECK (ownership IN ('internal', 'on_behalf', 'client_managed')),
  ADD COLUMN IF NOT EXISTS client_id     uuid REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS last_paid_date date;

GRANT ALL ON subscriptions TO service_role;

-- ─── 4. Activity / audit log ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES auth.users(id),
  actor_name   text,                 -- denormalised for display even if user removed
  action       text NOT NULL,        -- 'created' | 'updated' | 'deleted' | 'sent' | 'paid' | ...
  entity_type  text NOT NULL,        -- 'invoice' | 'project' | 'client' | 'subscription' | ...
  entity_id    uuid,
  entity_label text,                 -- human-readable: invoice number, project name, etc.
  changes      jsonb,                -- {field: {from, to}} — optional diff
  notes        text,                 -- optional free-text context
  created_at   timestamptz DEFAULT now()
);

GRANT ALL ON activity_log TO service_role;

-- Index for fast per-entity lookups
CREATE INDEX IF NOT EXISTS idx_activity_log_entity
  ON activity_log (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_created
  ON activity_log (created_at DESC);

-- ─── 5. Settings: extended payment options ────────────────────────────────────

-- The settings table stores a single-row JSON config.
-- Ensure the payment columns for Till and PayPal exist.
-- (Only if you have a settings table — otherwise these are stored in a single
--  row keyed on 'invoice_settings'; add columns below if needed.)
-- If your settings table uses a different structure, adapt this block.

-- Example if settings is a flat table with one row per key:
-- INSERT INTO settings (key, value) VALUES ('invoice_till_number', '') ON CONFLICT (key) DO NOTHING;
-- INSERT INTO settings (key, value) VALUES ('invoice_till_name', '') ON CONFLICT (key) DO NOTHING;
-- INSERT INTO settings (key, value) VALUES ('invoice_paypal_email', '') ON CONFLICT (key) DO NOTHING;

-- If settings is a single-row JSONB table, these columns are handled in application config.
-- No schema change needed — the settings API already reads/writes arbitrary keys.
