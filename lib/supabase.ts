import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Story = {
  id: string;
  title: string;
  author_name: string;
  country_of_origin: string;
  us_state: string | null;
  year_of_arrival: number | null;
  profession: string | null;
  story_text: string;
  audio_url: string | null;
  is_featured: boolean;
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
