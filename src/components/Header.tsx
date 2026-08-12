"use client";

import { useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { TIER_RANK, type Tier } from "@/lib/types";
import { BillingError, openBillingPortal, startCheckout } from "@/lib/billing";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";

const TIERS: Tier[] = ["free", "plus", "pro"];
const TIER_LABEL: Record<Tier, string> = { free: "Free", plus: "Plus", pro: "Pro" };

export default function Header() {
  const { profile, session, user } = useApp();
  const toast = useToast();
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);

  if (!user || !profile) return null;

  async function handleTierClick(target: Tier) {
    if (!session || target === profile!.tier) return;
    setPendingTier(target);
    try {
      if (target === "free") {
        await openBillingPortal(session.access_token);
      } else {
        await startCheckout(target, session.access_token);
      }
    } catch (err) {
      toast.error("Billing action failed", err instanceof BillingError ? err.message : undefined);
      setPendingTier(null);
    }
  }

  const tierSwitcher = (
    <div
      role="tablist"
      aria-label="Subscription tier"
      className="flex items-center gap-0.5 rounded-full glass p-1"
    >
      {TIERS.map((t) => {
        const active = profile.tier === t;
        const isPending = pendingTier === t;
        return (
          <button
            key={t}
            role="tab"
            aria-selected={active}
            disabled={pendingTier !== null}
            onClick={() => handleTierClick(t)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 disabled:opacity-60 disabled:active:scale-100 ${
              active
                ? t === "pro"
                  ? "bg-amber text-ink"
                  : t === "plus"
                    ? "bg-indigo text-[#fff]"
                    : "bg-white/10 text-white"
                : "text-mist hover:text-white"
            }`}
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {TIER_LABEL[t]}
            {!active && t !== "free" && TIER_RANK[t] > TIER_RANK[profile.tier] && (
              <span className="text-[9px] opacity-70">
                ${t === "plus" ? "9.99" : "19.99"}/mo
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-void/70 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:h-16 sm:py-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-indigo/15 border border-indigo/30">
              <Activity className="h-4 w-4 text-indigo-glow" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold text-base tracking-tight text-white">
              PulseFit <span className="text-indigo-glow">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-1 sm:hidden">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>

        {tierSwitcher}

        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
