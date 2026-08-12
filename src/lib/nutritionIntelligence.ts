import { calorieTargetForGoal } from "./calculations";
import { localDateString } from "./date";
import type { BiometricEntry, Goal, NutritionLog } from "./types";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function daysAgoString(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

const KCAL_PER_KG_BODY_MASS = 7700;
const WINDOW_DAYS = 28;
const RECALIBRATE_THRESHOLD_PCT = 8;

export interface NutritionIntelligence {
  impliedTdee: number | null;
  currentCalorieTarget: number | null;
  recalibratedCalorieTarget: number | null;
  adherencePct: number | null;
  hasEnoughData: boolean;
  insight: string;
}

/**
 * Deterministic calorie-target recalibration: the formula-based target (Mifflin-St Jeor
 * + activity multiplier) is a starting estimate, not ground truth. This backs out the
 * athlete's REAL maintenance level from what actually happened to their logged weight
 * over the same period they logged calories, and only recommends a change when the two
 * diverge enough to matter — never on noisy data.
 */
export function computeNutritionIntelligence(
  nutritionLogs: NutritionLog[],
  biometricEntries: BiometricEntry[],
  goal: Goal | null,
  currentCalorieTarget: number | null
): NutritionIntelligence {
  const cutoff = daysAgoString(WINDOW_DAYS);
  const nutritionWindow = nutritionLogs.filter((n) => n.log_date >= cutoff && n.calories !== null);
  const avgCalories = average(nutritionWindow.map((n) => n.calories!));

  const weighted = [...biometricEntries]
    .filter((e) => e.weight_kg !== null)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const windowWeights = weighted.filter((e) => e.entry_date >= cutoff);

  const hasEnoughData =
    !!goal && currentCalorieTarget !== null && avgCalories !== null && nutritionWindow.length >= 10 && windowWeights.length >= 2;

  if (!hasEnoughData) {
    return {
      impliedTdee: null,
      currentCalorieTarget,
      recalibratedCalorieTarget: null,
      adherencePct: null,
      hasEnoughData: false,
      insight: "Log nutrition and weight consistently for a few weeks to unlock calorie-target recalibration.",
    };
  }

  const first = windowWeights[0];
  const last = windowWeights[windowWeights.length - 1];
  const daysSpan = Math.max(7, (new Date(last.entry_date).getTime() - new Date(first.entry_date).getTime()) / 86400000);
  const weightChangeKg = last.weight_kg! - first.weight_kg!;

  const impliedTdee = Math.round(avgCalories! - (weightChangeKg * KCAL_PER_KG_BODY_MASS) / daysSpan);
  const recalibratedCalorieTarget = calorieTargetForGoal(impliedTdee, goal!);
  const adherencePct = Math.round((1 - Math.abs(avgCalories! - currentCalorieTarget!) / currentCalorieTarget!) * 100);
  const targetDeltaPct = Math.round((Math.abs(recalibratedCalorieTarget - currentCalorieTarget!) / currentCalorieTarget!) * 100);

  const insight =
    targetDeltaPct >= RECALIBRATE_THRESHOLD_PCT
      ? `Your actual weight response implies a maintenance level closer to ${impliedTdee} kcal/day than the formula estimate. Recalibrated target: ${recalibratedCalorieTarget} kcal (current: ${currentCalorieTarget} kcal).`
      : `Your current ${currentCalorieTarget} kcal target matches your real-world response well — no recalibration needed.`;

  return {
    impliedTdee,
    currentCalorieTarget,
    recalibratedCalorieTarget,
    adherencePct: Math.max(0, Math.min(100, adherencePct)),
    hasEnoughData: true,
    insight,
  };
}
