-- Migration 005 — Soft Delete (2026-05-26)
-- Adds deleted_at to all main business tables.
-- DELETE routes now set deleted_at instead of removing rows.
-- GET list routes filter .is("deleted_at", null).

ALTER TABLE clients          ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE projects         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE invoices         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE payments         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE sales            ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE social_posts     ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE team_members     ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE subscriptions    ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE sites            ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE bookings         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE announcements    ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE communications   ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE products         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE expenses         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE income_records   ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE chat_faqs        ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE calendar_events  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

-- Indexes to make the IS NULL filter fast on high-volume tables
CREATE INDEX IF NOT EXISTS idx_clients_not_deleted       ON clients       (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_not_deleted      ON projects      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_not_deleted      ON invoices      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_not_deleted      ON payments      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_not_deleted         ON sales         (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_not_deleted  ON social_posts  (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_not_deleted  ON team_members  (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_not_deleted ON subscriptions (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_not_deleted         ON sites         (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_not_deleted      ON bookings      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_not_deleted ON announcements (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_communications_not_deleted ON communications (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_not_deleted      ON products      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_not_deleted      ON expenses      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_income_records_not_deleted ON income_records (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_faqs_not_deleted     ON chat_faqs     (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_not_deleted ON calendar_events (deleted_at) WHERE deleted_at IS NULL;
