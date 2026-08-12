"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { useApp } from "@/context/AppContext";
import NewsletterSubscribeModal from "@/components/NewsletterSubscribeModal";

export default function Footer() {
  const { user, profile } = useApp();
  const [showSubscribe, setShowSubscribe] = useState(false);
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="border-t border-hairline mt-auto">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-mist-dim text-center sm:text-left">
            © {year} PulseFit AI. All rights reserved. PulseFit AI™ and the PulseFit logo are trademarks of PulseFit AI.
          </p>

          {user && profile && !profile.newsletter_subscribed && (
            <button
              onClick={() => setShowSubscribe(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-glow hover:underline active:scale-95 transition-transform shrink-0"
            >
              <Mail className="h-3.5 w-3.5" />
              Subscribe for daily tips
            </button>
          )}
        </div>
      </footer>

      {showSubscribe && <NewsletterSubscribeModal onClose={() => setShowSubscribe(false)} />}
    </>
  );
}
