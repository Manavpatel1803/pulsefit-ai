import type { WorkoutLog } from "./types";

const STALL_SESSION_COUNT = 3;

export interface ExerciseOptimisation {
  exerciseName: string;
  sessionsLogged: number;
  stalled: boolean;
  lastWeightKg: number | null;
  suggestion: string;
}

export interface WorkoutOptimisation {
  exercises: ExerciseOptimisation[];
  stalledCount: number;
  headline: string;
}

/**
 * Deterministic program-wide scan: for every exercise logged at least STALL_SESSION_COUNT
 * times, checks whether the last N sessions used the same working weight — the classic
 * signature of a stalled lift that needs a structural change (deload, rep-range swap,
 * variation), not just a single-day RPE tweak. This is what makes it "continuous
 * fitness-plan optimisation" rather than Plus's one-exercise-at-a-time suggestion.
 */
export function computeWorkoutOptimisation(logs: WorkoutLog[]): WorkoutOptimisation {
  const byExercise = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    if (log.weight_kg === null) continue;
    const list = byExercise.get(log.exercise_name) ?? [];
    list.push(log);
    byExercise.set(log.exercise_name, list);
  }

  const exercises: ExerciseOptimisation[] = [];
  for (const [exerciseName, entries] of byExercise) {
    const sorted = [...entries].sort((a, b) => b.log_date.localeCompare(a.log_date));
    if (sorted.length < STALL_SESSION_COUNT) continue;

    const recentWeights = sorted.slice(0, STALL_SESSION_COUNT).map((l) => l.weight_kg!);
    const stalled = recentWeights.every((w) => w === recentWeights[0]);
    const lastWeightKg = sorted[0].weight_kg;

    exercises.push({
      exerciseName,
      sessionsLogged: sorted.length,
      stalled,
      lastWeightKg,
      suggestion: stalled
        ? `${exerciseName} has held at ${lastWeightKg}kg for ${STALL_SESSION_COUNT} straight sessions — try a deload week, a rep-range change, or a variation.`
        : `${exerciseName} is progressing.`,
    });
  }

  exercises.sort((a, b) => Number(b.stalled) - Number(a.stalled));
  const stalledCount = exercises.filter((e) => e.stalled).length;

  const headline =
    exercises.length === 0
      ? "Log at least 3 sessions per exercise to unlock program-wide optimisation."
      : stalledCount === 0
        ? "No stalled lifts — your program is progressing across the board."
        : `${stalledCount} exercise${stalledCount === 1 ? "" : "s"} stalled — see below.`;

  return { exercises, stalledCount, headline };
}
