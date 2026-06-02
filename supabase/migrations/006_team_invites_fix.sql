-- Make token nullable (we use Supabase native invites; no separate token needed)
ALTER TABLE team_invites ALTER COLUMN token DROP NOT NULL;
ALTER TABLE team_invites ALTER COLUMN token SET DEFAULT NULL;

-- Add unique constraint on email so we can upsert by email
ALTER TABLE team_invites ADD CONSTRAINT team_invites_email_unique UNIQUE (email);

-- Grant access
GRANT ALL ON team_invites TO service_role;
