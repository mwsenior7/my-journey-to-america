import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { COUNTRY_REGIONS, lookupRegion } from "@/lib/regions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;
const COLUMNS =
  "id, author_name, country_of_origin, us_state, year_of_arrival, profession, story_text, preview_text, tags, audio_url, video_url, read_count, created_at";

type Tier = "same" | "region" | "rest";

function quoteList(items: string[]): string {
  return `(${items.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")})`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyTierFilter(
  query: any,
  tier: Tier,
  excludeId: string,
  sourceCountry: string,
  regionCountries: string[]
) {
  let q = query.eq("status", "approved").neq("id", excludeId);
  if (tier === "same") {
    return q.eq("country_of_origin", sourceCountry);
  }
  if (tier === "region") {
    return q.in("country_of_origin", regionCountries.length ? regionCountries : ["__none__"]);
  }
  q = q.neq("country_of_origin", sourceCountry);
  if (regionCountries.length > 0) {
    q = q.not("country_of_origin", "in", quoteList(regionCountries));
  }
  return q;
}

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: source } = await supabase
    .from("stories")
    .select("country_of_origin")
    .eq("id", id)
    .single();

  const sourceCountry = source?.country_of_origin?.trim() ?? "";
  const sourceRegion = sourceCountry ? lookupRegion(sourceCountry) : null;
  const regionCountries = sourceRegion
    ? Object.entries(COUNTRY_REGIONS)
        .filter(([country, region]) => region === sourceRegion && country !== sourceCountry)
        .map(([country]) => country)
    : [];

  async function tierCount(tier: Tier): Promise<number> {
    const q = applyTierFilter(
      supabase.from("stories").select("id", { count: "exact", head: true }),
      tier,
      id!,
      sourceCountry,
      regionCountries
    );
    const { count } = await q;
    return count ?? 0;
  }

  async function tierData(tier: Tier, from: number, to: number) {
    const q = applyTierFilter(
      supabase.from("stories").select(COLUMNS),
      tier,
      id!,
      sourceCountry,
      regionCountries
    );
    const { data } = await q.order("created_at", { ascending: false }).range(from, to);
    return data ?? [];
  }

  const [count1, count2, count3] = await Promise.all([
    tierCount("same"),
    tierCount("region"),
    tierCount("rest"),
  ]);
  const total = count1 + count2 + count3;

  const results: Record<string, unknown>[] = [];
  let need = PAGE_SIZE;
  let pos = offset;

  if (need > 0 && pos < count1) {
    const from = pos;
    const to = Math.min(count1, pos + need) - 1;
    results.push(...(await tierData("same", from, to)));
    need -= results.length;
  }
  pos = Math.max(0, pos - count1);

  if (need > 0 && pos < count2) {
    const from = pos;
    const to = Math.min(count2, pos + need) - 1;
    const rows = await tierData("region", from, to);
    results.push(...rows);
    need -= rows.length;
  }
  pos = Math.max(0, pos - count2);

  if (need > 0 && pos < count3) {
    const from = pos;
    const to = Math.min(count3, pos + need) - 1;
    const rows = await tierData("rest", from, to);
    results.push(...rows);
  }

  const hasMore = offset + PAGE_SIZE < total;

  return NextResponse.json({ stories: results, hasMore, total });
}
