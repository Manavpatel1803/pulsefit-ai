"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { AIGenerationError, generateWorkoutPlan } from "@/lib/aiGenerators";
import WorkoutOptimisationPanel from "@/components/WorkoutOptimisationPanel";
import type { WorkoutPlan } from "@/lib/types";

const DAY_OPTIONS = [3, 4, 5, 6];

export default function AIWorkoutEngine() {
  const { profile, session } = useApp();
  const toast = useToast();
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!profile || !session) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateWorkoutPlan(
        { goal: profile.goal, experience_level: profile.experience_level, equipment: profile.equipment },
        daysPerWeek,
        session.access_token
      );
      setPlan(result);
      toast.success("Routine generated", `${result.days.length}-day ${result.split} split is ready.`);
    } catch (err) {
      setError(err instanceof AIGenerationError ? err.message : "Could not generate a plan. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <WorkoutOptimisationPanel />

      <div className="glass-raised p-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1 space-y-1.5">
          <span className="text-xs font-medium text-mist">Training days per week</span>
          <div className="flex gap-2">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDaysPerWeek(d)}
                className={`h-9 w-9 rounded-lg text-sm font-medium border transition-colors ${
                  daysPerWeek === d
                    ? "bg-indigo/20 border-indigo-glow/50 text-indigo-glow"
                    : "bg-white/5 border-hairline text-mist hover:text-white"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo hover:bg-indigo/90 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate routine
        </button>
      </div>

      {error && (
        <div className="glass p-4 flex items-center gap-2.5 text-sm text-amber">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-white">{plan.split}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {plan.days.map((day) => (
              <div key={day.day} className="glass p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-indigo-glow">{day.day}</p>
                  <p className="text-sm text-white">{day.focus}</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-mist-dim text-left">
                      <th className="font-normal pb-1.5">Exercise</th>
                      <th className="font-normal pb-1.5 text-right">Sets</th>
                      <th className="font-normal pb-1.5 text-right">Reps</th>
                      <th className="font-normal pb-1.5 text-right">RPE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.exercises.map((ex) => (
                      <tr key={ex.name} className="border-t border-hairline">
                        <td className="py-1.5 text-slate-200">{ex.name}</td>
                        <td className="py-1.5 text-right data-readout text-mist">{ex.sets}</td>
                        <td className="py-1.5 text-right data-readout text-mist">{ex.reps}</td>
                        <td className="py-1.5 text-right data-readout text-mist">{ex.rpe}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <p className="text-xs text-mist-dim italic">{plan.notes}</p>
        </div>
      )}

      {!plan && !loading && !error && (
        <p className="text-sm text-mist text-center py-10">
          Pick a training frequency and generate a routine built around your goal and equipment.
        </p>
      )}
    </section>
  );
}
