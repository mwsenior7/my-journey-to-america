import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await supabase.from('story_reactions').select('reaction').eq('story_id', id);
  const counts = { honored: 0, inspired: 0, relatable: 0, moved: 0 };
  data?.forEach(r => { if (r.reaction in counts) counts[r.reaction as keyof typeof counts]++; });
  return NextResponse.json(counts);
}
