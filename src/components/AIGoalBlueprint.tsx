"use client";

import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/context/AppContext";
import {
  calculateBMR,
  calculateMacros,
  calculateTDEE,
  calorieTargetForGoal,
  safeWeeklyRateKg,
  weeksToGoal,
} from "@/lib/calculations";
import WeeklyReviewCard from "./WeeklyReview";
import ProgressAnalysisPanel from "./ProgressAnalysisPanel";
import ProgramsPanel from "./ProgramsPanel";

export default function AIGoalBlueprint() {
  const { profile } = useApp();
  const [targetWeight, setTargetWeight] = useState(
    profile?.target_weight_kg ?? profile?.weight_kg ?? 70
  );

  const blueprint = useMemo(() => {
    if (!profile?.sex || !profile.weight_kg || !profile.height_cm || !profile.age || !profile.activity_level || !profile.goal) {
      return null;
    }
    const bmr = calculateBMR(profile.sex, profile.weight_kg, profile.height_cm, profile.age);
    const tdee = calculateTDEE(bmr, profile.activity_level);
    const calorieTarget = calorieTargetForGoal(tdee, profile.goal);
    const macros = calculateMacros(calorieTarget, profile.goal, profile.weight_kg);
    const rate = safeWeeklyRateKg(profile.weight_kg, profile.goal);
    const direction = targetWeight >= profile.weight_kg ? 1 : -1;
    const weeks = Math.min(weeksToGoal(profile.weight_kg, targetWeight, rate), 78);

    const timeline = Array.from({ length: weeks + 1 }, (_, i) => ({
      week: i,
      weight: Math.round((profile.weight_kg! + direction * rate * i) * 10) / 10,
    }));

    return { calorieTarget, macros, rate, weeks, timeline };
  }, [profile, targetWeight]);

  if (!profile?.weight_kg) {
    return <p className="text-sm text-mist">Complete onboarding to generate your blueprint.</p>;
  }

  return (
    <div className="space-y-6">
    <ProgramsPanel />
    <section className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 glass-raised p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-indigo-glow" />
          <h2 className="font-display text-lg font-semibold text-white">Set your target</h2>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-mist">Target weight</span>
            <span className="text-sm data-readout text-white">{targetWeight} kg</span>
          </div>
          <input
            type="range"
            min={Math.max(profile.weight_kg - 30, 35)}
            max={profile.weight_kg + 30}
            step={0.5}
            value={targetWeight}
            onChange={(e) => setTargetWeight(Number(e.target.value))}
            className="w-full accent-indigo"
          />
          <p className="text-xs text-mist-dim">Current: {profile.weight_kg} kg</p>
        </div>

        {blueprint && (
          <div className="space-y-3 pt-2">
            <BlueprintRow label="Weekly rate" value={`${blueprint.rate} kg/wk`} />
            <BlueprintRow label="Time to goal" value={`${blueprint.weeks} weeks`} />
            <BlueprintRow label="Calorie target" value={`${blueprint.calorieTarget} kcal`} />
            <BlueprintRow
              label="Macros"
              value={`${blueprint.macros.proteinG}P / ${blueprint.macros.carbsG}C / ${blueprint.macros.fatG}F`}
            />
          </div>
        )}
      </div>

      <div className="lg:col-span-3 glass p-6">
        <h3 className="text-sm font-medium text-white mb-4">Projected timeline</h3>
        {blueprint && blueprint.timeline.length > 1 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={blueprint.timeline} margin={{ left: -20, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="blueprintFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="week"
                tickFormatter={(w) => `Wk ${w}`}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["dataMin - 2", "dataMax + 2"]}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "#101526",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(w) => `Week ${w}`}
                formatter={(v) => [`${v} kg`, "Projected weight"]}
              />
              <Area type="monotone" dataKey="weight" stroke="#818cf8" strokeWidth={2} fill="url(#blueprintFill)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-mist py-16 text-center">
            You&apos;re already at your target weight.
          </p>
        )}
      </div>
    </section>
    <ProgressAnalysisPanel />
    <WeeklyReviewCard />
    </div>
  );
}

function BlueprintRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-2 border-b border-hairline last:border-0">
      <span className="text-mist">{label}</span>
      <span className="text-white data-readout">{value}</span>
    </div>
  );
}
