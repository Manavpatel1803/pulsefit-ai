"use client";

import { useMemo } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { computeProgressAnalysis } from "@/lib/progressAnalysis";
import type { TrendDirection } from "@/lib/types";

const TREND_ICON: Record<TrendDirection, React.ReactNode> = {
  up: <TrendingUp className="h-3.5 w-3.5" />,
  down: <TrendingDown className="h-3.5 w-3.5" />,
  flat: <Minus className="h-3.5 w-3.5" />,
};

/** Plus tier: 8-week trend read + plateau detection ("Progress analysis", "Plateau analysis", "Advanced fitness journey insights"). */
export default function ProgressAnalysisPanel() {
  const { profile, biometricEntries, workoutLogs } = useApp();

  const analysis = useMemo(
    () => computeProgressAnalysis(biometricEntries, workoutLogs, profile?.goal ?? null),
    [biometricEntries, workoutLogs, profile?.goal]
  );

  return (
    <div className={`glass-raised p-6 space-y-4 ${analysis.plateauDetected ? "glass-plus" : ""}`}>
      <div className="flex items-center gap-2">
        {analysis.plateauDetected ? (
          <AlertTriangle className="h-4 w-4 text-amber" />
        ) : (
          <TrendingUp className="h-4 w-4 text-indigo-glow" />
        )}
        <h3 className="text-sm font-medium text-white">8-week progress analysis</h3>
      </div>

      <p className="text-sm text-slate-200 leading-relaxed">{analysis.headline}</p>

      {analysis.hasEnoughData && (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-3">
            <p className="text-[10px] uppercase tracking-wide text-mist-dim mb-1">Weight, 8wk</p>
            <p className="flex items-center gap-1.5 text-sm data-readout text-white">
              {TREND_ICON[analysis.weightTrend8wk]}
              {analysis.weightChangeKg8wk !== null ? `${analysis.weightChangeKg8wk > 0 ? "+" : ""}${analysis.weightChangeKg8wk}kg` : "—"}
            </p>
          </div>
          <div className="glass p-3">
            <p className="text-[10px] uppercase tracking-wide text-mist-dim mb-1">Training volume, 8wk</p>
            <p className="flex items-center gap-1.5 text-sm data-readout text-white capitalize">
              {TREND_ICON[analysis.trainingVolumeTrend8wk]}
              {analysis.trainingVolumeTrend8wk}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
