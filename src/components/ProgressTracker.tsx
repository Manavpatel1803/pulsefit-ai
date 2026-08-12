"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2, Pencil, Plus, Target, TrendingUp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { GOAL_LABELS } from "@/lib/calculations";
import type { Goal } from "@/lib/types";

/** Free-tier "Fitness goals" + "Weight tracking" + "Basic progress charts". */
export default function ProgressTracker() {
  const { profile, biometricEntries, logBodyComposition, updateProfile } = useApp();
  const toast = useToast();

  const [editingGoal, setEditingGoal] = useState(false);
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "maintain");
  const [targetWeight, setTargetWeight] = useState(profile?.target_weight_kg ?? profile?.weight_kg ?? 70);
  const [savingGoal, setSavingGoal] = useState(false);

  const [weight, setWeight] = useState(profile?.weight_kg ?? 70);
  const [savingWeight, setSavingWeight] = useState(false);

  if (!profile) return null;

  const chartData = biometricEntries
    .filter((e) => e.weight_kg != null)
    .map((e) => ({ date: e.entry_date.slice(5), weight: e.weight_kg }));

  async function handleSaveGoal() {
    setSavingGoal(true);
    try {
      await updateProfile({ goal, target_weight_kg: targetWeight });
      toast.success("Goal updated");
      setEditingGoal(false);
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleLogWeight() {
    setSavingWeight(true);
    try {
      await logBodyComposition({ weight_kg: weight, body_fat_pct: null, muscle_mass_kg: null });
      toast.success("Weight logged", `${weight}kg`);
    } finally {
      setSavingWeight(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="glass p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-glow" />
            <h3 className="text-sm font-medium text-white">Your goal</h3>
          </div>
          <button
            onClick={() => setEditingGoal((v) => !v)}
            aria-label="Edit goal"
            className="text-mist hover:text-white active:scale-90 transition-transform"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        {!editingGoal ? (
          <div>
            <p className="text-lg font-medium text-white">{GOAL_LABELS[goal]}</p>
            <p className="text-xs text-mist mt-1">
              {targetWeight ? `Target: ${targetWeight}kg` : "No target weight set"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
            <div className="space-y-1">
              <span className="text-[10px] text-mist uppercase tracking-wide">Target weight (kg)</span>
              <input
                type="number"
                step={0.5}
                value={targetWeight}
                onChange={(e) => setTargetWeight(Number(e.target.value))}
                className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50"
              />
            </div>
            <button
              onClick={handleSaveGoal}
              disabled={savingGoal}
              className="flex items-center gap-1.5 rounded-lg bg-indigo hover:bg-indigo/90 disabled:opacity-60 text-white text-xs font-medium px-4 py-2 transition-colors"
            >
              {savingGoal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save goal
            </button>
          </div>
        )}
      </div>

      <div className="glass p-5 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald" />
          <h3 className="text-sm font-medium text-white">Weight trend</h3>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={32} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#101526", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="weight" stroke="#818cf8" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-xs text-mist-dim">No weight logged yet</div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="number"
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="flex-1 rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50"
          />
          <button
            onClick={handleLogWeight}
            disabled={savingWeight}
            className="flex items-center gap-1.5 rounded-lg bg-emerald hover:bg-emerald/90 disabled:opacity-60 text-void text-sm font-semibold px-4 py-2 transition-colors shrink-0"
          >
            {savingWeight ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Log
          </button>
        </div>
      </div>
    </div>
  );
}
