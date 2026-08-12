"use client";

import { useMemo, useState } from "react";
import { Flame, Loader2, Plus, TrendingUp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import TierGate from "@/components/TierGate";
import { EXERCISE_LIBRARY } from "@/lib/exerciseData";
import { localDateString } from "@/lib/date";
import { suggestNextProgression } from "@/lib/workoutProgression";

const WEEKS_SHOWN = 14;

export default function GymStreakTracker() {
  const { profile, workoutLogs, addWorkoutLog } = useApp();
  const toast = useToast();
  const [exercise, setExercise] = useState(EXERCISE_LIBRARY[0].name);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(20);
  const [rpe, setRpe] = useState(7);
  const [saving, setSaving] = useState(false);

  const loggedDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of workoutLogs) {
      map.set(log.log_date, (map.get(log.log_date) ?? 0) + 1);
    }
    return map;
  }, [workoutLogs]);

  const { grid, currentStreak, longestStreak } = useMemo(() => buildHeatmap(loggedDates), [loggedDates]);
  const progression = useMemo(() => suggestNextProgression(workoutLogs, exercise), [workoutLogs, exercise]);

  async function handleLog() {
    setSaving(true);
    try {
      await addWorkoutLog({
        exercise_name: exercise,
        sets,
        reps,
        weight_kg: weight,
        rpe,
        notes: null,
      });
      toast.success("Set logged", `${exercise} — ${sets}×${reps} @ ${weight}kg`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={<Flame className="h-4 w-4 text-amber" />} label="Current streak" value={`${currentStreak}d`} />
        <StatTile icon={<Flame className="h-4 w-4 text-indigo-glow" />} label="Longest streak" value={`${longestStreak}d`} />
        <StatTile icon={<Flame className="h-4 w-4 text-emerald" />} label="Total sessions" value={String(workoutLogs.length)} />
      </div>

      <div className="glass p-6">
        <h3 className="text-sm font-medium text-white mb-4">Last {WEEKS_SHOWN} weeks</h3>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} logged set${day.count === 1 ? "" : "s"}`}
                  className="h-3.5 w-3.5 rounded-sm"
                  style={{ background: intensityColor(day.count) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {profile && (
        <TierGate requiredTier="plus" currentTier={profile.tier} featureName="workout progression recommendations">
          <div className="glass p-5 space-y-1.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-glow" />
              <h3 className="text-sm font-medium text-white">Progression suggestion — {exercise}</h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {progression ? progression.suggestion : `No logged history for ${exercise} yet — log a set to get a suggestion next time.`}
            </p>
          </div>
        </TierGate>
      )}

      <div className="glass-raised p-6 space-y-4">
        <h3 className="text-sm font-medium text-white">Log a set</h3>
        <div className="grid gap-3 sm:grid-cols-5">
          <select
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            className="sm:col-span-2 rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50"
          >
            {EXERCISE_LIBRARY.map((ex) => (
              <option key={ex.id} value={ex.name} className="bg-surface">
                {ex.name}
              </option>
            ))}
          </select>
          <NumberInput label="Sets" value={sets} onChange={setSets} />
          <NumberInput label="Reps" value={reps} onChange={setReps} />
          <NumberInput label="Weight (kg)" value={weight} onChange={setWeight} step={2.5} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs text-mist">
              <span>RPE</span>
              <span className="data-readout text-white">{rpe}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="w-full accent-indigo"
            />
          </div>
          <button
            onClick={handleLog}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-emerald hover:bg-emerald/90 disabled:opacity-60 text-void text-sm font-semibold px-4 py-2 transition-colors shrink-0"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Log
          </button>
        </div>
      </div>
    </section>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-mist">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50"
      />
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-mist uppercase tracking-wide">{label}</span>
      </div>
      <span className="font-display text-2xl font-semibold text-white data-readout">{value}</span>
    </div>
  );
}

function intensityColor(count: number): string {
  if (count === 0) return "rgba(255,255,255,0.06)";
  if (count === 1) return "rgba(16,185,129,0.35)";
  if (count === 2) return "rgba(16,185,129,0.6)";
  return "rgba(16,185,129,0.9)";
}

function buildHeatmap(loggedDates: Map<string, number>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = WEEKS_SHOWN * 7;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  // Align start to a Sunday for clean weekly columns
  start.setDate(start.getDate() - start.getDay());

  const days: { date: string; count: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const iso = localDateString(cursor);
    days.push({ date: iso, count: loggedDates.get(iso) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const grid: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    grid.push(days.slice(i, i + 7));
  }

  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = localDateString(d);
    if ((loggedDates.get(iso) ?? 0) > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let run = 0;
  for (const day of days) {
    if (day.count > 0) {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 0;
    }
  }

  return { grid, currentStreak, longestStreak };
}
