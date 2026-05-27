-- Add status column if it was never created (handles databases where 002 migration was not applied)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Backfill any existing rows that somehow have a null status
UPDATE public.stories SET status = 'pending' WHERE status IS NULL;
