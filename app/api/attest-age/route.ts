import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function computeAge(year: number, month: number, day: number, today: Date): number {
  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = Number(body.year);
  const month = Number(body.month);
  const day = Number(body.day);

  const today = new Date();
  const candidate = new Date(year, month - 1, day);
  const isValidDate =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day &&
    candidate <= today &&
    year >= today.getFullYear() - 120;

  if (!isValidDate) {
    return NextResponse.json({ error: "Please enter a valid date of birth." }, { status: 400 });
  }

  const age = computeAge(year, month, day, today);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  if (age < 13) {
    return NextResponse.json({ blocked: true });
  }

  const ageBand = age < 18 ? "teen" : "adult";

  await supabase.from("user_verifications").upsert(
    { clerk_user_id: userId, age_band: ageBand, attested_at: new Date().toISOString() },
    { onConflict: "clerk_user_id" }
  );

  return NextResponse.json({ blocked: false, ageBand });
}
