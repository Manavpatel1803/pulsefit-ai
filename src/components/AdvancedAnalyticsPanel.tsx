"use client";

import { useMemo } from "react";
import { Minus, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { computeProgressAnalysis } from "@/lib/progressAnalysis";
import { computeGoalPrediction } from "@/lib/goalPrediction";
import { safeWeeklyRateKg, weeksToGoal } from "@/lib/calculations";
import type { TrendDirection } from "@/lib/types";

const LONG_TERM_WEEKS = 26;

const TREND_ICON: Record<TrendDirection, React.ReactNode> = {
  up: <TrendingUp className="h-3.5 w-3.5" />,
  down: <TrendingDown className="h-3.5 w-3.5" />,
  flat: <Minus className="h-3.5 w-3.5" />,
};

/** Pro: "Long-term trend analysis" / "Advanced performance analytics" / "Deeper historical analysis" / "Predictive recommendations". */
export default function AdvancedAnalyticsPanel() {
  const { profile, biometricEntries, workoutLogs } = useApp();

  const longTerm = useMemo(
    () => computeProgressAnalysis(biometricEntries, workoutLogs, profile?.goal ?? null, LONG_TERM_WEEKS),
    [biometricEntries, workoutLogs, profile?.goal]
  );

  const currentWeight = profile?.weight_kg ?? null;
  const theoreticalWeeks = useMemo(() => {
    if (!currentWeight || !profile?.target_weight_kg || !profile?.goal) return null;
    return weeksToGoal(currentWeight, profile.target_weight_kg, safeWeeklyRateKg(currentWeight, profile.goal));
  }, [currentWeight, profile]);

  const prediction = useMemo(
    () => computeGoalPrediction(biometricEntries, currentWeight, profile?.target_weight_kg ?? null, theoreticalWeeks),
    [biometricEntries, currentWeight, profile?.target_weight_kg, theoreticalWeeks]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass-raised p-6 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber" />
          <h3 className="text-sm font-medium text-white">{LONG_TERM_WEEKS}-week trend analysis</h3>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{longTerm.headline}</p>
        {longTerm.hasEnoughData && (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass p-3">
              <p className="text-[10px] uppercase tracking-wide text-mist-dim mb-1">Weight</p>
              <p className="flex items-center gap-1.5 text-sm data-readout text-white">
                {TREND_ICON[longTerm.weightTrend8wk]}
                {longTerm.weightChangeKg8wk !== null ? `${longTerm.weightChangeKg8wk > 0 ? "+" : ""}${longTerm.weightChangeKg8wk}kg` : "—"}
              </p>
            </div>
            <div className="glass p-3">
              <p className="text-[10px] uppercase tracking-wide text-mist-dim mb-1">Training volume</p>
              <p className="flex items-center gap-1.5 text-sm data-readout text-white capitalize">
                {TREND_ICON[longTerm.trainingVolumeTrend8wk]}
                {longTerm.trainingVolumeTrend8wk}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="glass-raised p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-amber" />
          <h3 className="text-sm font-medium text-white">Predictive goal completion</h3>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{prediction.insight}</p>
        {prediction.hasEnoughData && prediction.predictedWeeksToGoal !== null && (
          <p className="text-[10px] text-mist-dim">
            Actual pace: {prediction.actualWeeklyRateKg}kg/wk · original plan: {prediction.theoreticalWeeksToGoal ?? "—"} weeks
          </p>
        )}
      </div>
    </div>
  );
}
