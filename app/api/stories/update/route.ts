import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { storyId?: string; story_text?: string; us_state?: string | null; audio_url?: string | null; video_url?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { storyId, story_text, us_state, audio_url, video_url } = body;
  if (!storyId || typeof story_text !== "string" || !story_text.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (
    us_state !== undefined &&
    us_state !== null &&
    (typeof us_state !== "string" || !us_state.trim() || us_state.length >= 50)
  ) {
    return NextResponse.json({ error: "Invalid us_state" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: story, error: fetchError } = await supabase
    .from("stories")
    .select("id, clerk_user_id")
    .eq("id", storyId)
    .single();

  if (fetchError || !story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  if (story.clerk_user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateFields: Record<string, unknown> = { story_text: story_text.trim() };
  if (us_state !== undefined) updateFields.us_state = us_state === null ? null : us_state.trim();
  if (audio_url !== undefined) updateFields.audio_url = audio_url;
  if (video_url !== undefined) updateFields.video_url = video_url;

  const { error: updateError } = await supabase
    .from("stories")
    .update(updateFields)
    .eq("id", storyId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
