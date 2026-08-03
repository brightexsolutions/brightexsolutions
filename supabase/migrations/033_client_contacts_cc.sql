-- Additional client-side contacts and per-scope CC routing.
--
-- A client record has exactly one primary email. In practice the person we
-- talk to is rarely the only person who needs the mail: invoices go to
-- finance, project updates go to an ops lead, agreements go to a director.
-- Rather than a single blunt "cc everyone on everything" field, each extra
-- contact declares which scopes it should be copied on.
--
-- Scopes (see src/lib/cc-recipients.ts, which is the source of truth):
--   invoices | payments | documents | projects | bookings | intake | general
-- The special scope 'all' copies the contact on every outgoing client email.

CREATE TABLE IF NOT EXISTS client_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  role        text,                       -- e.g. "Finance Manager", "Director"
  cc_scopes   text[] NOT NULL DEFAULT '{}',
  notes       text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  deleted_at  timestamptz
);

-- One row per email per client; re-adding a removed contact reuses the row.
CREATE UNIQUE INDEX IF NOT EXISTS client_contacts_client_email_idx
  ON client_contacts(client_id, lower(email));
CREATE INDEX IF NOT EXISTS client_contacts_client_id_idx ON client_contacts(client_id);

ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON client_contacts TO service_role;

-- Record who was actually copied, so the comms log reflects what was sent
-- rather than what the routing rules would produce today.
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS cc_emails text[] DEFAULT '{}';

GRANT ALL ON communications TO service_role;
