import { describe, expect, it } from "vitest";
import { computeProgressAnalysis } from "./progressAnalysis";
import { localDateString } from "./date";
import type { BiometricEntry, WorkoutLog } from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

function biometric(entry_date: string, weight_kg: number | null): BiometricEntry {
  return {
    id: entry_date,
    user_id: "u1",
    entry_date,
    weight_kg,
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
  };
}

describe("computeProgressAnalysis", () => {
  it("reports insufficient data when there aren't enough weeks of weigh-ins on both sides of the window", () => {
    const entries = [biometric(daysAgo(2), 80)];
    const result = computeProgressAnalysis(entries, [], "lose_fat");
    expect(result.hasEnoughData).toBe(false);
    expect(result.plateauDetected).toBe(false);
  });

  it("detects a plateau when weight has barely moved over 8 weeks despite a fat-loss goal", () => {
    const entries = [
      biometric(daysAgo(50), 80.2),
      biometric(daysAgo(45), 80.0),
      biometric(daysAgo(10), 80.1),
      biometric(daysAgo(2), 79.9),
    ];
    const result = computeProgressAnalysis(entries, [], "lose_fat");
    expect(result.hasEnoughData).toBe(true);
    expect(result.plateauDetected).toBe(true);
    expect(result.headline).toMatch(/flat/i);
  });

  it("does not flag a plateau for a maintain goal even when weight is flat", () => {
    const entries = [
      biometric(daysAgo(50), 80.0),
      biometric(daysAgo(45), 80.1),
      biometric(daysAgo(10), 79.9),
      biometric(daysAgo(2), 80.0),
    ];
    const result = computeProgressAnalysis(entries, [], "maintain");
    expect(result.plateauDetected).toBe(false);
  });

  it("does not flag a plateau when weight is trending in the goal's direction", () => {
    const entries = [
      biometric(daysAgo(50), 84),
      biometric(daysAgo(45), 83.5),
      biometric(daysAgo(10), 80.2),
      biometric(daysAgo(2), 80),
    ];
    const result = computeProgressAnalysis(entries, [], "lose_fat");
    expect(result.plateauDetected).toBe(false);
    expect(result.weightTrend8wk).toBe("down");
  });

  it("reads training volume trend from logged sets independently of the weight trend", () => {
    const logs: WorkoutLog[] = [
      { id: "1", user_id: "u1", log_date: daysAgo(50), exercise_name: "Squat", sets: 3, reps: 5, weight_kg: 60, rpe: 7, notes: null, created_at: daysAgo(50) },
      { id: "2", user_id: "u1", log_date: daysAgo(2), exercise_name: "Squat", sets: 5, reps: 5, weight_kg: 100, rpe: 8, notes: null, created_at: daysAgo(2) },
    ];
    const result = computeProgressAnalysis([], logs, "build_muscle");
    expect(result.trainingVolumeTrend8wk).toBe("up");
  });

  it("honors a longer window for Pro's long-term trend read, not just the Plus 8-week default", () => {
    // Flat in the last 8 weeks, but genuinely down over a 26-week window — the two
    // calls must disagree, proving windowWeeks actually changes the comparison range.
    const entries = [
      biometric(daysAgo(180), 90),
      biometric(daysAgo(175), 89.8),
      biometric(daysAgo(50), 80.2),
      biometric(daysAgo(45), 80.0),
      biometric(daysAgo(10), 80.1),
      biometric(daysAgo(2), 79.9),
    ];
    const shortTerm = computeProgressAnalysis(entries, [], "lose_fat", 8);
    const longTerm = computeProgressAnalysis(entries, [], "lose_fat", 26);
    expect(shortTerm.plateauDetected).toBe(true);
    expect(longTerm.weightTrend8wk).toBe("down");
    expect(longTerm.plateauDetected).toBe(false);
  });
});
