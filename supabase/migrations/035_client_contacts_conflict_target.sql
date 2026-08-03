-- Fixes the upsert target on client_contacts.
--
-- Migration 033 created a functional unique index on (client_id, lower(email))
-- to make duplicate detection case-insensitive. PostgREST resolves an
-- `on_conflict=client_id,email` target against real constraints at plan time
-- and cannot match a functional index, so every upsert failed with
-- 42P10 "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification". That broke adding a CC contact from the admin UI outright.
--
-- The fix is a plain unique constraint on (client_id, email). Case-insensitivity
-- moves into the application, which lowercases the address before writing (see
-- normaliseEmail in src/lib/cc-scopes.ts), so "Jane@x.com" and "jane@x.com"
-- still cannot both exist for one client.

-- Collapse any case-variant duplicates before the stricter constraint applies.
-- Keeps the oldest row, which is the one other records are most likely to
-- reference.
DELETE FROM client_contacts a
USING client_contacts b
WHERE a.client_id = b.client_id
  AND lower(a.email) = lower(b.email)
  AND a.created_at > b.created_at;

UPDATE client_contacts SET email = lower(email) WHERE email <> lower(email);

DROP INDEX IF EXISTS client_contacts_client_email_idx;

ALTER TABLE client_contacts
  DROP CONSTRAINT IF EXISTS client_contacts_client_id_email_key;

ALTER TABLE client_contacts
  ADD CONSTRAINT client_contacts_client_id_email_key UNIQUE (client_id, email);

GRANT ALL ON client_contacts TO service_role;
