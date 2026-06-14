import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LANG_MAP: Record<string, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  ar: "ar",
  hi: "hi",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const langCode = formData.get("language") as string | null;

    if (!audio) {
      return NextResponse.json({ error: "audio is required" }, { status: 400 });
    }

    const params: OpenAI.Audio.TranscriptionCreateParamsNonStreaming = {
      file: audio,
      model: "whisper-1",
    };

    const lang = langCode ? LANG_MAP[langCode] : undefined;
    if (lang) params.language = lang;

    const transcription = await client.audio.transcriptions.create(params);

    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
