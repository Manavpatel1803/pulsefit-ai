"use client";

import { useMemo, useState } from "react";
import { Dumbbell } from "lucide-react";
import { EXERCISE_LIBRARY, EQUIPMENT_TYPES } from "@/lib/exerciseData";
import type { Exercise } from "@/lib/types";

const CATEGORIES: { key: Exercise["category"] | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "push", label: "Push" },
  { key: "pull", label: "Pull" },
  { key: "legs", label: "Legs" },
  { key: "core", label: "Core" },
  { key: "cardio", label: "Cardio" },
  { key: "full_body", label: "Full body" },
];

export default function WorkoutLibrary() {
  const [category, setCategory] = useState<Exercise["category"] | "all">("all");
  const [equipment, setEquipment] = useState<string>("all");

  const filtered = useMemo(
    () =>
      EXERCISE_LIBRARY.filter(
        (e) =>
          (category === "all" || e.category === category) &&
          (equipment === "all" || e.equipment === equipment)
      ),
    [category, equipment]
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              category === c.key
                ? "bg-indigo/20 border-indigo-glow/50 text-indigo-glow"
                : "bg-white/5 border-hairline text-mist hover:text-white"
            }`}
          >
            {c.label}
          </button>
        ))}
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className="ml-auto rounded-full bg-white/5 border border-hairline px-3 py-1.5 text-xs text-mist outline-none focus:border-indigo-glow/50"
        >
          <option value="all" className="bg-surface">
            All equipment
          </option>
          {EQUIPMENT_TYPES.map((eq) => (
            <option key={eq} value={eq} className="bg-surface">
              {eq}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ex) => (
          <div key={ex.id} className="glass p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-white text-sm">{ex.name}</h3>
                <p className="text-xs text-mist mt-0.5">{ex.muscleGroup}</p>
              </div>
              <Dumbbell className="h-4 w-4 text-mist-dim shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag>{ex.equipment}</Tag>
              <Tag>{ex.difficulty}</Tag>
            </div>
            <ul className="space-y-1">
              {ex.cues.map((cue) => (
                <li key={cue} className="text-xs text-mist-dim flex gap-1.5">
                  <span className="text-emerald">•</span>
                  {cue}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-mist text-center py-10">No exercises match those filters.</p>
      )}
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-white/5 text-mist border border-hairline">
      {children}
    </span>
  );
}
