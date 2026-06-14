alter table public.stories
  add column if not exists interview_audio_urls jsonb not null default '[]'::jsonb;
