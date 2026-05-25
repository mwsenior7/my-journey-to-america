import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

function deeplUrl() {
  return DEEPL_API_KEY?.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

// The 10 target languages — stored with lowercase codes matching the app.
const TARGET_LANGUAGES = [
  { code: "es", deeplCode: "ES" },
  { code: "fr", deeplCode: "FR" },
  { code: "pt", deeplCode: "PT-BR" },
  { code: "de", deeplCode: "DE" },
  { code: "it", deeplCode: "IT" },
  { code: "zh", deeplCode: "ZH" },
  { code: "ja", deeplCode: "JA" },
  { code: "ko", deeplCode: "KO" },
  { code: "ar", deeplCode: "AR" },
  { code: "hi", deeplCode: "HI" },
  { code: "ru", deeplCode: "RU" },
  { code: "uk", deeplCode: "UK" },
  { code: "el", deeplCode: "EL" },
];

const DEEPL_SOURCE: Record<string, string> = {
  en: "EN", es: "ES", fr: "FR", pt: "PT", de: "DE",
  it: "IT", zh: "ZH", ja: "JA", ko: "KO", ar: "AR", hi: "HI",
  ru: "RU", uk: "UK", el: "EL",
};

async function translateOne(
  text: string,
  targetDeeplCode: string,
  sourceLang: string
): Promise<string> {
  const res = await fetch(deeplUrl(), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetDeeplCode,
      source_lang: DEEPL_SOURCE[sourceLang] ?? "EN",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepL ${res.status} for ${targetDeeplCode}: ${body}`);
  }

  const data = await res.json();
  return data.translations[0].text as string;
}

export async function POST(req: NextRequest) {
  if (!DEEPL_API_KEY) {
    return NextResponse.json({ error: "Translation not configured" }, { status: 503 });
  }

  const { storyId } = await req.json();
  if (!storyId) {
    return NextResponse.json({ error: "storyId required" }, { status: 400 });
  }

  // Use the service-side Supabase client (server-only — keys not exposed to client).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch the story text server-side so the client can't inject arbitrary text.
  const { data: story, error: fetchErr } = await supabase
    .from("stories")
    .select("story_text, original_language")
    .eq("id", storyId)
    .single();

  if (fetchErr || !story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const { story_text, original_language } = story;
  const sourceLang = original_language ?? "en";

  // Skip languages that match the original — no point translating to itself.
  const targets = TARGET_LANGUAGES.filter(l => l.code !== sourceLang);

  // Translate all in parallel; collect results and any per-language errors.
  const results = await Promise.allSettled(
    targets.map(async ({ code, deeplCode }) => {
      const translated = await translateOne(story_text, deeplCode, sourceLang);
      return { code, translated };
    })
  );

  const rows = results
    .filter((r): r is PromiseFulfilledResult<{ code: string; translated: string }> =>
      r.status === "fulfilled"
    )
    .map(r => ({
      story_id: storyId,
      language_code: r.value.code,
      story_text: r.value.translated,
    }));

  const failed = results
    .filter(r => r.status === "rejected")
    .map(r => (r as PromiseRejectedResult).reason?.message ?? "unknown");

  if (failed.length > 0) {
    console.error("Some translations failed:", failed);
  }

  if (rows.length > 0) {
    const { error: insertErr } = await supabase
      .from("story_translations")
      .upsert(rows, { onConflict: "story_id,language_code" });

    if (insertErr) {
      console.error("Supabase insert error:", insertErr);
      return NextResponse.json({ error: "Failed to store translations" }, { status: 500 });
    }
  }

  return NextResponse.json({
    translated: rows.length,
    failed: failed.length,
    languages: rows.map(r => r.language_code),
  });
}
