import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ status: "pending" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await supabase
    .from("user_verifications")
    .select("interview_age_check_result")
    .eq("clerk_user_id", userId)
    .single();

  return NextResponse.json({ status: data?.interview_age_check_result ?? "pending" });
}
