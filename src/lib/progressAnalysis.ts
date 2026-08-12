import type { BiometricEntry, Goal, ProgressAnalysis, TrendDirection, WorkoutLog } from "./types";
import { localDateString } from "./date";

function daysAgoString(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function trendFrom(recent: number | null, prior: number | null, epsilon: number): TrendDirection {
  if (recent === null || prior === null) return "flat";
  const delta = recent - prior;
  if (Math.abs(delta) < epsilon) return "flat";
  return delta > 0 ? "up" : "down";
}

const PLATEAU_EPSILON_KG = 0.7;

/**
 * Deterministic trend read over `windowWeeks` (split into two equal halves, comparing
 * recent vs older): weight direction, training volume direction, and plateau detection
 * (goal implies weight should move, but it's been flat). Defaults to 8 weeks (Plus);
 * Pro calls this again with a longer window for "long-term trend analysis" / "deeper
 * historical analysis" — same deterministic logic, just a wider lens. AI never computes
 * this — it only gets to phrase it, if a future feature wants that.
 */
export function computeProgressAnalysis(
  biometricEntries: BiometricEntry[],
  workoutLogs: WorkoutLog[],
  goal: Goal | null,
  windowWeeks = 8
): ProgressAnalysis {
  const halfDays = Math.round((windowWeeks * 7) / 2);
  const cutoffHalf = daysAgoString(halfDays);
  const cutoffFull = daysAgoString(windowWeeks * 7);

  const weighted = biometricEntries.filter((e) => e.weight_kg !== null);
  const recentWeights = weighted.filter((e) => e.entry_date >= cutoffHalf).map((e) => e.weight_kg!);
  const olderWeights = weighted.filter((e) => e.entry_date >= cutoffFull && e.entry_date < cutoffHalf).map((e) => e.weight_kg!);
  const recentAvg = average(recentWeights);
  const olderAvg = average(olderWeights);

  const weightChangeKg8wk =
    recentAvg !== null && olderAvg !== null ? Math.round((recentAvg - olderAvg) * 10) / 10 : null;
  const weightTrend8wk = trendFrom(recentAvg, olderAvg, PLATEAU_EPSILON_KG);

  const setVolume = (l: WorkoutLog) => (l.sets ?? 0) * (l.reps ?? 0) * (l.weight_kg ?? 0);
  const recentVolume = workoutLogs.filter((l) => l.log_date >= cutoffHalf).reduce((s, l) => s + setVolume(l), 0);
  const olderVolume = workoutLogs
    .filter((l) => l.log_date >= cutoffFull && l.log_date < cutoffHalf)
    .reduce((s, l) => s + setVolume(l), 0);
  const trainingVolumeTrend8wk = trendFrom(recentVolume, olderVolume, olderVolume * 0.1 || 50);

  const hasEnoughData = recentAvg !== null && olderAvg !== null && recentWeights.length >= 2 && olderWeights.length >= 2;
  const goalImpliesChange = goal === "lose_fat" || goal === "build_muscle";
  const plateauDetected =
    hasEnoughData && goalImpliesChange && weightChangeKg8wk !== null && Math.abs(weightChangeKg8wk) < PLATEAU_EPSILON_KG;
  const plateauWeeks = plateauDetected ? windowWeeks : 0;

  let headline: string;
  if (!hasEnoughData) {
    headline = `Log weight consistently for a few more weeks to unlock a ${windowWeeks}-week trend read.`;
  } else if (plateauDetected) {
    const goalWord = goal === "lose_fat" ? "losing fat" : "building muscle";
    headline = `Your weight has held flat for about ${windowWeeks} weeks despite a goal of ${goalWord} — worth reassessing your calorie target.`;
  } else if (goal === "lose_fat" && weightTrend8wk === "down") {
    headline = `Trending the right way — down ${Math.abs(weightChangeKg8wk!)}kg over ${windowWeeks} weeks.`;
  } else if (goal === "build_muscle" && weightTrend8wk === "up") {
    headline = `Trending the right way — up ${Math.abs(weightChangeKg8wk!)}kg over ${windowWeeks} weeks.`;
  } else if (goal === "maintain" && weightTrend8wk === "flat") {
    headline = `Weight has stayed stable over ${windowWeeks} weeks — right where a maintenance goal wants it.`;
  } else if (goalImpliesChange) {
    const direction = weightChangeKg8wk !== null && weightChangeKg8wk > 0 ? "up" : "down";
    headline = `Weight has moved ${direction} ${Math.abs(weightChangeKg8wk ?? 0)}kg over ${windowWeeks} weeks — opposite your goal direction. Worth a check-in on training and nutrition.`;
  } else {
    headline = `${windowWeeks}-week weight trend is stable.`;
  }

  return {
    weightChangeKg8wk,
    weightTrend8wk,
    trainingVolumeTrend8wk,
    plateauDetected,
    plateauWeeks,
    headline,
    hasEnoughData,
  };
}
