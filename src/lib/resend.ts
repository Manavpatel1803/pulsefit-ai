const RESEND_API_URL = "https://api.resend.com";

/** Server-only. Never import this file from a "use client" component. */
function getApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set in the server environment.");
  return apiKey;
}

/**
 * Sends one email via Resend's plain send endpoint. Deliberately doesn't use Resend
 * Audiences/Broadcasts — those need a "full access" API key, and Supabase is already
 * this app's single source of truth for who's subscribed (profiles.newsletter_subscribed).
 * A "sending access" key is all this needs.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? "PulseFit AI <onboarding@resend.dev>";
  const res = await fetch(`${RESEND_API_URL}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  }
}
