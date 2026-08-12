import { NextResponse } from "next/server";
import { getUserFromAuthHeader } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WELCOME_HTML = `
  <div style="font-family: -apple-system, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0b0f19; color: #e2e8f0;">
    <p style="font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: #818cf8; margin: 0 0 8px;">Subscribed</p>
    <h1 style="font-size: 20px; margin: 0 0 16px; color: #fff;">You're on the list</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      One short, practical fitness, nutrition, or recovery tip lands every morning at 9am — never a repeat.
      You can unsubscribe anytime from your profile in the app.
    </p>
  </div>
`;

export async function POST(request: Request) {
  const user = await getUserFromAuthHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  try {
    await sendEmail(email, "You're subscribed to PulseFit AI tips", WELCOME_HTML);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not send confirmation: ${message}` }, { status: 502 });
  }
}
