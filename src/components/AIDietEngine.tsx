"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, Loader2, Sparkles, UtensilsCrossed } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import TierGate from "@/components/TierGate";
import { AIGenerationError, generateDietPlan } from "@/lib/aiGenerators";
import { calculateBMR, calculateMacros, calculateTDEE, calorieTargetForGoal } from "@/lib/calculations";
import { computeNutritionIntelligence } from "@/lib/nutritionIntelligence";
import type { DietPlan } from "@/lib/types";

export default function AIDietEngine() {
  const { profile, session, nutritionLogs, biometricEntries } = useApp();
  const toast = useToast();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = useMemo(() => {
    if (!profile?.sex || !profile.weight_kg || !profile.height_cm || !profile.age || !profile.activity_level || !profile.goal) {
      return null;
    }
    const bmr = calculateBMR(profile.sex, profile.weight_kg, profile.height_cm, profile.age);
    const tdee = calculateTDEE(bmr, profile.activity_level);
    const calorieTarget = calorieTargetForGoal(tdee, profile.goal);
    const macros = calculateMacros(calorieTarget, profile.goal, profile.weight_kg);
    return { calorieTarget, macros };
  }, [profile]);

  const nutritionIntel = useMemo(
    () => computeNutritionIntelligence(nutritionLogs, biometricEntries, profile?.goal ?? null, targets?.calorieTarget ?? null),
    [nutritionLogs, biometricEntries, profile?.goal, targets?.calorieTarget]
  );

  async function handleGenerate() {
    if (!profile || !targets || !session) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateDietPlan(
        { goal: profile.goal, activity_level: profile.activity_level, equipment: profile.equipment },
        targets.calorieTarget,
        targets.macros,
        session.access_token
      );
      setPlan(result);
      toast.success("Meal plan generated", `${result.meals.length} meals mapped to your macros.`);
    } catch (err) {
      setError(err instanceof AIGenerationError ? err.message : "Could not generate a meal plan. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!targets) {
    return <p className="text-sm text-mist">Complete onboarding to generate meal plans.</p>;
  }

  const totalMacroCals = targets.macros.proteinG * 4 + targets.macros.carbsG * 4 + targets.macros.fatG * 9;

  return (
    <section className="space-y-5">
      <div className="glass-raised p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 flex gap-4">
          <MacroBar label="Protein" grams={targets.macros.proteinG} pct={((targets.macros.proteinG * 4) / totalMacroCals) * 100} color="var(--emerald)" />
          <MacroBar label="Carbs" grams={targets.macros.carbsG} pct={((targets.macros.carbsG * 4) / totalMacroCals) * 100} color="var(--indigo-glow)" />
          <MacroBar label="Fat" grams={targets.macros.fatG} pct={((targets.macros.fatG * 9) / totalMacroCals) * 100} color="var(--amber)" />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo hover:bg-indigo/90 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 transition-colors shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate meal plan
        </button>
      </div>

      <TierGate requiredTier="pro" currentTier={profile?.tier ?? "free"} featureName="advanced nutrition intelligence">
        <div className="glass p-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-medium text-white">Advanced nutrition intelligence</h3>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{nutritionIntel.insight}</p>
          {nutritionIntel.hasEnoughData && (
            <p className="text-[10px] text-mist-dim">
              Adherence to current target: {nutritionIntel.adherencePct}% · implied maintenance: {nutritionIntel.impliedTdee} kcal/day
            </p>
          )}
        </div>
      </TierGate>

      {error && (
        <div className="glass p-4 flex items-center gap-2.5 text-sm text-amber">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {plan && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {plan.meals.map((meal) => (
              <div key={meal.name} className="glass p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-emerald" />
                    <p className="text-sm font-medium text-white">{meal.name}</p>
                  </div>
                  <span className="text-xs data-readout text-mist">{meal.calories} kcal</span>
                </div>
                <p className="text-xs text-mist-dim leading-relaxed">{meal.description}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-mist-dim italic">{plan.notes}</p>
        </div>
      )}

      {!plan && !loading && !error && (
        <p className="text-sm text-mist text-center py-10">
          Your macro targets are set from your goal. Generate a sample day to see it in food.
        </p>
      )}
    </section>
  );
}

function MacroBar({ label, grams, pct, color }: { label: string; grams: number; pct: number; color: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-mist">{label}</span>
        <span className="text-xs data-readout text-white">{grams}g</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
