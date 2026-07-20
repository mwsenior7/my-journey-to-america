-- Supports real-time mid-interview age-signal detection, which escalates to
-- Veriff for a 13+ (not 18+) determination — distinct from the existing
-- post-submission moderation escalation, which checks for 18+ and must keep
-- working exactly as before.
alter table user_verifications
  add column if not exists veriff_purpose text,
  add column if not exists interview_age_check_result text;
