import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LANG_MAP: Record<string, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  ar: "ar",
  hi: "hi",
};

const SILENCE_DENYLIST = new Set([
  "you",
  "you.",
  "thank you",
  "thank you.",
  "thanks for watching",
  "thanks for watching.",
  "thanks for watching!",
  "thank you for watching.",
  "thank you for watching!",
  "bye",
  "bye.",
]);

function extFromFile(file: File): string {
  const nameParts = file.name.split(".");
  if (nameParts.length > 1) return nameParts.pop()!;
  const typeParts = file.type.split("/");
  if (typeParts.length > 1 && typeParts[1]) return typeParts[1].split(";")[0];
  return "audio";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const langCode = formData.get("language") as string | null;

    if (!audio) {
      return NextResponse.json({ error: "audio is required" }, { status: 400 });
    }

    const params: OpenAI.Audio.TranscriptionCreateParamsNonStreaming<"verbose_json"> = {
      file: audio,
      model: "whisper-1",
      response_format: "verbose_json",
    };

    const lang = langCode ? LANG_MAP[langCode] : undefined;
    if (lang) params.language = lang;

    const transcription = await client.audio.transcriptions.create(params);

    const segments = transcription.segments ?? [];
    const avgNoSpeechProb =
      segments.length === 0
        ? 1
        : segments.reduce((sum, s) => sum + s.no_speech_prob, 0) / segments.length;

    const trimmedLower = transcription.text.trim().toLowerCase();
    const isDenylist =
      SILENCE_DENYLIST.has(trimmedLower) && trimmedLower.length < 20;

    const no_speech_detected = avgNoSpeechProb > 0.5 || isDenylist;

    // Diagnostic-only logging — does not affect no_speech_detected or the response.
    const avgLogprob =
      segments.length === 0
        ? null
        : segments.reduce((sum, s) => sum + s.avg_logprob, 0) / segments.length;
    const avgCompressionRatio =
      segments.length === 0
        ? null
        : segments.reduce((sum, s) => sum + s.compression_ratio, 0) / segments.length;
    console.log("[transcribe diagnostic]", {
      no_speech_detected,
      avgNoSpeechProb,
      avgLogprob,
      avgCompressionRatio,
      isDenylist,
      textPreview: transcription.text.slice(0, 60),
    });

    const text = no_speech_detected ? "" : transcription.text;

    let audio_url: string | null = null;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false },
        });
        const ext = extFromFile(audio);
        const path = `interview/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const arrayBuffer = await audio.arrayBuffer();
        const { data: upload, error: uploadErr } = await supabase.storage
          .from("story-audio")
          .upload(path, Buffer.from(arrayBuffer), { contentType: audio.type || "audio/webm" });
        if (uploadErr) {
          console.error("[transcribe] storage upload failed:", uploadErr.message);
        } else {
          const { data: urlData } = supabase.storage
            .from("story-audio")
            .getPublicUrl(upload.path);
          audio_url = urlData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.error("[transcribe] storage error:", storageErr);
    }

    return NextResponse.json({ text, no_speech: no_speech_detected, audio_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
