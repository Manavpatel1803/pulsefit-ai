// Deno Edge Function — generates one unique fitness/nutrition/recovery tip via Groq,
// then emails it individually to every profile with newsletter_subscribed = true.
// Scheduled via pg_cron (see ../../migration_newsletter_cron.sql) to run daily at 9am.
//
// Deliberately doesn't use Resend Audiences/Broadcasts — those need a "full access" API
// key. Supabase is already this app's single source of truth for who's subscribed
// (profiles.newsletter_subscribed), so a "sending access" Resend key is all this needs.
//
// Deploy: supabase functions deploy daily-tip
// Secrets needed (supabase secrets set ...): GROQ_API_KEY, RESEND_API_KEY,
// RESEND_FROM_EMAIL (optional, has a default below).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase — no need to set them.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "PulseFit AI <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const TOPICS = [
  "a strength training tip",
  "a nutrition or macro tip",
  "a sleep or recovery tip",
  "a mindset or consistency tip",
  "a mobility or injury-prevention tip",
];

interface Tip {
  subject: string;
  body: string;
}

async function generateTip(): Promise<Tip> {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a sports-science coach writing one short daily tip email for a fitness app\'s subscriber list. Respond with strict JSON: {"subject": string (under 60 chars, specific, no clickbait, no emoji), "body": string (2-4 sentences, plain text, no markdown)}. Be specific and non-obvious — never a bare cliche like "consistency is key" or "stay hydrated" with no elaboration.',
        },
        {
          role: "user",
          content: `Write today's tip. Focus area: ${topic}. Ground it in something a knowledgeable coach would actually say — a mechanism, a number, a common mistake — not a vague platitude.`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq generation failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content) as Tip;
}

function renderHtml(tip: Tip): string {
  return `
    <div style="font-family: -apple-system, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0b0f19; color: #e2e8f0;">
      <p style="font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: #818cf8; margin: 0 0 8px;">Today's tip</p>
      <h1 style="font-size: 20px; margin: 0 0 16px; color: #fff;">${tip.subject}</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">${tip.body}</p>
      <p style="font-size: 11px; color: #64748b; margin-top: 32px;">
        PulseFit AI — you're receiving this because you subscribed to daily tips in the app. Unsubscribe anytime from your profile.
      </p>
    </div>
  `;
}

async function sendOne(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html }),
  });
  return res.ok;
}

Deno.serve(async () => {
  try {
    if (!GROQ_API_KEY || !RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing GROQ_API_KEY, RESEND_API_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: emails, error } = await supabase.rpc("get_subscribed_emails");
    if (error) throw new Error(`Could not load subscribers: ${error.message}`);

    const recipients: string[] = (emails ?? []).map((row: { email: string }) => row.email).filter(Boolean);
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, note: "No subscribers." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const tip = await generateTip();
    const html = renderHtml(tip);

    const results = await Promise.all(recipients.map((email) => sendOne(email, tip.subject, html)));
    const sent = results.filter(Boolean).length;

    return new Response(JSON.stringify({ ok: true, sent, failed: recipients.length - sent, subject: tip.subject }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
