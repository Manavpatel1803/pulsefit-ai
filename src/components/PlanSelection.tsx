"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/ThemeToggle";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { BillingError, startCheckout } from "@/lib/billing";
import type { Tier } from "@/lib/types";

interface PlanFeature {
  label: string;
  free: boolean;
  plus: boolean;
  pro: boolean;
}

const FEATURES: PlanFeature[] = [
  { label: "Data-driven Today dashboard", free: true, plus: true, pro: true },
  { label: "Workout library & streak tracker", free: true, plus: true, pro: true },
  { label: "Community feed & challenges", free: true, plus: true, pro: true },
  { label: "AI-explained daily priority", free: false, plus: true, pro: true },
  { label: "AI-generated workout & diet plans", free: false, plus: true, pro: true },
  { label: "AuraCoach real-time coaching", free: false, plus: true, pro: true },
  { label: "Full biometric dashboard", free: false, plus: false, pro: true },
  { label: "Recovery intelligence (HRV/RHR)", free: false, plus: false, pro: true },
  { label: "Predictive goal completion", free: false, plus: false, pro: true },
  { label: "Multiple training programs", free: false, plus: false, pro: true },
];

const PLANS: {
  tier: Tier;
  name: string;
  price: string;
  tagline: string;
  featured?: boolean;
}[] = [
  { tier: "free", name: "Free", price: "$0", tagline: "Track your training, for free, forever." },
  { tier: "plus", name: "Plus", price: "$9.99/mo", tagline: "AI-explained coaching on top of your data.", featured: true },
  { tier: "pro", name: "Pro", price: "$19.99/mo", tagline: "Full biometric intelligence and prediction." },
];

export default function PlanSelection() {
  const { profile, session, updateProfile } = useApp();
  const toast = useToast();
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);

  async function choose(tier: Tier) {
    if (pendingTier) return;
    setPendingTier(tier);
    try {
      if (tier === "free") {
        await updateProfile({ plan_selected: true });
        return;
      }
      // Plus/Pro: mark the plan screen done up front so a cancelled or abandoned
      // checkout doesn't trap the user back on this screen — they land on the Free
      // dashboard and can upgrade any time via the tier switcher in the header.
      await updateProfile({ plan_selected: true });
      if (!session) throw new BillingError("Sign in again to continue.");
      await startCheckout(tier, session.access_token);
    } catch (err) {
      toast.error("Couldn't start checkout", err instanceof BillingError ? err.message : undefined);
      setPendingTier(null);
    }
  }

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <div className="absolute top-0 right-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-10"
      >
        <p className="text-xs font-medium text-indigo-glow mb-2 uppercase tracking-wide">You&apos;re all set</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-3">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-mist max-w-md mx-auto">
          Pick the plan that fits how you want to train. You can change this any time from the header.
        </p>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-3">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.tier}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card
              className={`glass-raised ring-0 border-0 p-0 h-full flex flex-col ${
                plan.featured ? "glass-plus" : ""
              }`}
            >
              <CardHeader className="p-6 pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display text-lg font-semibold text-white">{plan.name}</h2>
                  {plan.featured && (
                    <Badge className="bg-indigo text-[#fff]">Most popular</Badge>
                  )}
                </div>
                <p className="text-2xl font-semibold text-white data-readout">{plan.price}</p>
                <p className="text-xs text-mist mt-1">{plan.tagline}</p>
              </CardHeader>

              <CardContent className="p-6 pt-5 flex-1 flex flex-col">
                <ul className="space-y-2.5 flex-1">
                  {FEATURES.map((f) => {
                    const included = f[plan.tier];
                    return (
                      <li key={f.label} className="flex items-start gap-2 text-sm">
                        {included ? (
                          <Check className="h-4 w-4 text-emerald shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 text-mist-dim shrink-0 mt-0.5" />
                        )}
                        <span className={included ? "text-slate-200" : "text-mist-dim"}>{f.label}</span>
                      </li>
                    );
                  })}
                </ul>

                <button
                  onClick={() => choose(plan.tier)}
                  disabled={pendingTier !== null}
                  className={`mt-6 flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium px-4 py-2.5 active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-all ${
                    plan.tier === "pro"
                      ? "bg-amber hover:bg-amber/90 text-ink font-semibold"
                      : plan.tier === "plus"
                        ? "bg-indigo hover:bg-indigo/90 text-[#fff]"
                        : "bg-white/5 border border-hairline hover:border-white/20 text-white"
                  }`}
                >
                  {pendingTier === plan.tier && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {plan.tier === "free" ? "Start on Free" : `Choose ${plan.name}`}
                </button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
