"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { CoachChatError, sendCoachMessage } from "@/lib/auraCoachEngine";

interface LocalMessage {
  role: "user" | "assistant";
  content: string;
}

const GREETING: LocalMessage = {
  role: "assistant",
  content: "I'm AuraCoach. Ask me about today's training load, recovery, or how to adjust your plan.",
};

export default function CoachAuraChat() {
  const { profile, fitnessState, session } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function handleSend() {
    const content = input.trim();
    if (!content || loading || !session) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const reply = await sendCoachMessage(next, profile?.goal ?? null, fitnessState, session.access_token);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof CoachChatError ? err.message : "AuraCoach couldn't respond. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AuraCoach chat" : "Open AuraCoach chat"}
        className="fixed bottom-5 right-5 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-amber text-void shadow-[0_0_24px_rgba(245,158,11,0.4)] hover:scale-105 transition-transform"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm h-[28rem]">
          {/* .glass-pro sets position:relative for its shimmer overlay — nested one
              level down so it can't win the cascade against this wrapper's position:fixed
              (equal-specificity CSS classes resolve by source order, and .glass-pro's
              plain rule in globals.css comes after Tailwind's utilities). */}
          <div className="glass-raised glass-pro h-full flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline shrink-0">
            <Sparkles className="h-4 w-4 text-amber" />
            <span className="font-display text-sm font-semibold text-white">AuraCoach</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-indigo/20 text-slate-100"
                    : "bg-white/5 text-slate-200 border border-hairline"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="bg-white/5 border border-hairline rounded-lg px-3 py-2 w-fit">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-mist" />
              </div>
            )}
            {error && <p className="text-xs text-amber">{error}</p>}
          </div>

          <div className="flex items-center gap-2 p-3 border-t border-hairline shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask AuraCoach..."
              className="flex-1 rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white placeholder:text-mist-dim outline-none focus:border-amber/50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber text-void disabled:opacity-40 transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
