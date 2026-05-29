import { NextRequest, NextResponse } from "next/server";

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

// DeepL uses different base URLs for free vs pro keys.
// Free keys end with ':fx'.
function deeplUrl() {
  const isFree = DEEPL_API_KEY?.endsWith(":fx");
  return isFree
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

// App uses lowercase codes; DeepL needs uppercase.
// Portuguese maps to PT-BR (most widely spoken variant).
const DEEPL_CODE: Record<string, string> = {
  es: "ES", fr: "FR", pt: "PT-BR", de: "DE", it: "IT",
  zh: "ZH", ja: "JA", ko: "KO", ar: "AR", hi: "HI", en: "EN",
  ru: "RU", uk: "UK", el: "EL",
};

async function translateWithDeepl(
  text: string,
  target: string,
  source?: string
): Promise<string> {
  const res = await fetch(deeplUrl(), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      target_lang: DEEPL_CODE[target] ?? target.toUpperCase(),
      ...(source ? { source_lang: DEEPL_CODE[source] ?? source.toUpperCase() } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepL error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.translations[0].text as string;
}

export async function POST(req: NextRequest) {
  const { text, source, target } = await req.json();

  if (!text || !target) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!DEEPL_API_KEY) {
    return NextResponse.json({ error: "Translation not configured" }, { status: 503 });
  }

  try {
    // DeepL supports up to 128 KB per request; split only if truly massive.
    const MAX_CHARS = 100_000;
    let translatedText: string;

    if (text.length <= MAX_CHARS) {
      translatedText = await translateWithDeepl(text, target, source);
    } else {
      const paragraphs = text.split("\n\n");
      const chunks: string[] = [];
      let current = "";

      for (const para of paragraphs) {
        if (current.length + para.length + 2 > MAX_CHARS) {
          if (current) chunks.push(current.trim());
          current = para + "\n\n";
        } else {
          current += para + "\n\n";
        }
      }
      if (current.trim()) chunks.push(current.trim());

      const translated = await Promise.all(
        chunks.map(c => translateWithDeepl(c, target, source))
      );
      translatedText = translated.join("\n\n");
    }

    return NextResponse.json({ translatedText });
  } catch {
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
