"use client";

import { useMemo, useState } from "react";
import { Flame, Scale } from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  ACTIVITY_LABELS,
  bodyMassIndex,
  calculateBMR,
  calculateTDEE,
  calorieTargetForGoal,
  GOAL_LABELS,
} from "@/lib/calculations";
import type { ActivityLevel, Goal, Sex } from "@/lib/types";

export default function FreeCalculators() {
  const { profile } = useApp();
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male");
  const [age, setAge] = useState(profile?.age ?? 28);
  const [heightCm, setHeightCm] = useState(profile?.height_cm ?? 175);
  const [weightKg, setWeightKg] = useState(profile?.weight_kg ?? 72);
  const [activity, setActivity] = useState<ActivityLevel>(profile?.activity_level ?? "moderate");
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "maintain");

  const bmr = useMemo(() => calculateBMR(sex, weightKg, heightCm, age), [sex, weightKg, heightCm, age]);
  const tdee = useMemo(() => calculateTDEE(bmr, activity), [bmr, activity]);
  const target = useMemo(() => calorieTargetForGoal(tdee, goal), [tdee, goal]);
  const bmi = useMemo(() => bodyMassIndex(weightKg, heightCm), [weightKg, heightCm]);

  return (
    <section className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 glass-raised p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold text-white">Your inputs</h2>

        <div className="grid grid-cols-2 gap-4">
          <SliderField label="Age" value={age} min={13} max={90} onChange={setAge} unit="yrs" />
          <SliderField label="Weight" value={weightKg} min={35} max={180} onChange={setWeightKg} unit="kg" />
          <SliderField label="Height" value={heightCm} min={130} max={220} onChange={setHeightCm} unit="cm" />
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-mist">Sex</span>
            <div className="flex gap-2">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    sex === s
                      ? "bg-indigo/20 border-indigo-glow/50 text-indigo-glow"
                      : "bg-white/5 border-hairline text-mist"
                  }`}
                >
                  {s === "male" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-mist">Activity level</span>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50"
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <option key={a} value={a} className="bg-surface">
                {ACTIVITY_LABELS[a]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-mist">Goal</span>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as Goal)}
            className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50"
          >
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
              <option key={g} value={g} className="bg-surface">
                {GOAL_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <StatCard icon={<Flame className="h-4 w-4 text-amber" />} label="BMR" value={bmr} unit="kcal/day" hint="Energy at complete rest" />
        <StatCard icon={<Flame className="h-4 w-4 text-indigo-glow" />} label="TDEE" value={tdee} unit="kcal/day" hint="Total daily burn" />
        <StatCard icon={<Flame className="h-4 w-4 text-emerald" />} label="Calorie target" value={target} unit="kcal/day" hint={GOAL_LABELS[goal]} highlight />
        <StatCard icon={<Scale className="h-4 w-4 text-mist" />} label="BMI" value={bmi} unit="" hint="Body mass index" />
      </div>
    </section>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-mist">{label}</span>
        <span className="text-sm data-readout text-white">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo"
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  hint,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-5 ${highlight ? "glass-plus glass" : "glass"}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-mist uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold text-white data-readout">{value}</span>
        {unit && <span className="text-xs text-mist">{unit}</span>}
      </div>
      <p className="text-xs text-mist-dim mt-1">{hint}</p>
    </div>
  );
}
