import type { ProgressionSuggestion, WorkoutLog } from "./types";

const WEIGHT_STEP_KG = 2.5;

/**
 * Deterministic next-session suggestion for one exercise, based on the athlete's own
 * most recent logged set for it — never invented, never AI-generated. RPE <= 6 on the
 * last set means it was too easy (add load); RPE >= 9 means back off; in between, hold
 * and let reps/consistency build first.
 */
export function suggestNextProgression(logs: WorkoutLog[], exerciseName: string): ProgressionSuggestion | null {
  const matching = logs
    .filter((l) => l.exercise_name === exerciseName)
    .sort((a, b) => b.log_date.localeCompare(a.log_date));
  const last = matching[0];
  if (!last) return null;

  const lastWeightKg = last.weight_kg;
  const lastReps = last.reps;
  const lastRpe = last.rpe;

  let suggestion: string;
  let suggestedWeightKg: number | null = lastWeightKg;

  if (lastRpe === null || lastWeightKg === null) {
    suggestion = "Log an RPE next time to get a load suggestion for this exercise.";
  } else if (lastRpe <= 6) {
    suggestedWeightKg = Math.round((lastWeightKg + WEIGHT_STEP_KG) * 10) / 10;
    suggestion = `Last set felt easy (RPE ${lastRpe}). Try ${suggestedWeightKg}kg this session.`;
  } else if (lastRpe >= 9) {
    suggestedWeightKg = Math.round((lastWeightKg - WEIGHT_STEP_KG) * 10) / 10;
    suggestion = `Last set was near max effort (RPE ${lastRpe}). Hold at ${suggestedWeightKg}kg or reduce volume this session.`;
  } else {
    suggestion = `Last set was on target (RPE ${lastRpe}). Repeat ${lastWeightKg}kg and aim for an extra rep before adding load.`;
  }

  return {
    exerciseName,
    lastLoggedDate: last.log_date,
    lastWeightKg,
    lastReps,
    lastRpe,
    suggestion,
    suggestedWeightKg,
  };
}
