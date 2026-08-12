"use client";

import { useMemo, useState } from "react";
import { Gauge, ShieldAlert } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { adjustLoadForReadiness, getRegression } from "@/lib/auraCoachEngine";
import { EXERCISE_LIBRARY } from "@/lib/exerciseData";
import type { InjuryFlag } from "@/lib/types";

const TIER_STYLE: Record<string, string> = {
  green: "text-emerald border-emerald/40 bg-emerald/10",
  yellow: "text-amber border-amber/40 bg-amber/10",
  red: "text-red-400 border-red-400/40 bg-red-400/10",
};

const INJURY_OPTIONS: { value: InjuryFlag; label: string }[] = [
  { value: "knee", label: "Knee" },
  { value: "shoulder", label: "Shoulder" },
  { value: "lower_back", label: "Lower back" },
  { value: "wrist", label: "Wrist" },
];

export default function AuraCoachAgent() {
  const { profile, latestBiometric } = useApp();
  const [plannedRpe, setPlannedRpe] = useState(8);
  const [exerciseId, setExerciseId] = useState(EXERCISE_LIBRARY[0].id);
  const [injury, setInjury] = useState<InjuryFlag>(profile?.injury_flags?.[0] ?? "knee");

  const readiness = latestBiometric?.readiness_score ?? 70;
  const adjustment = useMemo(() => adjustLoadForReadiness(readiness, plannedRpe), [readiness, plannedRpe]);
  const exercise = EXERCISE_LIBRARY.find((e) => e.id === exerciseId)!;
  const regression = useMemo(() => getRegression(exercise.name, injury), [exercise, injury]);

  return (
    <section className="space-y-6">
      <div className="glass-pro glass p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-amber" />
          <h2 className="font-display text-lg font-semibold text-white">RPE load auto-adjuster</h2>
        </div>
        <p className="text-xs text-mist">
          Today&apos;s readiness score: <span className="data-readout text-white">{readiness}</span> / 100
          {!latestBiometric && " (sync your wearable on the Sleep & Recovery tab for live data)"}
        </p>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-mist">
            <span>Planned RPE for today&apos;s session</span>
            <span className="data-readout text-white">{plannedRpe}</span>
          </div>
          <input
            type="range"
            min={5}
            max={10}
            step={0.5}
            value={plannedRpe}
            onChange={(e) => setPlannedRpe(Number(e.target.value))}
            className="w-full accent-amber"
          />
        </div>

        <div className={`rounded-lg border p-4 ${TIER_STYLE[adjustment.tier]}`}>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs uppercase tracking-wide font-medium opacity-80">Adjusted target</span>
            <span className="text-lg font-semibold data-readout">
              RPE {adjustment.adjustedRpe} ({adjustment.loadChangePct > 0 ? "+" : ""}
              {adjustment.loadChangePct}% load)
            </span>
          </div>
          <p className="text-sm opacity-90">{adjustment.recommendation}</p>
        </div>
      </div>

      <div className="glass p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-indigo-glow" />
          <h3 className="font-display text-base font-semibold text-white">Injury regressions</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            className="rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50"
          >
            {EXERCISE_LIBRARY.map((ex) => (
              <option key={ex.id} value={ex.id} className="bg-surface">
                {ex.name}
              </option>
            ))}
          </select>
          <select
            value={injury}
            onChange={(e) => setInjury(e.target.value as InjuryFlag)}
            className="rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50"
          >
            {INJURY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-surface">
                {opt.label} sensitive
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-lg bg-white/5 border border-hairline p-4 text-sm">
          {regression ? (
            <p className="text-slate-200">
              Swap to: <span className="text-emerald font-medium">{regression}</span>
            </p>
          ) : (
            <p className="text-mist">No specific regression needed — this exercise doesn&apos;t typically stress the {injury.replace("_", " ")}.</p>
          )}
        </div>
        {profile?.injury_flags && profile.injury_flags.length > 0 && (
          <p className="text-[10px] text-mist-dim">
            From your profile: {profile.injury_flags.map((f) => f.replace("_", " ")).join(", ")}
          </p>
        )}
      </div>
    </section>
  );
}
