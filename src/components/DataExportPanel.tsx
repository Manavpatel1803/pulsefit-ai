"use client";

import { Download } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { downloadCsv, toCsv } from "@/lib/exportData";

/** Pro: "Advanced reports" / "Advanced exports". */
export default function DataExportPanel() {
  const { workoutLogs, nutritionLogs, biometricEntries } = useApp();

  function exportWorkouts() {
    const csv = toCsv(workoutLogs, ["log_date", "exercise_name", "sets", "reps", "weight_kg", "rpe", "notes"]);
    downloadCsv("pulsefit-workout-logs.csv", csv);
  }

  function exportNutrition() {
    const csv = toCsv(nutritionLogs, ["log_date", "calories", "protein_g", "carbs_g", "fat_g", "notes"]);
    downloadCsv("pulsefit-nutrition-logs.csv", csv);
  }

  function exportBiometrics() {
    const csv = toCsv(biometricEntries, [
      "entry_date",
      "weight_kg",
      "body_fat_pct",
      "muscle_mass_kg",
      "resting_hr",
      "hrv_ms",
      "sleep_hours",
      "sleep_quality_pct",
      "steps",
      "readiness_score",
    ]);
    downloadCsv("pulsefit-biometric-entries.csv", csv);
  }

  return (
    <div className="glass-raised p-6 space-y-3">
      <h3 className="text-sm font-medium text-white">Export your data</h3>
      <div className="flex flex-wrap gap-2">
        <ExportButton label={`Workouts (${workoutLogs.length})`} onClick={exportWorkouts} disabled={workoutLogs.length === 0} />
        <ExportButton label={`Nutrition (${nutritionLogs.length})`} onClick={exportNutrition} disabled={nutritionLogs.length === 0} />
        <ExportButton label={`Biometrics (${biometricEntries.length})`} onClick={exportBiometrics} disabled={biometricEntries.length === 0} />
      </div>
    </div>
  );
}

function ExportButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-hairline hover:border-amber/40 hover:text-amber disabled:opacity-40 disabled:hover:border-hairline disabled:hover:text-inherit text-xs text-slate-200 px-3.5 py-2 transition-colors"
    >
      <Download className="h-3.5 w-3.5" />
      {label} CSV
    </button>
  );
}
