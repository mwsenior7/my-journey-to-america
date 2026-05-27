import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_STATUSES = ["pending", "approved", "rejected"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { password, storyId, status } = body as {
    password: string;
    storyId: string;
    status: string;
  };

  console.log("[admin/update-status] received password:", password, "| expected: admin123");
  if (password !== "admin123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!storyId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid storyId or status" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin/update-status] Missing env vars — SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Server configuration error: missing Supabase service role key" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase
      .from("stories")
      .update({ status })
      .eq("id", storyId);

    if (error) {
      console.error("[admin/update-status] Supabase error:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/update-status] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error", details: String(err) }, { status: 500 });
  }
}
