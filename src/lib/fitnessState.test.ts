import { describe, expect, it } from "vitest";
import { calculateFitnessState, computeWeeklyStats } from "./fitnessState";
import { localDateString } from "./date";
import type { BiometricEntry, NutritionLog, UserProfile, WorkoutLog } from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "u1",
    full_name: "Test User",
    avatar_url: null,
    tier: "free",
    sex: "male",
    age: 30,
    height_cm: 180,
    weight_kg: 80,
    activity_level: "moderate",
    goal: "lose_fat",
    experience_level: "intermediate",
    equipment: [],
    target_weight_kg: 75,
    target_date: null,
    dietary_preference: null,
    injury_flags: [],
    preferred_workout_time: null,
    motivation_style: null,
    training_days_per_week: null,
    sleep_goal_hours: null,
    biggest_challenge: null,
    plan_selected: true,
    newsletter_subscribed: false,
    newsletter_subscribed_at: null,
    newsletter_prompted: false,
    onboarding_complete: true,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_subscription_status: null,
    ...overrides,
  };
}

function workoutLog(log_date: string): WorkoutLog {
  return { id: log_date, user_id: "u1", log_date, exercise_name: "Squat", sets: 3, reps: 5, weight_kg: 100, rpe: 8, notes: null, created_at: log_date };
}

function biometric(entry_date: string, overrides: Partial<BiometricEntry> = {}): BiometricEntry {
  return {
    id: entry_date,
    user_id: "u1",
    entry_date,
    weight_kg: null,
    body_fat_pct: null,
    muscle_mass_kg: null,
    resting_hr: null,
    hrv_ms: null,
    sleep_hours: null,
    sleep_quality_pct: null,
    steps: null,
    readiness_score: null,
    soreness: null,
    energy: null,
    stress: null,
    ...overrides,
  };
}

function nutritionLog(log_date: string, calories: number, protein_g: number): NutritionLog {
  return { id: log_date, user_id: "u1", log_date, calories, protein_g, carbs_g: null, fat_g: null, notes: null, created_at: log_date };
}

describe("calculateFitnessState", () => {
  it("reports no data completeness when the user has logged nothing", () => {
    const state = calculateFitnessState(profile(), [], [], []);
    expect(state.dataCompleteness.hasWorkoutLogs).toBe(false);
    expect(state.dataCompleteness.hasNutritionLogs).toBe(false);
    expect(state.dataCompleteness.hasBiometricEntries).toBe(false);
  });

  it("never fabricates a readiness score or sleep average when no biometric entries exist", () => {
    const state = calculateFitnessState(profile(), [workoutLog(daysAgo(1))], [], []);
    expect(state.recovery.readinessScore).toBeNull();
    expect(state.recovery.sleepAvgHours).toBeNull();
    // With no readiness score, status should default to the cautious "yellow", not "green".
    expect(state.recovery.status).toBe("yellow");
  });

  it("counts distinct training days in the last 7 and 28 days correctly", () => {
    const logs = [workoutLog(daysAgo(1)), workoutLog(daysAgo(1)), workoutLog(daysAgo(3)), workoutLog(daysAgo(20))];
    const state = calculateFitnessState(profile(), logs, [], []);
    expect(state.training.sessionsLast7d).toBe(2); // day-1 (x2 logs = 1 day) + day-3
    expect(state.training.sessionsLast28d).toBe(3);
  });

  it("computes training volume as sum(sets * reps * weight)", () => {
    const logs = [workoutLog(daysAgo(1))]; // 3 * 5 * 100 = 1500
    const state = calculateFitnessState(profile(), logs, [], []);
    expect(state.training.volumeLast7d).toBe(1500);
  });

  it("derives calorie/protein targets deterministically from profile when complete", () => {
    const state = calculateFitnessState(profile(), [], [], []);
    expect(state.nutrition.calorieTarget).not.toBeNull();
    expect(state.nutrition.proteinTargetG).not.toBeNull();
  });

  it("leaves targets null when the profile is incomplete, rather than guessing", () => {
    const state = calculateFitnessState(profile({ age: null }), [], [], []);
    expect(state.nutrition.calorieTarget).toBeNull();
    expect(state.nutrition.proteinTargetG).toBeNull();
  });

  it("flags onTrack based on whether the real weight trend matches the goal direction", () => {
    const p = profile({ weight_kg: 80, target_weight_kg: 75 }); // goal: lose weight
    const losingTrend = [
      biometric(daysAgo(25), { weight_kg: 81 }),
      biometric(daysAgo(3), { weight_kg: 79 }), // trending down — matches the fat-loss goal
    ];
    const gainingTrend = [
      biometric(daysAgo(25), { weight_kg: 79 }),
      biometric(daysAgo(3), { weight_kg: 81 }), // trending up — away from the goal
    ];
    expect(calculateFitnessState(p, [], losingTrend, []).goal.onTrack).toBe(true);
    expect(calculateFitnessState(p, [], gainingTrend, []).goal.onTrack).toBe(false);
  });
});

describe("computeWeeklyStats", () => {
  it("computes weight change as this-week average minus prior-week average", () => {
    const entries = [
      biometric(daysAgo(10), { weight_kg: 82 }), // prior week
      biometric(daysAgo(2), { weight_kg: 80 }), // this week
    ];
    const stats = computeWeeklyStats([], entries, []);
    expect(stats.weightChangeKg).toBe(-2);
  });

  it("returns null (not zero) for metrics with no logged data, so the AI layer knows to say so", () => {
    const stats = computeWeeklyStats([], [], []);
    expect(stats.avgCalories).toBeNull();
    expect(stats.avgSleepHours).toBeNull();
    expect(stats.weightChangeKg).toBeNull();
  });

  it("averages nutrition logs from the last 7 days only", () => {
    const logs = [nutritionLog(daysAgo(1), 2000, 150), nutritionLog(daysAgo(3), 2400, 170), nutritionLog(daysAgo(20), 1000, 50)];
    const stats = computeWeeklyStats([], [], logs);
    expect(stats.avgCalories).toBe(2200);
    expect(stats.avgProtein).toBe(160);
  });
});
