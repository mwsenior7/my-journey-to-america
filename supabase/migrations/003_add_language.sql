-- Add original language tracking to stories
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS original_language text NOT NULL DEFAULT 'en';
