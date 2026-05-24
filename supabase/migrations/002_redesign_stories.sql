-- Drop old table and recreate with new schema
drop table if exists public.stories cascade;

create table public.stories (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  country      text        not null,
  year_arrived integer,
  us_state     text,
  profession   text,
  story_text   text        not null,
  audio_url    text,
  video_url    text,
  tags         text[]      default '{}',
  status       text        not null default 'approved',
  created_at   timestamptz not null default now()
);

alter table public.stories enable row level security;

create policy "public_read_stories"
  on public.stories for select
  using (true);

create policy "public_insert_stories"
  on public.stories for insert
  with check (true);

-- Storage bucket for audio recordings / uploads
insert into storage.buckets (id, name, public)
values ('story-audio', 'story-audio', true)
on conflict (id) do nothing;

drop policy if exists "public_audio_upload" on storage.objects;
create policy "public_audio_upload"
  on storage.objects for insert
  with check (bucket_id = 'story-audio');
