import { describe, expect, it } from "vitest";
import { computeGoalPrediction } from "./goalPrediction";
import { localDateString } from "./date";
import type { BiometricEntry } from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

function biometric(entry_date: string, weight_kg: number): BiometricEntry {
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

describe("computeGoalPrediction", () => {
  it("reports insufficient data with too few weigh-ins", () => {
    const result = computeGoalPrediction([biometric(daysAgo(1), 80)], 80, 75, 10);
    expect(result.hasEnoughData).toBe(false);
  });

  it("flags ahead-of-plan when the actual pace beats the theoretical plan", () => {
    // Lost 8kg over the last 55 days (~1kg/wk actual) with 5kg left to go — predicts
    // ~5 weeks against a 10-week theoretical plan, meaningfully ahead.
    const entries = [biometric(daysAgo(56), 88), biometric(daysAgo(38), 85), biometric(daysAgo(19), 82), biometric(daysAgo(1), 80)];
    const result = computeGoalPrediction(entries, 80, 75, 10);
    expect(result.hasEnoughData).toBe(true);
    expect(result.predictedWeeksToGoal).toBeLessThan(10);
    expect(result.aheadOrBehind).toBe("ahead");
  });

  it("flags behind-plan when the actual pace is slower than the theoretical plan", () => {
    // Lost only 2kg over 55 days (~0.25kg/wk actual) with 5kg left to go — predicts
    // ~20 weeks against a 10-week theoretical plan, meaningfully behind.
    const entries = [biometric(daysAgo(56), 82), biometric(daysAgo(38), 81.5), biometric(daysAgo(19), 81), biometric(daysAgo(1), 80)];
    const result = computeGoalPrediction(entries, 80, 75, 10);
    expect(result.predictedWeeksToGoal).toBeGreaterThan(10);
    expect(result.aheadOrBehind).toBe("behind");
  });

  it("returns no prediction when weight is moving opposite the goal direction", () => {
    const entries = [biometric(daysAgo(56), 78), biometric(daysAgo(38), 78.5), biometric(daysAgo(19), 79), biometric(daysAgo(1), 80)];
    const result = computeGoalPrediction(entries, 80, 75, 10);
    expect(result.predictedWeeksToGoal).toBeNull();
    expect(result.insight).toMatch(/isn't moving toward/i);
  });
});
