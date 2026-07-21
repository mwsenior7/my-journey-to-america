-- Server-side tracking of audio uploaded during an in-progress interview,
-- before any story is submitted. The client's local draft state is not
-- something a server-side deletion step (see the interview_age_check
-- branch of the Veriff webhook) should have to trust, so each uploaded
-- file's storage path is appended here as it's transcribed.
--
-- resolved_at marks when a confirmed under-13 result was acted on (audio
-- deleted). It is deliberately kept alongside interview_age_check_result
-- as a compliance record, separate from the story-audio bucket contents.
alter table user_verifications
  add column if not exists interview_audio_paths text[] not null default '{}',
  add column if not exists resolved_at timestamptz;
