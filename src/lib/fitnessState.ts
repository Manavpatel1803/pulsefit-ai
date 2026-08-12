import type {
  BiometricEntry,
  FitnessState,
  NutritionLog,
  TrendDirection,
  UserProfile,
  WeeklyReviewStats,
  WorkoutLog,
} from "./types";
import {
  calculateBMR,
  calculateMacros,
  calculateTDEE,
  calorieTargetForGoal,
  recoveryStatus,
  safeWeeklyRateKg,
  weeksToGoal,
} from "./calculations";
import { localDateString } from "./date";

const EXPECTED_SESSIONS_PER_28D = 16; // ~4/week baseline for a 100% consistency read

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

/**
 * Deterministic aggregation of a user's real logged data into a structured snapshot.
 * This is the ONLY place fitness-state numbers are calculated — AI services interpret
 * this output, they never compute or invent these values themselves.
 */
export function calculateFitnessState(
  profile: UserProfile,
  workoutLogs: WorkoutLog[],
  biometricEntries: BiometricEntry[],
  nutritionLogs: NutritionLog[]
): FitnessState {
  const cutoff7 = daysAgoString(7);
  const cutoff14 = daysAgoString(14);
  const cutoff28 = daysAgoString(28);

  // --- weight -----------------------------------------------------------
  const weighted = biometricEntries.filter((e) => e.weight_kg !== null);
  const currentWeight = weighted.length ? weighted[weighted.length - 1].weight_kg : profile.weight_kg;
  const recentWeights = weighted.filter((e) => e.entry_date >= cutoff14).map((e) => e.weight_kg!);
  const priorWeights = weighted
    .filter((e) => e.entry_date >= cutoff28 && e.entry_date < cutoff14)
    .map((e) => e.weight_kg!);
  const recentAvgWeight = average(recentWeights);
  const priorAvgWeight = average(priorWeights);
  const changeKg4wk =
    recentAvgWeight !== null && priorAvgWeight !== null
      ? Math.round((recentAvgWeight - priorAvgWeight) * 10) / 10
      : null;

  // --- training -----------------------------------------------------------
  const logs7 = workoutLogs.filter((l) => l.log_date >= cutoff7);
  const logs28 = workoutLogs.filter((l) => l.log_date >= cutoff28);
  const priorWeekLogs = workoutLogs.filter((l) => l.log_date >= cutoff14 && l.log_date < cutoff7);

  const sessionsLast7d = new Set(logs7.map((l) => l.log_date)).size;
  const sessionsLast28d = new Set(logs28.map((l) => l.log_date)).size;
  const consistencyPct = Math.round(clamp01(sessionsLast28d / EXPECTED_SESSIONS_PER_28D) * 100);

  const setVolume = (l: WorkoutLog) => (l.sets ?? 0) * (l.reps ?? 0) * (l.weight_kg ?? 0);
  const volumeLast7d = Math.round(logs7.reduce((sum, l) => sum + setVolume(l), 0));
  const volumePriorWeek = Math.round(priorWeekLogs.reduce((sum, l) => sum + setVolume(l), 0));

  const rpes = logs7.filter((l) => l.rpe !== null).map((l) => l.rpe!);
  const avgRpeLast7d = average(rpes);

  // --- nutrition -----------------------------------------------------------
  const nutrition7 = nutritionLogs.filter((n) => n.log_date >= cutoff7);
  const avgCalories = average(nutrition7.filter((n) => n.calories !== null).map((n) => n.calories!));
  const avgProteinG = average(nutrition7.filter((n) => n.protein_g !== null).map((n) => n.protein_g!));

  let calorieTarget: number | null = null;
  let proteinTargetG: number | null = null;
  if (profile.sex && profile.weight_kg && profile.height_cm && profile.age && profile.activity_level && profile.goal) {
    const bmr = calculateBMR(profile.sex, profile.weight_kg, profile.height_cm, profile.age);
    const tdee = calculateTDEE(bmr, profile.activity_level);
    calorieTarget = calorieTargetForGoal(tdee, profile.goal);
    proteinTargetG = calculateMacros(calorieTarget, profile.goal, profile.weight_kg).proteinG;
  }

  const daysWithinTarget = calorieTarget
    ? nutrition7.filter((n) => n.calories !== null && Math.abs(n.calories - calorieTarget!) / calorieTarget! <= 0.15)
        .length
    : 0;
  const adherencePct = nutrition7.length && calorieTarget ? Math.round((daysWithinTarget / nutrition7.length) * 100) : null;

  // --- recovery -----------------------------------------------------------
  const latestBiometric = biometricEntries.length ? biometricEntries[biometricEntries.length - 1] : null;
  const bio7 = biometricEntries.filter((e) => e.entry_date >= cutoff7);
  const bioPrior = biometricEntries.filter((e) => e.entry_date >= cutoff14 && e.entry_date < cutoff7);
  const sleepAvgHours = average(bio7.filter((e) => e.sleep_hours !== null).map((e) => e.sleep_hours!));
  const sleepAvgPrior = average(bioPrior.filter((e) => e.sleep_hours !== null).map((e) => e.sleep_hours!));

  // --- goal -----------------------------------------------------------
  let weeksToGoalCount: number | null = null;
  let onTrack: boolean | null = null;
  if (currentWeight && profile.target_weight_kg && profile.goal) {
    const rate = safeWeeklyRateKg(currentWeight, profile.goal);
    weeksToGoalCount = weeksToGoal(currentWeight, profile.target_weight_kg, rate);
    if (changeKg4wk !== null && Math.abs(profile.target_weight_kg - currentWeight) > 0.5) {
      const goalDirection = profile.target_weight_kg > currentWeight ? 1 : -1;
      const actualDirection = changeKg4wk > 0 ? 1 : changeKg4wk < 0 ? -1 : 0;
      onTrack = actualDirection === goalDirection;
    } else if (Math.abs(profile.target_weight_kg - currentWeight) <= 0.5) {
      onTrack = true;
    }
  }

  return {
    weight: {
      current: currentWeight,
      trend: trendFrom(recentAvgWeight, priorAvgWeight, 0.3),
      changeKg4wk,
    },
    training: {
      sessionsLast7d,
      sessionsLast28d,
      consistencyPct,
      volumeLast7d,
      volumeTrend: trendFrom(volumeLast7d, volumePriorWeek, volumePriorWeek * 0.1 || 50),
      avgRpeLast7d: avgRpeLast7d !== null ? Math.round(avgRpeLast7d * 10) / 10 : null,
    },
    nutrition: {
      loggedDaysLast7d: nutrition7.length,
      avgCalories: avgCalories !== null ? Math.round(avgCalories) : null,
      avgProteinG: avgProteinG !== null ? Math.round(avgProteinG) : null,
      calorieTarget,
      proteinTargetG,
      adherencePct,
    },
    recovery: {
      readinessScore: latestBiometric?.readiness_score ?? null,
      status: recoveryStatus(latestBiometric?.readiness_score ?? null),
      sleepAvgHours: sleepAvgHours !== null ? Math.round(sleepAvgHours * 10) / 10 : null,
      sleepTrend: trendFrom(sleepAvgHours, sleepAvgPrior, 0.3),
      avgSoreness: average(bio7.filter((e) => e.soreness !== null).map((e) => e.soreness!)),
      avgEnergy: average(bio7.filter((e) => e.energy !== null).map((e) => e.energy!)),
      avgStress: average(bio7.filter((e) => e.stress !== null).map((e) => e.stress!)),
    },
    goal: {
      targetWeightKg: profile.target_weight_kg,
      weeksToGoal: weeksToGoalCount,
      onTrack,
    },
    dataCompleteness: {
      hasWorkoutLogs: workoutLogs.length > 0,
      hasNutritionLogs: nutritionLogs.length > 0,
      hasBiometricEntries: biometricEntries.length > 0,
    },
  };
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/** Deterministic rolling-7-day stats snapshot. AI (Weekly Review) interprets this; never computes it. */
export function computeWeeklyStats(
  workoutLogs: WorkoutLog[],
  biometricEntries: BiometricEntry[],
  nutritionLogs: NutritionLog[]
): WeeklyReviewStats {
  const cutoff7 = daysAgoString(7);
  const cutoff14 = daysAgoString(14);

  const logs7 = workoutLogs.filter((l) => l.log_date >= cutoff7);
  const trainingSessions = new Set(logs7.map((l) => l.log_date)).size;
  const trainingVolume = Math.round(
    logs7.reduce((sum, l) => sum + (l.sets ?? 0) * (l.reps ?? 0) * (l.weight_kg ?? 0), 0)
  );

  const nutrition7 = nutritionLogs.filter((n) => n.log_date >= cutoff7);
  const avgCalories = average(nutrition7.filter((n) => n.calories !== null).map((n) => n.calories!));
  const avgProtein = average(nutrition7.filter((n) => n.protein_g !== null).map((n) => n.protein_g!));

  const bio7 = biometricEntries.filter((e) => e.entry_date >= cutoff7);
  const avgSleepHours = average(bio7.filter((e) => e.sleep_hours !== null).map((e) => e.sleep_hours!));
  const avgReadiness = average(bio7.filter((e) => e.readiness_score !== null).map((e) => e.readiness_score!));

  const weighted = biometricEntries.filter((e) => e.weight_kg !== null);
  const thisWeekWeights = weighted.filter((e) => e.entry_date >= cutoff7).map((e) => e.weight_kg!);
  const lastWeekWeights = weighted
    .filter((e) => e.entry_date >= cutoff14 && e.entry_date < cutoff7)
    .map((e) => e.weight_kg!);
  const thisWeekAvg = average(thisWeekWeights);
  const lastWeekAvg = average(lastWeekWeights);
  const weightChangeKg =
    thisWeekAvg !== null && lastWeekAvg !== null ? Math.round((thisWeekAvg - lastWeekAvg) * 10) / 10 : null;

  return {
    weekStart: cutoff7,
    trainingSessions,
    trainingVolume,
    avgCalories: avgCalories !== null ? Math.round(avgCalories) : null,
    avgProtein: avgProtein !== null ? Math.round(avgProtein) : null,
    avgSleepHours: avgSleepHours !== null ? Math.round(avgSleepHours * 10) / 10 : null,
    avgReadiness: avgReadiness !== null ? Math.round(avgReadiness) : null,
    weightChangeKg,
  };
}
