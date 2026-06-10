import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_REACTIONS = ["honored", "inspired", "relatable", "moved"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let reaction: string;
  try {
    const body = await req.json();
    reaction = body.reaction;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!VALID_REACTIONS.includes(reaction as (typeof VALID_REACTIONS)[number])) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error: insertError } = await supabase
    .from("story_reactions")
    .insert({ story_id: params.id, reaction });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: rows } = await supabase
    .from("story_reactions")
    .select("reaction")
    .eq("story_id", params.id);

  const counts = { honored: 0, inspired: 0, relatable: 0, moved: 0 };
  for (const row of rows ?? []) {
    if (row.reaction in counts) counts[row.reaction as keyof typeof counts]++;
  }

  return NextResponse.json({ counts });
}
