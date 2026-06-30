import Anthropic from "@anthropic-ai/sdk";

type ModerationResult = {
  decision: "approved" | "pending";
  reason: string;
};

export async function moderateStory(
  storyText: string,
  authorName: string,
  country: string
): Promise<ModerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("moderateStory: ANTHROPIC_API_KEY is not set");
    return { decision: "pending", reason: "Moderation skipped: API key not configured." };
  }

  const client = new Anthropic({ apiKey });

  const userMessage = `You are a content moderator for "My Journey to America," a platform where immigrants share their personal immigration stories to the United States. Determine if this submission is appropriate for publication.

APPROVE if the story is:
- A genuine personal immigration story (even rough or brief)
- About someone's journey to or life in the US
- Respectful and free of hate speech

SEND TO MANUAL REVIEW (pending) if the story:
- Contains hate speech, slurs, or content targeting groups
- Is spam, promotional content, or completely unrelated to immigration
- Contains harmful, threatening, or illegal content
- Is nonsensical or clearly not a real immigration story
- Is under 30 words with no genuine personal content (test submission)

Story submission:
- Author: ${authorName}
- Country of origin: ${country}
- Story text: ${storyText}

Respond with JSON only, no other text:
{"decision": "approved", "reason": "..."} or {"decision": "pending", "reason": "..."}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    console.log("moderateStory raw response:", raw);

    const parsed = JSON.parse(raw);

    if (parsed.decision === "approved" || parsed.decision === "pending") {
      return { decision: parsed.decision, reason: String(parsed.reason ?? "") };
    }

    console.error("moderateStory: unexpected decision value:", parsed.decision);
    return { decision: "pending", reason: "Moderation result unclear; flagged for manual review." };
  } catch (err) {
    console.error("moderateStory error:", err);
    return { decision: "pending", reason: "Moderation service unavailable; flagged for manual review." };
  }
}
