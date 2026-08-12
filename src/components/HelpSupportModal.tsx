"use client";

import { useRef, useState } from "react";
import { ChevronDown, Mail, MessageCircleQuestion } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Modal from "@/components/Modal";
import { EASE, reducedMotion } from "@/lib/motion";

const FAQ: { q: string; a: string }[] = [
  {
    q: "How does the Today priority get decided?",
    a: "It's calculated from your actual logged workouts, recovery, and nutrition — never guessed. Plus and Pro tiers add an AI-explained version of the same underlying numbers.",
  },
  {
    q: "How do I change my subscription tier?",
    a: "Use the Free / Plus / Pro switcher in the header. Upgrades go through Stripe Checkout; downgrading to Free opens the billing portal to cancel.",
  },
  {
    q: "How do I update my payment method or view invoices?",
    a: "Click Free in the tier switcher at the top of the page — that opens Stripe's billing portal, where you can add or replace a card and download past invoices, even while staying on Plus or Pro.",
  },
  {
    q: "How do I get a refund?",
    a: "Email support@pulsefit.ai with your account email within 14 days of the charge. Refunds are reviewed manually and, once approved, are returned to your original payment method within 3-5 business days.",
  },
  {
    q: "Will I be charged again after I cancel?",
    a: "No — cancelling in the billing portal stops future renewals immediately, but you keep paid-tier access until the end of the period you already paid for.",
  },
  {
    q: "Can I change my goal or preferences later?",
    a: "Yes — open your name in the header and choose Edit profile to update any onboarding answer at any time.",
  },
  {
    q: "How do I stop the daily tip emails?",
    a: "Open Edit profile, or use the unsubscribe link in any tip email — both turn it off immediately.",
  },
];

function FAQItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const answerRef = useRef<HTMLParagraphElement>(null);
  const chevronRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  // Keyed on `open` (not the click handler) so this also animates an item shut when a
  // *different* item is opened — this is a single-open accordion, so most collapses are
  // triggered by someone else's click, not this item's own onClick.
  useGSAP(
    () => {
      const el = answerRef.current;
      const chevron = chevronRef.current;
      if (!el || !chevron) return;

      if (!mounted.current || reducedMotion()) {
        mounted.current = true;
        gsap.set(el, open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 });
        gsap.set(chevron, { rotate: open ? 180 : 0 });
        return;
      }

      if (open) {
        gsap.fromTo(el, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.3, ease: EASE.standard });
      } else {
        gsap.to(el, { height: 0, opacity: 0, duration: 0.25, ease: EASE.standard });
      }
      gsap.to(chevron, { rotate: open ? 180 : 0, duration: 0.25, ease: EASE.standard });
    },
    { dependencies: [open] }
  );

  return (
    <div className="rounded-lg bg-white/5 border border-hairline overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-start gap-2 p-3.5 text-left"
      >
        <MessageCircleQuestion className="h-4 w-4 text-indigo-glow shrink-0 mt-0.5" />
        <span className="flex-1 text-sm font-medium text-white">{q}</span>
        <div ref={chevronRef} className="shrink-0 mt-0.5">
          <ChevronDown className="h-4 w-4 text-mist" aria-hidden="true" />
        </div>
      </button>
      <p ref={answerRef} className="text-xs text-mist leading-relaxed pl-6 pr-3.5 overflow-hidden h-0 opacity-0">
        <span className="block pb-3.5">{a}</span>
      </p>
    </div>
  );
}

export default function HelpSupportModal({ onClose }: { onClose: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Modal title="Help & support" onClose={onClose}>
      <div className="space-y-5">
        <div className="space-y-2.5">
          {FAQ.map((item, i) => (
            <FAQItem
              key={item.q}
              q={item.q}
              a={item.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
            />
          ))}
        </div>

        <a
          href="mailto:support@pulsefit.ai"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 border border-hairline hover:border-indigo-glow/40 hover:text-indigo-glow active:scale-[0.98] text-sm text-slate-200 py-2.5 transition-all"
        >
          <Mail className="h-4 w-4" />
          Email support@pulsefit.ai
        </a>
      </div>
    </Modal>
  );
}
