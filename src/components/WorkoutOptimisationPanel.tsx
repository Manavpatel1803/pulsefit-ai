"use client";

import { useMemo } from "react";
import { AlertTriangle, Wrench } from "lucide-react";
import { useApp } from "@/context/AppContext";
import TierGate from "@/components/TierGate";
import { computeWorkoutOptimisation } from "@/lib/workoutOptimisation";

/** Pro: "Advanced workout optimisation" / "Continuous fitness-plan optimisation" / "Advanced weekly optimisation". */
export default function WorkoutOptimisationPanel() {
  const { profile, workoutLogs } = useApp();
  const optimisation = useMemo(() => computeWorkoutOptimisation(workoutLogs), [workoutLogs]);

  return (
    <TierGate requiredTier="pro" currentTier={profile?.tier ?? "free"} featureName="advanced workout optimisation">
      <div className="glass-raised p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-amber" />
          <h3 className="text-sm font-medium text-white">Program optimisation</h3>
        </div>
        <p className="text-sm text-slate-200">{optimisation.headline}</p>
        {optimisation.exercises.length > 0 && (
          <div className="space-y-2 pt-1">
            {optimisation.exercises.map((e) => (
              <div
                key={e.exerciseName}
                className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                  e.stalled ? "border-amber/40 bg-amber/5" : "border-hairline bg-white/[0.02]"
                }`}
              >
                {e.stalled && <AlertTriangle className="h-3.5 w-3.5 text-amber shrink-0 mt-0.5" />}
                <p className={e.stalled ? "text-slate-200" : "text-mist"}>{e.suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </TierGate>
  );
}
