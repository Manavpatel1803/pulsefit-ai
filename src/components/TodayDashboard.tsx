"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Droplet, Flame, Footprints, Loader2, Moon, Sparkles, TrendingDown, TrendingUp, Zap } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useApp } from "@/context/AppContext";
import { fetchAIDecision, pickPriority } from "@/lib/decisionEngine";
import { canAccess } from "@/lib/featureAccess";
import { countUp, EASE } from "@/lib/motion";
import type { FitnessDecision } from "@/lib/types";
import NutritionLogger from "./NutritionLogger";
import ProgressTracker from "./ProgressTracker";

const STATUS_STYLE: Record<string, string> = {
  green: "text-emerald border-emerald/40 bg-emerald/10",
  yellow: "text-amber border-amber/40 bg-amber/10",
  red: "text-red-400 border-red-400/40 bg-red-400/10",
};

const STATUS_LABEL: Record<string, string> = { green: "Good", yellow: "Reduced", red: "Rest" };

export default function TodayDashboard() {
  const { profile, session, fitnessState, latestBiometric } = useApp();
  const [aiDecision, setAiDecision] = useState<FitnessDecision | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const deterministic = useMemo(() => (fitnessState ? pickPriority(fitnessState) : null), [fitnessState]);
  const canUseAiDecision = profile ? canAccess(profile.tier, "context_aware_coach") : false;
  const statGridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!fitnessState) return;
      gsap.from("[data-gsap='stat-tile']", {
        opacity: 0,
        y: 14,
        scale: 0.96,
        duration: 0.4,
        ease: EASE.standard,
        stagger: 0.07,
      });
    },
    { scope: statGridRef, dependencies: [fitnessState?.recovery.status, fitnessState?.training.consistencyPct] }
  );

  useEffect(() => {
    if (!fitnessState || !deterministic || !session || !canUseAiDecision) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setAiLoading(true);
      const result = await fetchAIDecision(fitnessState, deterministic, profile?.goal ?? null, session.access_token);
      if (!cancelled) {
        setAiDecision(result);
        setAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitnessState?.recovery.status, fitnessState?.training.sessionsLast7d, session, canUseAiDecision]);

  if (!profile || !fitnessState || !deterministic) {
    return <p className="text-sm text-mist">Complete onboarding to see your daily plan.</p>;
  }

  const priorityText = aiDecision?.recommendation ?? deterministic.priority;
  const actions = aiDecision?.actions ?? deterministic.actions;

  return (
    <section className="space-y-6">
      <div className="glass-plus glass p-6">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-wide text-indigo-glow font-medium">Today&apos;s priority</p>
          {aiLoading && <Loader2 className="h-3 w-3 animate-spin text-mist" />}
        </div>
        <p className="text-lg font-medium text-white leading-snug">{priorityText}</p>
        {aiDecision?.reason && (
          <p className="text-xs text-mist mt-2 flex items-start gap-1.5">
            <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-indigo-glow" />
            {aiDecision.reason}
          </p>
        )}
        {actions.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {actions.map((a) => (
              <li key={a} className="text-xs text-slate-200 bg-white/5 border border-hairline rounded-full px-3 py-1">
                {a}
              </li>
            ))}
          </ul>
        )}
        {!canUseAiDecision && (
          <p className="text-[10px] text-mist-dim mt-3">Upgrade to Plus for an AI-explained daily priority.</p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-white mb-3">Current state</h3>
        <div ref={statGridRef} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            data-gsap="stat-tile"
            className={`rounded-xl border p-4 ${STATUS_STYLE[fitnessState.recovery.status]}`}
          >
            <p className="text-[10px] uppercase tracking-wide opacity-80 mb-1">Recovery</p>
            <p className="text-lg font-semibold">{STATUS_LABEL[fitnessState.recovery.status]}</p>
          </div>
          <StatTile
            icon={<Moon className="h-4 w-4 text-indigo-glow" />}
            label="Sleep"
            value={fitnessState.recovery.sleepAvgHours ? `${fitnessState.recovery.sleepAvgHours}h` : "—"}
            numericTarget={fitnessState.recovery.sleepAvgHours}
            decimals={1}
            suffix="h"
            trend={fitnessState.recovery.sleepTrend}
          />
          <StatTile
            icon={<Flame className="h-4 w-4 text-amber" />}
            label="Training"
            value={`${fitnessState.training.consistencyPct}%`}
            numericTarget={fitnessState.training.consistencyPct}
            suffix="%"
            trend={fitnessState.training.volumeTrend}
          />
          <StatTile
            icon={fitnessState.weight.trend === "down" ? (
              <TrendingDown className="h-4 w-4 text-emerald" />
            ) : (
              <TrendingUp className="h-4 w-4 text-mist" />
            )}
            label="Weight"
            value={fitnessState.weight.current ? `${fitnessState.weight.current}kg` : "—"}
            numericTarget={fitnessState.weight.current}
            decimals={1}
            suffix="kg"
            trend={fitnessState.weight.trend}
          />
        </div>
      </div>

      <ProgressTracker />

      <div>
        <h3 className="text-sm font-medium text-white mb-3">Today</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="glass p-4 flex items-center gap-3">
            <Flame className="h-4 w-4 text-amber shrink-0" />
            <div>
              <p className="text-xs text-mist">Calorie target</p>
              <p className="text-sm data-readout text-white">
                {fitnessState.nutrition.calorieTarget ?? "—"} kcal · {fitnessState.nutrition.proteinTargetG ?? "—"}g protein
              </p>
            </div>
          </div>
          <div className="glass p-4 flex items-center gap-3">
            <Footprints className="h-4 w-4 text-indigo-glow shrink-0" />
            <div>
              <p className="text-xs text-mist">Steps today</p>
              <p className="text-sm data-readout text-white">{latestBiometric?.steps ?? "—"}</p>
            </div>
          </div>
          <div className="glass p-4 flex items-center gap-3">
            <Droplet className="h-4 w-4 text-indigo-glow shrink-0" />
            <div>
              <p className="text-xs text-mist">Hydration</p>
              <p className="text-sm text-white">Aim for ~35ml per kg bodyweight</p>
            </div>
          </div>
          <div className="glass p-4 flex items-center gap-3">
            <Zap className="h-4 w-4 text-emerald shrink-0" />
            <div>
              <p className="text-xs text-mist">Recovery action</p>
              <p className="text-sm text-white">
                {fitnessState.recovery.status === "red"
                  ? "Rest or light mobility work"
                  : fitnessState.recovery.status === "yellow"
                    ? "Train, but ease off intensity"
                    : "No restrictions — train as planned"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <NutritionLogger />
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
  trend,
  numericTarget,
  decimals = 0,
  suffix = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: "up" | "down" | "flat";
  numericTarget?: number | null;
  decimals?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (numericTarget == null) return;
    const tween = countUp(numericTarget, (v) => setDisplay(v.toFixed(decimals)), { decimals });
    return () => {
      tween.kill();
    };
  }, [numericTarget, decimals]);

  return (
    <div data-gsap="stat-tile" className="glass p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide text-mist">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white data-readout">
        {numericTarget != null ? `${display}${suffix}` : value}{" "}
        <span className="text-xs text-mist-dim font-sans">{trend !== "flat" && (trend === "up" ? "↑" : "↓")}</span>
      </p>
    </div>
  );
}
