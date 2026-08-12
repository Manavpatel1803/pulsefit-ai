"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { TIER_RANK, type Tier } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { BillingError, startCheckout } from "@/lib/billing";

const TIER_LABEL: Record<Tier, string> = { free: "Free", plus: "Plus", pro: "Pro" };

const TIER_PRICE: Record<Tier, string> = { free: "", plus: "$9.99/mo", pro: "$19.99/mo" };

const TIER_ACCENT: Record<Tier, string> = {
  free: "text-mist",
  plus: "text-indigo-glow",
  pro: "text-amber",
};

interface TierGateProps {
  requiredTier: Tier;
  currentTier: Tier;
  featureName: string;
  children: React.ReactNode;
}

/** Shows the real feature blurred behind a lock instead of hiding it outright. */
export default function TierGate({ requiredTier, currentTier, featureName, children }: TierGateProps) {
  const { session } = useApp();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const unlocked = TIER_RANK[currentTier] >= TIER_RANK[requiredTier];

  if (unlocked) return <>{children}</>;

  async function handleUpgrade() {
    if (!session || requiredTier === "free") return;
    setLoading(true);
    try {
      await startCheckout(requiredTier, session.access_token);
    } catch (err) {
      toast.error("Checkout failed", err instanceof BillingError ? err.message : undefined);
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[6px] opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="glass-raised flex flex-col items-center gap-3 px-6 py-5 text-center max-w-xs">
          <Lock className={`h-5 w-5 ${TIER_ACCENT[requiredTier]}`} />
          <p className="text-sm text-slate-200">
            <span className={`font-semibold ${TIER_ACCENT[requiredTier]}`}>
              {TIER_LABEL[requiredTier]}
            </span>{" "}
            unlocks {featureName}
          </p>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className={`flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full border transition-colors disabled:opacity-60 ${
              requiredTier === "pro"
                ? "border-amber/40 text-amber hover:bg-amber/10"
                : "border-indigo-glow/40 text-indigo-glow hover:bg-indigo/10"
            }`}
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            Upgrade to {TIER_LABEL[requiredTier]} · {TIER_PRICE[requiredTier]}
          </button>
        </div>
      </div>
    </div>
  );
}
