import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

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
