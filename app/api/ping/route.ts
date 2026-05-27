import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { count, error } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("[/api/ping] supabase error:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stories: count });
}
