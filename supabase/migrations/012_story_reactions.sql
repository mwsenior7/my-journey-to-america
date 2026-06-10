CREATE TABLE IF NOT EXISTS story_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('honored', 'inspired', 'relatable', 'moved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
