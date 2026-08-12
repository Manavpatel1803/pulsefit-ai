"use client";

import { useState } from "react";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";

export default function NewsletterSubscribeModal({ onClose }: { onClose: () => void }) {
  const { user, session, updateProfile } = useApp();
  const toast = useToast();
  const [email, setEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function markPrompted() {
    try {
      await updateProfile({ newsletter_prompted: true });
    } catch {
      /* non-blocking */
    }
  }

  async function handleSubscribe() {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not subscribe.");
      // The API route only talks to Resend (needs the server-side API key); the
      // profile row itself is written here, same as every other profile field in
      // this app, so local state updates immediately instead of going stale.
      await updateProfile({
        newsletter_subscribed: true,
        newsletter_subscribed_at: new Date().toISOString(),
        newsletter_prompted: true,
      });
      toast.success("Subscribed", "Daily tips arrive every morning at 9am.");
      onClose();
    } catch (err) {
      toast.error("Could not subscribe", err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    await markPrompted();
    onClose();
  }

  return (
    <Modal title="Daily tips, straight to your inbox" onClose={handleSkip}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo/15 border border-indigo/30 shrink-0">
            <Sparkles className="h-4 w-4 text-indigo-glow" />
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            Get one unique fitness, nutrition, or recovery tip every morning at 9am — short, practical, never repeated. You can unsubscribe anytime.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="newsletter-email" className="text-xs font-medium text-mist">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-mist-dim" />
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-hairline pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSkip}
            className="flex-1 rounded-lg border border-hairline text-mist hover:text-white text-sm font-medium py-2.5 active:scale-[0.98] transition-all"
          >
            Not now
          </button>
          <button
            onClick={handleSubscribe}
            disabled={submitting || !email}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo hover:bg-indigo/90 active:scale-[0.98] disabled:opacity-60 text-[#fff] text-sm font-medium py-2.5 transition-all"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Subscribe
          </button>
        </div>
      </div>
    </Modal>
  );
}
