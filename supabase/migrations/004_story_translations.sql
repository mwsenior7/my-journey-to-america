-- Stores pre-translated versions of stories, one row per language per story.
-- Populated automatically after submission via /api/translate-story.
CREATE TABLE IF NOT EXISTS public.story_translations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  language_code text        NOT NULL,  -- lowercase BCP-47 code, e.g. 'es', 'zh'
  story_text    text        NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (story_id, language_code)
);

ALTER TABLE public.story_translations ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read story_translations"
  ON public.story_translations FOR SELECT USING (true);

-- Anon insert (used by the server-side translate-story API route)
CREATE POLICY "Public insert story_translations"
  ON public.story_translations FOR INSERT WITH CHECK (true);
