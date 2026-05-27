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
      .select("id, name, country, year_arrived, us_state, profession, story_text, status, created_at, tags")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/stories] Supabase error:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    const stories = (data ?? []).map((s) => ({
      ...s,
      status: s.status ?? "pending",
    }));

    return NextResponse.json({ stories });
  } catch (err) {
    console.error("[admin/stories] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error", details: String(err) }, { status: 500 });
  }
}
