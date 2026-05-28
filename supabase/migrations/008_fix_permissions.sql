-- Ensure all columns exist (guards against partially-applied earlier migrations)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Re-apply status default in case it was left as 'approved' from migration 002
ALTER TABLE public.stories ALTER COLUMN status SET DEFAULT 'pending';

-- Grant all DML and DDL privileges so service_role API routes and anon client-side
-- uploads can always read and write without being blocked by table-level ACLs.
GRANT ALL ON public.stories TO anon, authenticated, service_role;
GRANT ALL ON public.story_translations TO anon, authenticated, service_role;

-- Ensure RLS policies exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'public_read_stories'
  ) THEN
    CREATE POLICY "public_read_stories" ON public.stories FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'public_insert_stories'
  ) THEN
    CREATE POLICY "public_insert_stories" ON public.stories FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- story-videos storage bucket (created here in case it was never set up)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-videos', 'story-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to the story-videos bucket
DROP POLICY IF EXISTS "public_video_upload" ON storage.objects;
CREATE POLICY "public_video_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'story-videos');

-- Allow anyone to read from story-videos
DROP POLICY IF EXISTS "public_video_read" ON storage.objects;
CREATE POLICY "public_video_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-videos');
