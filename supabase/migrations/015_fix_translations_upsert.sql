-- Allow the service-role upsert to update existing translation rows.
-- Without this, re-submitting a story 500s because RLS blocks the UPDATE
-- half of the upsert even when using the service role via anon insert policy.

ALTER TABLE public.story_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public update story_translations"
  ON public.story_translations FOR UPDATE USING (true) WITH CHECK (true);
