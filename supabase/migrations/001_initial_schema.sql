-- ── stories ───────────────────────────────────────────────────────────────────
create table public.stories (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  author_name      text        not null,
  country_of_origin text       not null,
  us_state         text,
  year_of_arrival  integer,
  profession       text,
  story_text       text        not null,
  audio_url        text,
  is_featured      boolean     not null default false,
  created_at       timestamptz not null default now()
);

-- ── community_hubs ────────────────────────────────────────────────────────────
create table public.community_hubs (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  country      text        not null,
  region       text        not null,
  member_count integer     not null default 0,
  created_at   timestamptz not null default now()
);

-- ── Row-level security ────────────────────────────────────────────────────────
alter table public.stories        enable row level security;
alter table public.community_hubs enable row level security;

-- Anyone can read all stories (public archive)
create policy "public_read_stories"
  on public.stories for select
  using (true);

-- Anyone can submit a story (anonymous submissions allowed)
create policy "public_insert_stories"
  on public.stories for insert
  with check (true);

-- Anyone can read community hubs
create policy "public_read_hubs"
  on public.community_hubs for select
  using (true);

-- ── Seed community_hubs ───────────────────────────────────────────────────────
insert into public.community_hubs (name, country, region, member_count) values
  ('Brazil',          'Brazil',       'Latin America',      2400),
  ('Mexico',          'Mexico',       'Latin America',      1900),
  ('India',           'India',        'South Asia',         1800),
  ('Philippines',     'Philippines',  'Southeast Asia',     1200),
  ('China',           'China',        'East Asia',          1100),
  ('Egypt',           'Egypt',        'Middle East & Africa', 800),
  ('Nigeria',         'Nigeria',      'Middle East & Africa', 700),
  ('Ethiopia',        'Ethiopia',     'Middle East & Africa', 400),
  ('Ukraine',         'Ukraine',      'Europe',              600),
  ('Germany',         'Germany',      'Europe',              500),
  ('United Kingdom',  'United Kingdom','Europe',             400),
  ('South Korea',     'South Korea',  'East Asia',           350);
