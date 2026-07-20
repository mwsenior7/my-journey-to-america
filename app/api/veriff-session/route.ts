import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.VERIFF_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Veriff not configured" }, { status: 503 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: existing } = await supabase
    .from("user_verifications")
    .select("verified")
    .eq("clerk_user_id", userId)
    .single();

  if (existing?.verified) {
    return NextResponse.json({ alreadyVerified: true });
  }

  let purpose: string | null = null;
  try {
    const reqBody = await req.json();
    if (reqBody?.purpose === "interview_age_check") purpose = "interview_age_check";
  } catch {
    // no JSON body — original (post-submission escalation) flow
  }

  const callback =
    purpose === "interview_age_check"
      ? "https://www.myjourneytoamerica.com/verify-interview-complete"
      : "https://www.myjourneytoamerica.com/verify-complete";

  const body = {
    verification: {
      callback,
      vendorData: userId,
      timestamp: new Date().toISOString(),
    },
  };

  const res = await fetch("https://stationapi.veriff.com/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AUTH-CLIENT": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Veriff session creation failed:", err);
    return NextResponse.json({ error: "Failed to create verification session" }, { status: 500 });
  }

  const data = await res.json();
  const sessionId = data.verification?.id;
  const sessionUrl = data.verification?.url;

  if (!sessionId || !sessionUrl) {
    console.error("Veriff invalid response:", JSON.stringify(data));
    return NextResponse.json({ error: "Invalid Veriff response" }, { status: 500 });
  }

  await supabase.from("user_verifications").upsert(
    purpose === "interview_age_check"
      ? {
          clerk_user_id: userId,
          veriff_session_id: sessionId,
          veriff_purpose: purpose,
          interview_age_check_result: "pending",
        }
      : {
          clerk_user_id: userId,
          veriff_session_id: sessionId,
          verified: false,
          veriff_purpose: null,
        },
    { onConflict: "clerk_user_id" }
  );

  return NextResponse.json({ sessionUrl });
}
