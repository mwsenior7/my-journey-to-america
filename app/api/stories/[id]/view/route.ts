import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
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

  const { data } = await supabase
    .from("stories")
    .select("read_count")
    .eq("id", params.id)
    .single();

  await supabase
    .from("stories")
    .update({ read_count: (data?.read_count ?? 0) + 1 })
    .eq("id", params.id);

  return NextResponse.json({ success: true });
}
