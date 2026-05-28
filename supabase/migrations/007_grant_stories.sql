-- Ensure anon, authenticated, and service_role can perform all operations on stories.
-- Required so that the anon role (used by the client-side Supabase SDK) and the
-- service_role (used by server-side API routes) can INSERT/SELECT/UPDATE rows.
GRANT ALL ON public.stories TO anon, authenticated, service_role;
GRANT ALL ON public.story_translations TO anon, authenticated, service_role;
