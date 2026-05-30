-- Create story-audio bucket (was never created in prior migrations)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-audio', 'story-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure story-videos bucket is marked public
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-videos', 'story-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- story-audio: public read
DROP POLICY IF EXISTS "public_audio_read" ON storage.objects;
CREATE POLICY "public_audio_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'story-audio');

-- story-audio: allow uploads (anon uploads via signed URLs, service_role via API)
DROP POLICY IF EXISTS "public_audio_upload" ON storage.objects;
CREATE POLICY "public_audio_upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (bucket_id = 'story-audio');

-- story-videos: public read
DROP POLICY IF EXISTS "public_video_read" ON storage.objects;
CREATE POLICY "public_video_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'story-videos');

-- story-videos: allow uploads
DROP POLICY IF EXISTS "public_video_upload" ON storage.objects;
CREATE POLICY "public_video_upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (bucket_id = 'story-videos');
