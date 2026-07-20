import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { detectInterviewAgeSignal } from "@/lib/detect-interview-age-signal";

// Real-time age-signal check kicks in once there's enough conversational
// content to judge from — checking after a single short answer is too noisy.
const AGE_SIGNAL_MIN_ANSWERS = 3;

// In-memory rate limiter: 10 requests per IP per hour
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

function buildInterviewSystem(ageBand: "teen" | "adult"): string {
  const question7 =
    ageBand === "teen"
      ? `7. "What American brands, stores, foods, shows, music, or hobbies became part of your new life? Where do you like to shop, what do you eat now that you love, what do you like to do for fun?"`
      : `7. "What American brands, stores, foods, or products became part of your new life? What do you drive, where do you shop, what do you eat now that you love?"`;

  const teenAddendum = `

TEEN STORYTELLER GUIDANCE:
This storyteller is a teenager. Adapt your approach accordingly:
- Use warm, simple, encouraging language suitable for a teenager — avoid formal or complex phrasing.
- Center your questions and follow-ups on school, friendships, family, language and cultural adjustment, hobbies, and how the move made them feel.
- NEVER ask about careers, jobs, finances, driving, marriage, or visa/legal specifics — these topics are off-limits for this storyteller.
- If a previous answer touches on hardship or something difficult, be extra gentle: warmly acknowledge their feelings and move on — do not probe for more traumatic detail.`;

  return `You are a warm, encouraging interviewer helping immigrants share their stories for "My Journey to America" — a living digital archive preserving immigration stories for future generations. Many of the people you talk to don't consider themselves writers, so your job is to make this feel like a friendly conversation, not an interview. Be genuinely curious, supportive, and enthusiastic about what they share.

Ask these 8 questions in order, one at a time. After each answer, respond with a warm, specific acknowledgment of what they said (1-2 sentences), then ask the next question. Reference details they mentioned to show you were truly listening.

QUESTIONS TO ASK (in this exact order):
1. Open with warmth: "Welcome — I'm so glad you're here to share your story! These stories matter so much. Let's start at the very beginning: where were you born, and what was life like there growing up?"
2. "What made you decide to come to America? Was there a moment when you knew — or did the idea build up inside you over time?"
3. "How did you make the journey here? Tell me about the travel itself — the route, the moments you remember, how you felt."
4. "What was your first day in America like? What did you see, hear, or feel that you've never forgotten?"
5. "What was the hardest thing about starting your new life here?"
6. "What surprised you most about America — something you truly didn't expect?"
${question7}
8. "How has your life changed since arriving? Looking back, what are you most proud of?"

RULES:
- Ask exactly one question at a time — never combine two questions
- Keep acknowledgments genuine and specific to their actual answer — reference the details they shared, not generic praise
- If an answer is very short, gently encourage a little more with something like "Can you tell me a bit more about that? Even a small detail paints such a vivid picture."
- Remind them occasionally that there are no wrong answers and their story is important
- After they've answered question 8 (or after all 8 questions feel naturally complete), end your final response with a warm closing like "Thank you so much for sharing all of this — what a remarkable journey." followed by exactly this phrase on its own line: "I have everything I need to write your story."${ageBand === "teen" ? teenAddendum : ""}

Begin with question 1.`;
}

function buildGenerateSystem(ageBand: "teen" | "adult"): string {
  const teenAddendum = `

TEEN STORYTELLER GUIDANCE:
This storyteller is a teenager. Preserve an authentic younger voice:
- Use simpler sentences and an honest, hopeful tone — the way a teenager would actually talk, not an adult looking back with polish.
- Never invent adult framing that wasn't in the interview — no career reflections, no "decades of hindsight," no grown-up life lessons they didn't actually say.
- Stay grounded in what they actually shared: school, friendships, family, adjusting to a new place, and how it felt.`;

  return `You are helping document immigration stories for "My Journey to America" — a digital archive preserving real people's experiences in their own words.

Based on the interview transcript, write a first-person story that sounds like the person is telling it to a friend over coffee. It should feel real and human, not literary or dramatic.

REQUIREMENTS:
- First person voice ("I", "my", "we") throughout
- 5-7 paragraphs, 500-750 words
- Use the person's actual words and phrases wherever possible — if they said something simply, keep it simple
- Cover the full arc: life in the homeland → the decision to leave → the journey → arrival in America → hardships and surprises → adaptation → life now → reflection
- Include the real specific details they mentioned: names, places, foods, stores, brands, vehicles — these make it feel true
- End with a genuine reflection in their own voice about what their life is like now

STYLE GUIDE:
- Conversational and direct — like talking to a friend, not writing for a magazine
- Short, clear sentences
- No purple prose, no dramatic metaphors, no flowery language
- No words like: "tapestry", "journey of the soul", "beacon", "profound", "visceral", "palpable", "mosaic", "kaleidoscope", "testament"
- If they described something plainly, don't dress it up — keep the plain version
- Authentic and believable, not dramatic or cinematic
- The story should sound like a real person wrote it, not a novelist${ageBand === "teen" ? teenAddendum : ""}

Output ONLY the story text. No title, no "Here is the story:", no preamble. Begin directly with the first word of the story.`;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "You've reached the limit for now — please try again in an hour" },
      { status: 429 }
    );
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { messages, phase, language } = await req.json();

    // Age band is looked up server-side from user_verifications — never trust
    // an age/band value from the client. Unauthenticated or unverified users
    // default to adult behavior.
    let ageBand: "teen" | "adult" = "adult";
    let ageConfirmedByVeriff = false;
    const { userId } = await auth();
    const supabase = userId
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )
      : null;
    if (supabase && userId) {
      const { data } = await supabase
        .from("user_verifications")
        .select("age_band, interview_age_check_result")
        .eq("clerk_user_id", userId)
        .single();
      if (data?.age_band === "teen") ageBand = "teen";
      // Once Veriff has confirmed this person is 13+ for this account, that ID
      // check outranks the text-based heuristic below — re-running it on the
      // same transcript could otherwise re-flag appears_under_13 forever.
      if (data?.interview_age_check_result === "ok") ageConfirmedByVeriff = true;
    }

    // Build language-aware system prompts
    const langMap: Record<string, string> = {
      es: "Spanish", fr: "French", pt: "Portuguese", de: "German", it: "Italian",
      zh: "Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
      ru: "Russian", uk: "Ukrainian", el: "Greek",
    };
    const targetLang = language && language !== "en" ? langMap[language] : null;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (phase !== "generate" && messages.length === 0) {
      return NextResponse.json({ error: "messages: at least one message is required" }, { status: 400 });
    }

    if (phase === "generate") {
      const baseGenerateSystem = buildGenerateSystem(ageBand);
      const generateSystem = targetLang
        ? `${baseGenerateSystem}\n\nIMPORTANT: Write the entire story in ${targetLang}.`
        : baseGenerateSystem;

      const transcript = messages
        .map((m: { role: string; content: string }) =>
          `${m.role === "user" ? "Person sharing their story" : "Interviewer"}: ${m.content}`
        )
        .join("\n\n");

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: generateSystem,
        messages: [
          {
            role: "user",
            content: `Write their story based on this interview:\n\n${transcript}`,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";

      const previewResponse = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `Read this immigration story and extract the single most emotionally compelling sentence that would make a reader desperate to read the full story. Return ONLY that one sentence, nothing else, no quotes, no explanation.\n\n${text}`,
          },
        ],
      });
      const preview_text =
        previewResponse.content[0].type === "text"
          ? previewResponse.content[0].text.trim()
          : null;

      return NextResponse.json({ text, preview_text });
    }

    const answeredCount = messages.filter(
      (m: { role: string }) => m.role === "user"
    ).length;

    if (!ageConfirmedByVeriff && answeredCount >= AGE_SIGNAL_MIN_ANSWERS) {
      const transcriptSoFar = messages
        .map((m: { role: string; content: string }) =>
          `${m.role === "user" ? "Person sharing their story" : "Interviewer"}: ${m.content}`
        )
        .join("\n\n");

      const signal = await detectInterviewAgeSignal(transcriptSoFar);

      if (signal.appearsUnder13) {
        return NextResponse.json({ ageGate: "under_13" });
      }

      if (signal.appearsTeenNotAdult && ageBand === "adult" && supabase && userId) {
        await supabase.from("user_verifications").upsert(
          { clerk_user_id: userId, age_band: "teen" },
          { onConflict: "clerk_user_id" }
        );
        ageBand = "teen";
      }
    }

    const baseInterviewSystem = buildInterviewSystem(ageBand);
    const interviewSystem = targetLang
      ? `${baseInterviewSystem}\n\nIMPORTANT: Conduct this entire interview in ${targetLang}. All your responses, questions, and acknowledgments must be written in ${targetLang}. When you reach the closing phrase, write the line "I have everything I need to write your story." in ${targetLang} as well, but also include the exact English phrase "I have everything I need to write your story." on the same line in parentheses so the system can detect it.`
      : baseInterviewSystem;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 350,
      system: interviewSystem,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ text });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
