import { describe, expect, it } from "vitest";
import { computeNutritionIntelligence } from "./nutritionIntelligence";
import { localDateString } from "./date";
import type { BiometricEntry, NutritionLog } from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

function nutritionLog(log_date: string, calories: number): NutritionLog {
  return { id: log_date, user_id: "u1", log_date, calories, protein_g: 150, carbs_g: 200, fat_g: 60, notes: null, created_at: log_date };
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

describe("computeNutritionIntelligence", () => {
  it("reports insufficient data without enough logged nutrition and weight history", () => {
    const result = computeNutritionIntelligence([], [], "lose_fat", 2000);
    expect(result.hasEnoughData).toBe(false);
  });

  it("recommends recalibrating the target when logged intake and actual weight change disagree with the formula", () => {
    // Athlete logged ~2000 kcal/day for 4 weeks but weight didn't move at all — implies
    // their real maintenance is close to 2000, not whatever the formula assumed.
    const nutritionLogs = Array.from({ length: 20 }, (_, i) => nutritionLog(daysAgo(i + 1), 2000));
    const biometricEntries = [biometric(daysAgo(27), 80), biometric(daysAgo(1), 80)];
    const result = computeNutritionIntelligence(nutritionLogs, biometricEntries, "lose_fat", 1800);
    expect(result.hasEnoughData).toBe(true);
    expect(result.recalibratedCalorieTarget).not.toBeNull();
    expect(result.insight).toMatch(/recalibrated/i);
  });

  it("says no recalibration is needed when the current target already matches real-world response", () => {
    // Logging ~1600 kcal/day and actually losing weight at the expected deficit-implied rate
    // means the existing 1600 kcal target is already well-calibrated.
    const nutritionLogs = Array.from({ length: 20 }, (_, i) => nutritionLog(daysAgo(i + 1), 1600));
    const biometricEntries = [biometric(daysAgo(27), 80), biometric(daysAgo(1), 78.5)];
    const result = computeNutritionIntelligence(nutritionLogs, biometricEntries, "lose_fat", 1600);
    expect(result.insight).toMatch(/no recalibration needed/i);
  });
});
