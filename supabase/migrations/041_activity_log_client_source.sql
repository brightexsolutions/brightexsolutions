-- Client actions in the audit trail.
--
-- `source` has been 'user' or 'system': something Godwin or the team did, or
-- something a cron did. Neither describes the most consequential events in the
-- pipeline, which are performed by neither: a client accepting a proposal,
-- asking for changes, or signing a contract.
--
-- Until now those were recorded in system_alerts (a notification, cleared once
-- read) and communications (a message log), but not in activity_log, which is
-- the thing anyone actually consults when asking "who did what, and when". A
-- signature is the single most important act in the whole system and it was
-- absent from the audit trail entirely.
--
-- 'client' is a third source rather than being folded into 'user', because the
-- distinction matters when reading the log: "we marked this accepted" and "the
-- client accepted this" are different claims, and only one of them is evidence.
--
-- actor_id stays null for client rows: a client has no auth.users record, and
-- actor_name carries who they said they were.

ALTER TABLE activity_log
  DROP CONSTRAINT IF EXISTS activity_log_source_check;

ALTER TABLE activity_log
  ADD CONSTRAINT activity_log_source_check
    CHECK (source IN ('user', 'system', 'client'));

GRANT ALL ON activity_log TO service_role;
