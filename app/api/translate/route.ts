import { NextRequest, NextResponse } from "next/server";

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

function deeplUrl() {
  return DEEPL_API_KEY?.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

const DEEPL_SOURCE: Record<string, string> = {
  en: "EN",
  es: "ES",
  fr: "FR",
  pt: "PT",
  de: "DE",
  it: "IT",
  zh: "ZH",
  ja: "JA",
  ko: "KO",
  ar: "AR",
  hi: "HI",
  ru: "RU",
  uk: "UK",
  el: "EL",
  vi: "VI",
};

export async function POST(req: NextRequest) {
  if (!DEEPL_API_KEY) {
    return NextResponse.json({ error: "Translation not configured" }, { status: 503 });
  }

  try {
    const { text, source, target } = await req.json();
    if (!text || !target) return NextResponse.json({ error: "text and target required" }, { status: 400 });

    const res = await fetch(deeplUrl(), {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [String(text)],
        target_lang: (target || "EN").toUpperCase(),
        source_lang: (source || "EN") ? (DEEPL_SOURCE[source] ?? (source || "EN")).toUpperCase() : undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `DeepL ${res.status}: ${body}` }, { status: 502 });
    }

    const data = await res.json();
    const translated = data.translations?.[0]?.text ?? "";
    return NextResponse.json({ translated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "translation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
