import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Story = {
  id: string;
  author_name: string;
  country_of_origin: string;
  year_of_arrival: number | null;
  us_state: string | null;
  profession: string | null;
  story_text: string;
  audio_url: string | null;
  video_url: string | null;
  tags: string[] | null;
  status: string;
  original_language: string;
  clerk_user_id: string | null;
  created_at: string;
};

export type StoryTranslation = {
  id: string;
  story_id: string;
  language_code: string;
  story_text: string;
  created_at: string;
};

export type CommunityHub = {
  id: string;
  name: string;
  country: string;
  region: string;
  member_count: number;
  created_at: string;
};
