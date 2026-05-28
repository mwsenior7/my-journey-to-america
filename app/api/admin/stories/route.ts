import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin/stories] Missing env vars — NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Server configuration error: missing Supabase service role key" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("stories")
      .select("id, title, author_name, country_of_origin, us_state, year_of_arrival, profession, story_text, audio_url, is_featured, created_at, original_language, status, tags")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/stories] Supabase error:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    const stories = (data ?? []).map((s) => ({
      id: s.id,
      name: s.author_name,
      country: s.country_of_origin,
      year_arrived: s.year_of_arrival,
      us_state: s.us_state,
      profession: s.profession,
      story_text: s.story_text,
      status: (s.status ?? "pending") as "pending" | "approved" | "rejected",
      created_at: s.created_at,
      tags: s.tags ?? null,
    }));

    return NextResponse.json({ stories });
  } catch (err) {
    console.error("[admin/stories] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error", details: String(err) }, { status: 500 });
  }
}
