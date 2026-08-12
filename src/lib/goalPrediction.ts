import { localDateString } from "./date";
import type { BiometricEntry } from "./types";

function daysAgoString(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

const WINDOW_DAYS = 56;

export interface GoalPrediction {
  actualWeeklyRateKg: number | null;
  predictedWeeksToGoal: number | null;
  theoreticalWeeksToGoal: number | null;
  aheadOrBehind: "ahead" | "behind" | "on_track" | null;
  hasEnoughData: boolean;
  insight: string;
}

/**
 * Predictive completion date driven by the athlete's OBSERVED rate of change over the
 * last 8 weeks, not the formula's theoretical "safe" rate Plus's Goal Blueprint uses.
 * This is what makes it genuinely predictive rather than a static plan: it catches real
 * divergence between plan and reality and says so in weeks, not vague encouragement.
 */
export function computeGoalPrediction(
  biometricEntries: BiometricEntry[],
  currentWeightKg: number | null,
  targetWeightKg: number | null,
  theoreticalWeeksToGoal: number | null
): GoalPrediction {
  const cutoff = daysAgoString(WINDOW_DAYS);
  const weighted = [...biometricEntries]
    .filter((e) => e.weight_kg !== null && e.entry_date >= cutoff)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  const hasEnoughData = weighted.length >= 4 && currentWeightKg !== null && targetWeightKg !== null;
  if (!hasEnoughData) {
    return {
      actualWeeklyRateKg: null,
      predictedWeeksToGoal: null,
      theoreticalWeeksToGoal,
      aheadOrBehind: null,
      hasEnoughData: false,
      insight: "Log weight regularly for a few weeks to unlock a pace-based prediction.",
    };
  }

  const first = weighted[0];
  const last = weighted[weighted.length - 1];
  const daysSpan = Math.max(7, (new Date(last.entry_date).getTime() - new Date(first.entry_date).getTime()) / 86400000);
  const totalChangeKg = last.weight_kg! - first.weight_kg!;
  const actualWeeklyRateKg = Math.round(((totalChangeKg / daysSpan) * 7) * 100) / 100;

  const remainingKg = targetWeightKg! - currentWeightKg!;
  const movingTowardGoal = Math.abs(actualWeeklyRateKg) > 0.01 && Math.sign(actualWeeklyRateKg) === Math.sign(remainingKg);
  const predictedWeeksToGoal = movingTowardGoal ? Math.max(0, Math.round(remainingKg / actualWeeklyRateKg)) : null;

  let aheadOrBehind: "ahead" | "behind" | "on_track" | null = null;
  let insight: string;

  if (predictedWeeksToGoal === null) {
    insight = "At your actual pace over the last 8 weeks, weight isn't moving toward your target — the plan needs a change, not just patience.";
  } else if (theoreticalWeeksToGoal !== null) {
    const diff = predictedWeeksToGoal - theoreticalWeeksToGoal;
    if (diff <= -1) {
      aheadOrBehind = "ahead";
      insight = `At your actual pace (${actualWeeklyRateKg}kg/wk), you're on track for ~${predictedWeeksToGoal} weeks — ${Math.abs(diff)} weeks ahead of the original plan.`;
    } else if (diff >= 1) {
      aheadOrBehind = "behind";
      insight = `At your actual pace (${actualWeeklyRateKg}kg/wk), you're on track for ~${predictedWeeksToGoal} weeks — ${diff} weeks behind the original plan.`;
    } else {
      aheadOrBehind = "on_track";
      insight = `At your actual pace (${actualWeeklyRateKg}kg/wk), you're on track for ~${predictedWeeksToGoal} weeks — matching the original plan.`;
    }
  } else {
    insight = `At your actual pace (${actualWeeklyRateKg}kg/wk), you're on track for ~${predictedWeeksToGoal} weeks.`;
  }

  return { actualWeeklyRateKg, predictedWeeksToGoal, theoreticalWeeksToGoal, aheadOrBehind, hasEnoughData: true, insight };
}
