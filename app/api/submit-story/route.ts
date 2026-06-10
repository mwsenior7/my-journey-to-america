import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { moderateStory } from "@/lib/moderate-story";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generatePreviewText(storyText: string): Promise<string | null> {
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `Read this immigration story and extract the single most emotionally compelling sentence that would make a reader desperate to read the full story. Return ONLY that one sentence, nothing else, no quotes, no explanation.\n\n${storyText}`,
        },
      ],
    });
    return res.content[0].type === "text" ? res.content[0].text.trim() : null;
  } catch {
    return null;
  }
}

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

  const { name, country, year_arrived, us_state, profession, story_text, original_language, clerk_user_id } = body;

  if (!name || !country || !story_text) {
    return NextResponse.json({ error: "Missing required fields: name, country, story_text" }, { status: 400 });
  }

  const firstName = String(name).split(" ")[0];
  const title = `${firstName}'s Journey from ${country}`;

  const [moderation, preview_text] = await Promise.all([
    moderateStory(String(story_text), String(name), String(country)),
    generatePreviewText(String(story_text)),
  ]);

  const { data, error } = await supabase.from("stories").insert({
    title,
    author_name: name,
    country_of_origin: country,
    us_state: us_state ?? null,
    year_of_arrival: year_arrived ?? null,
    profession: profession ?? null,
    story_text,
    preview_text,
    original_language: original_language ?? "en",
    status: moderation.decision,
    moderation_reason: moderation.reason,
    clerk_user_id: clerk_user_id ?? null,
  }).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
