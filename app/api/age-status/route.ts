import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ attested: false, ageBand: null, requiresVerification: false, verified: false }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await supabase
    .from("user_verifications")
    .select("age_band, attested_at, requires_verification, verified")
    .eq("clerk_user_id", userId)
    .single();

  return NextResponse.json({
    attested: !!data?.attested_at,
    ageBand: data?.age_band ?? null,
    requiresVerification: data?.requires_verification ?? false,
    verified: data?.verified ?? false,
  });
}
