"use client";

import { useState } from "react";
import { Loader2, Plus, UtensilsCrossed } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { localDateString } from "@/lib/date";

export default function NutritionLogger() {
  const { nutritionLogs, addNutritionLog, fitnessState } = useApp();
  const toast = useToast();
  const [calories, setCalories] = useState(2200);
  const [protein, setProtein] = useState(150);
  const [carbs, setCarbs] = useState(220);
  const [fat, setFat] = useState(70);
  const [saving, setSaving] = useState(false);

  const today = localDateString();
  const todayLog = nutritionLogs.find((n) => n.log_date === today);
  const target = fitnessState?.nutrition;

  async function handleSave() {
    setSaving(true);
    try {
      await addNutritionLog({ calories, protein_g: protein, carbs_g: carbs, fat_g: fat });
      toast.success("Nutrition logged", `${calories} kcal · ${protein}g protein`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-4 w-4 text-emerald" />
        <h3 className="text-sm font-medium text-white">Today&apos;s nutrition</h3>
      </div>

      {todayLog ? (
        <div className="flex items-baseline gap-4 text-sm">
          <span className="data-readout text-white">{todayLog.calories} kcal</span>
          <span className="text-mist">{todayLog.protein_g}g protein</span>
          {target?.calorieTarget && (
            <span className="text-xs text-mist-dim">target {target.calorieTarget} kcal</span>
          )}
        </div>
      ) : (
        <p className="text-xs text-mist-dim">Not logged yet today.</p>
      )}

      <div className="grid grid-cols-4 gap-2">
        <NumField label="Kcal" value={calories} onChange={setCalories} step={50} />
        <NumField label="Protein" value={protein} onChange={setProtein} step={5} />
        <NumField label="Carbs" value={carbs} onChange={setCarbs} step={5} />
        <NumField label="Fat" value={fat} onChange={setFat} step={5} />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-lg bg-emerald hover:bg-emerald/90 disabled:opacity-60 text-void text-sm font-semibold px-4 py-2 transition-colors"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Log today
      </button>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-mist uppercase tracking-wide">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg bg-white/5 border border-hairline px-2 py-1.5 text-sm text-white outline-none focus:border-indigo-glow/50"
      />
    </div>
  );
}
