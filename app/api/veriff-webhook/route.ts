import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const secret = process.env.VERIFF_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hmac-signature") ?? "";

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (signature !== expected) {
    console.error("Veriff webhook signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const verification = payload.verification;

  if (!verification) {
    return NextResponse.json({ ok: true });
  }

  const status = verification.status;
  const vendorData = verification.vendorData; // clerk_user_id
  const dateOfBirth = verification.person?.dateOfBirth;

  if (!vendorData) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  if (status === "approved") {
    // Check age — must be 18+
    let isAdult = false;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      isAdult = age >= 18;
    }

    if (isAdult) {
      await supabase.from("user_verifications").upsert(
        {
          clerk_user_id: vendorData,
          verified: true,
          date_of_birth: dateOfBirth,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "clerk_user_id" }
      );
      console.log(`Veriff: user ${vendorData} verified as 18+`);
    } else {
      await supabase.from("user_verifications").upsert(
        {
          clerk_user_id: vendorData,
          verified: false,
          date_of_birth: dateOfBirth,
        },
        { onConflict: "clerk_user_id" }
      );
      console.log(`Veriff: user ${vendorData} is under 18 — blocked`);
    }
  } else {
    console.log(`Veriff: user ${vendorData} verification status: ${status}`);
  }

  return NextResponse.json({ ok: true });
}
