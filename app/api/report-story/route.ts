import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

async function categorizeReport(reason: string, comment: string, storyExcerpt: string): Promise<{ category: string; summary: string }> {
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `You are reviewing a user complaint about an immigration story on a platform called My Journey to America.

Reason selected: ${reason}
User comment: ${comment || "(none)"}
Story excerpt: ${storyExcerpt}

Classify this report into exactly one of these categories:
- HATE_SPEECH: Content that is hateful, discriminatory, or dehumanizing
- PRIVACY: Contains personal information that should not be public
- MISINFORMATION: Contains demonstrably false claims
- SPAM: Fake, promotional, or irrelevant content
- HARASSMENT: Targets or attacks a specific person
- SENSITIVE_CONTENT: Graphic, disturbing, or inappropriate content
- OTHER: Does not fit the above categories

Respond with JSON only, no other text:
{"category": "CATEGORY_NAME", "summary": "One sentence explaining the concern"}`,
      }],
    });
    const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const parsed = JSON.parse(text);
    return { category: parsed.category ?? "OTHER", summary: parsed.summary ?? "" };
  } catch {
    return { category: "OTHER", summary: "Could not auto-categorize" };
  }
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL ?? "michaelwsenior@gmail.com";
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@myjourneytoamerica.com";

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { story_id, reporter_email, reason, comment, story_excerpt } = body as {
    story_id: string;
    reporter_email?: string;
    reason: string;
    comment?: string;
    story_excerpt?: string;
  };

  if (!story_id || !reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { category, summary } = await categorizeReport(reason, comment ?? "", story_excerpt ?? "");

  const { error: insertError } = await supabase.from("reports").insert({
    story_id,
    reporter_email: reporter_email ?? null,
    reason,
    comment: comment ?? null,
    ai_category: category,
    ai_summary: summary,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (reporter_email) {
    await resend.emails.send({
      from: fromEmail,
      to: reporter_email,
      subject: "We received your report — My Journey to America",
      html: `
        <p>Thank you for taking the time to report a concern on My Journey to America.</p>
        <p>We have received your report and will review it carefully. We take all reports seriously and aim to review flagged content within 48 hours.</p>
        <p>You do not need to take any further action.</p>
        <br/>
        <p>— The My Journey to America Team</p>
      `,
    }).catch(() => {/* non-critical */});
  }

  await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: `[Report] ${category} — Story ${story_id}`,
    html: `
      <h2>New Story Report</h2>
      <p><strong>Story ID:</strong> ${story_id}</p>
      <p><strong>Reporter:</strong> ${reporter_email ?? "Anonymous"}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Comment:</strong> ${comment ?? "(none)"}</p>
      <hr/>
      <p><strong>AI Category:</strong> ${category}</p>
      <p><strong>AI Summary:</strong> ${summary}</p>
      <br/>
      <p><a href="https://www.myjourneytoamerica.com/admin">Review in Admin Panel →</a></p>
    `,
  }).catch(() => {/* non-critical */});

  return NextResponse.json({ success: true });
}
