-- Migration 011 — Link subscriptions to clients (2026-06-12)
-- Enables client-linked renewal reminders for on_behalf and client_managed subscriptions.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

GRANT ALL ON subscriptions TO service_role;
