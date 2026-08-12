import type { ActivityLevel, Goal, RecoveryStatus, Sex } from "./types";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (desk job, little exercise)",
  light: "Lightly active (1-3 workouts/week)",
  moderate: "Moderately active (3-5 workouts/week)",
  active: "Active (6-7 workouts/week)",
  very_active: "Very active (physical job + training)",
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose_fat: "Lose fat",
  maintain: "Maintain",
  build_muscle: "Build muscle",
  recomposition: "Recomposition",
};

/** Mifflin-St Jeor equation. Returns kcal/day at complete rest. */
export function calculateBMR(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

/** Total Daily Energy Expenditure = BMR x activity multiplier. */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/** Calorie target for a given goal, anchored to TDEE. */
export function calorieTargetForGoal(tdee: number, goal: Goal): number {
  switch (goal) {
    case "lose_fat":
      return Math.round(tdee * 0.8);
    case "build_muscle":
      return Math.round(tdee * 1.1);
    case "recomposition":
      return Math.round(tdee * 0.95);
    case "maintain":
    default:
      return tdee;
  }
}

/** Macro split (g/day) given a calorie target, goal, and bodyweight. */
export function calculateMacros(
  calorieTarget: number,
  goal: Goal,
  weightKg: number
): { proteinG: number; carbsG: number; fatG: number } {
  const proteinPerKg = goal === "build_muscle" || goal === "recomposition" ? 2.2 : 1.8;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const proteinCals = proteinG * 4;

  const fatPct = goal === "lose_fat" ? 0.3 : 0.28;
  const fatCals = calorieTarget * fatPct;
  const fatG = Math.round(fatCals / 9);

  const carbCals = Math.max(calorieTarget - proteinCals - fatCals, 0);
  const carbsG = Math.round(carbCals / 4);

  return { proteinG, carbsG, fatG };
}

/** Weeks to reach a target weight at a safe weekly rate (0.5% bodyweight/week cap). */
export function weeksToGoal(currentKg: number, targetKg: number, weeklyRateKg: number): number {
  if (weeklyRateKg <= 0) return Infinity;
  return Math.ceil(Math.abs(currentKg - targetKg) / weeklyRateKg);
}

export function safeWeeklyRateKg(currentWeightKg: number, goal: Goal): number {
  const pct = goal === "build_muscle" ? 0.0025 : 0.005;
  return Math.round(currentWeightKg * pct * 100) / 100;
}

export function bodyMassIndex(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/** 0-100 readiness score from HRV delta, RHR delta, and sleep quality. */
export function calculateReadinessScore(params: {
  hrvMs: number;
  hrvBaselineMs: number;
  restingHr: number;
  restingHrBaseline: number;
  sleepQualityPct: number;
}): number {
  const { hrvMs, hrvBaselineMs, restingHr, restingHrBaseline, sleepQualityPct } = params;
  const hrvScore = clamp((hrvMs / hrvBaselineMs) * 100, 0, 130);
  const hrScore = clamp(100 - (restingHr - restingHrBaseline) * 4, 0, 130);
  const sleepScore = clamp(sleepQualityPct, 0, 100);
  const composite = hrvScore * 0.4 + hrScore * 0.35 + sleepScore * 0.25;
  return Math.round(clamp(composite, 0, 100));
}

/** Same thresholds AuraCoach's load adjuster uses, so the two stay consistent. */
export function recoveryStatus(readinessScore: number | null): RecoveryStatus {
  if (readinessScore === null) return "yellow";
  if (readinessScore >= 70) return "green";
  if (readinessScore >= 55) return "yellow";
  return "red";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
