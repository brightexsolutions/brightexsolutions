-- Track whether the post-booking follow-up email has been sent.
-- The cron checks this to avoid re-sending after the meeting passes.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS follow_up_sent boolean NOT NULL DEFAULT false;

GRANT ALL ON bookings TO service_role;
