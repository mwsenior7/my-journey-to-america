import { NextResponse } from "next/server";

export async function POST() {
  // Stub — wire up OpenAI Whisper when OPENAI_API_KEY is available:
  // const formData = await request.formData();
  // const audio = formData.get("audio") as File;
  // const response = await openai.audio.transcriptions.create({ file: audio, model: "whisper-1" });
  // return NextResponse.json({ text: response.text });
  return NextResponse.json({
    text: "Transcription coming soon — please type your answer",
  });
}
