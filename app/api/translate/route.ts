import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

async function translateChunk(chunk: string, target: string, source?: string): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: chunk,
      target,
      ...(source ? { source } : {}),
      format: "text",
    }),
  });
  if (!res.ok) throw new Error(`Translation API error: ${res.status}`);
  const data = await res.json();
  return data.data.translations[0].translatedText;
}

export async function POST(req: NextRequest) {
  const { text, source, target } = await req.json();

  if (!text || !target) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: "Translation not configured" }, { status: 503 });
  }

  try {
    const MAX_CHARS = 4000;
    let translatedText: string;

    if (text.length <= MAX_CHARS) {
      translatedText = await translateChunk(text, target, source);
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

      const translated = await Promise.all(chunks.map(c => translateChunk(c, target, source)));
      translatedText = translated.join("\n\n");
    }

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
