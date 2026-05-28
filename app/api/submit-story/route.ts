import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, country, year_arrived, us_state, profession, story_text, original_language } = body;

  if (!name || !country || !story_text) {
    return NextResponse.json({ error: "Missing required fields: name, country, story_text" }, { status: 400 });
  }

  const { error } = await supabase.from("stories").insert({
    author_name: name,
    country_of_origin: country,
    us_state: us_state ?? null,
    year_of_arrival: year_arrived ?? null,
    profession: profession ?? null,
    story_text,
    original_language: original_language ?? "en",
    status: "pending",
  });

  if (error) {
    console.error("[submit-story] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
