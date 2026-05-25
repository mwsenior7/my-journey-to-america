import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INTERVIEW_SYSTEM = `You are a warm, empathetic interviewer helping immigrants share their stories for "My Journey to America" — a living digital archive preserving immigration stories for future generations.

Your role:
- Ask one question at a time, conversationally
- Acknowledge answers with genuine warmth before asking the next question
- Guide the conversation through: birthplace/early life, motivation to come to America, the journey itself, first days in America, challenges faced, how life has changed, hopes and dreams
- Keep responses to 2-3 sentences maximum
- After the user has answered at least 4-5 questions and shared enough detail, end your response with exactly this phrase on its own line: "I have everything I need to write your story."

Start the conversation by warmly greeting them and asking where they were born.`;

const GENERATE_SYSTEM = `You are a gifted writer documenting immigration stories for "My Journey to America" — a digital archive. Based on the interview transcript, craft a beautifully written, first-person narrative.

Requirements:
- First person ("I", "my", "we")
- 4-6 paragraphs, 350-600 words
- Vivid, specific, emotional details — not generic
- Arc: life before → decision to leave → the journey → arrival → life now → reflection/hope
- Dignified, warm, literary tone
- Preserve the person's unique voice and specific details they mentioned
- End with hope, resilience, or meaningful reflection

Output ONLY the story text. No title, no preamble, no commentary.`;

export async function POST(req: NextRequest) {
  const { messages, phase } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response("Invalid request", { status: 400 });
  }

  if (phase === "generate") {
    const transcript = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Person sharing their story" : "Interviewer"}: ${m.content}`
      )
      .join("\n\n");

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: GENERATE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Please write their story based on this interview:\n\n${transcript}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Interview phase
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: INTERVIEW_SYSTEM,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
