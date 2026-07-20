import Anthropic from "@anthropic-ai/sdk";

type AgeSignalResult = {
  appearsUnder13: boolean;
  appearsTeenNotAdult: boolean;
};

const SAFE_DEFAULT: AgeSignalResult = { appearsUnder13: false, appearsTeenNotAdult: false };

export async function detectInterviewAgeSignal(transcript: string): Promise<AgeSignalResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("detectInterviewAgeSignal: ANTHROPIC_API_KEY is not set");
    return SAFE_DEFAULT;
  }

  const client = new Anthropic({ apiKey });

  const userMessage = `You are a safety classifier for "My Journey to America," a platform where people share personal immigration stories. Read this in-progress interview transcript and judge only the storyteller's apparent age from what they've said — nothing else.

Set "appears_under_13" to true ONLY if the content strongly suggests the storyteller is currently a child under 13 (for example: describes themselves as currently in elementary school, mentions their current age as under 13, or other strong, unambiguous signals). Do not infer this from vague or ambiguous language.

Set "appears_teen_not_adult" to true ONLY if the content suggests the storyteller is currently a teenager (roughly 13-17) rather than an adult — for example, references to currently being in middle or high school, a current teacher or homeroom, or a parent making decisions on their behalf — even though they may be presenting as an adult. Do not set this to true just because the story describes childhood or teenage memories from someone who is clearly speaking as an adult looking back.

These two fields are independent judgments; do not assume one implies the other.

Interview transcript so far:
${transcript}

Respond with ONLY the raw JSON object, no other text, no markdown code fences or backticks:
{"appears_under_13": false, "appears_teen_not_adult": false}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 100,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    let parsed: { appears_under_13?: unknown; appears_teen_not_adult?: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*?\}/);
      if (!match) throw new Error("No JSON object found in age-signal response");
      parsed = JSON.parse(match[0]);
    }

    return {
      appearsUnder13: parsed.appears_under_13 === true,
      appearsTeenNotAdult: parsed.appears_teen_not_adult === true,
    };
  } catch (err) {
    console.error("detectInterviewAgeSignal error:", err);
    return SAFE_DEFAULT;
  }
}
