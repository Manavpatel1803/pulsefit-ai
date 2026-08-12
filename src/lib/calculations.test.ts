import { describe, expect, it } from "vitest";
import {
  bodyMassIndex,
  calculateBMR,
  calculateMacros,
  calculateReadinessScore,
  calculateTDEE,
  calorieTargetForGoal,
  recoveryStatus,
  safeWeeklyRateKg,
  weeksToGoal,
} from "./calculations";

describe("calculateBMR", () => {
  it("matches Mifflin-St Jeor for males", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBMR("male", 80, 180, 30)).toBe(1780);
  });

  it("matches Mifflin-St Jeor for females (offset -161 instead of +5)", () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> rounds to 1345
    expect(calculateBMR("female", 60, 165, 25)).toBe(1345);
  });
});

describe("calculateTDEE", () => {
  it("scales BMR by the activity multiplier", () => {
    expect(calculateTDEE(1780, "sedentary")).toBe(Math.round(1780 * 1.2));
    expect(calculateTDEE(1780, "very_active")).toBe(Math.round(1780 * 1.9));
  });
});

describe("calorieTargetForGoal", () => {
  it("cuts calories for fat loss, surpluses for muscle gain, holds for maintenance", () => {
    const tdee = 2500;
    expect(calorieTargetForGoal(tdee, "lose_fat")).toBe(2000);
    expect(calorieTargetForGoal(tdee, "build_muscle")).toBe(2750);
    expect(calorieTargetForGoal(tdee, "maintain")).toBe(2500);
    expect(calorieTargetForGoal(tdee, "recomposition")).toBe(2375);
  });
});

describe("calculateMacros", () => {
  it("uses higher protein-per-kg for muscle gain than fat loss", () => {
    const gain = calculateMacros(3000, "build_muscle", 80);
    const loss = calculateMacros(2000, "lose_fat", 80);
    expect(gain.proteinG).toBeGreaterThan(loss.proteinG);
  });

  it("never returns negative carbs even at very low calorie targets", () => {
    const macros = calculateMacros(1200, "lose_fat", 100);
    expect(macros.carbsG).toBeGreaterThanOrEqual(0);
  });
});

describe("weeksToGoal / safeWeeklyRateKg", () => {
  it("computes weeks needed at a given weekly rate", () => {
    expect(weeksToGoal(90, 80, 0.5)).toBe(20);
  });

  it("returns Infinity for a zero or negative rate rather than dividing by zero", () => {
    expect(weeksToGoal(90, 80, 0)).toBe(Infinity);
  });

  it("caps the safe rate tighter for muscle gain than fat loss", () => {
    const gainRate = safeWeeklyRateKg(80, "build_muscle");
    const lossRate = safeWeeklyRateKg(80, "lose_fat");
    expect(gainRate).toBeLessThan(lossRate);
  });
});

describe("bodyMassIndex", () => {
  it("computes standard BMI", () => {
    expect(bodyMassIndex(70, 175)).toBeCloseTo(22.9, 1);
  });
});

describe("calculateReadinessScore", () => {
  it("scores higher when HRV/HR are better than baseline and sleep quality is high", () => {
    const good = calculateReadinessScore({
      hrvMs: 70,
      hrvBaselineMs: 55,
      restingHr: 50,
      restingHrBaseline: 58,
      sleepQualityPct: 95,
    });
    const bad = calculateReadinessScore({
      hrvMs: 35,
      hrvBaselineMs: 55,
      restingHr: 70,
      restingHrBaseline: 58,
      sleepQualityPct: 40,
    });
    expect(good).toBeGreaterThan(bad);
    expect(good).toBeLessThanOrEqual(100);
    expect(bad).toBeGreaterThanOrEqual(0);
  });
});

describe("recoveryStatus", () => {
  it("maps score ranges to green/yellow/red using the same thresholds as the RPE adjuster", () => {
    expect(recoveryStatus(90)).toBe("green");
    expect(recoveryStatus(70)).toBe("green");
    expect(recoveryStatus(60)).toBe("yellow");
    expect(recoveryStatus(40)).toBe("red");
  });

  it("defaults to yellow (cautious) when readiness is unknown rather than assuming green", () => {
    expect(recoveryStatus(null)).toBe("yellow");
  });
});
