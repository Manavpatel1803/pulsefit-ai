import { describe, expect, it } from "vitest";
import { pickPriority } from "./decisionEngine";
import type { FitnessState } from "./types";

function baseState(overrides: Partial<FitnessState> = {}): FitnessState {
  return {
    weight: { current: 80, trend: "flat", changeKg4wk: 0 },
    training: { sessionsLast7d: 3, sessionsLast28d: 12, consistencyPct: 75, volumeLast7d: 5000, volumeTrend: "flat", avgRpeLast7d: 7 },
    nutrition: { loggedDaysLast7d: 5, avgCalories: 2400, avgProteinG: 150, calorieTarget: 2400, proteinTargetG: 150, adherencePct: 90 },
    recovery: { readinessScore: 80, status: "green", sleepAvgHours: 7.5, sleepTrend: "flat", avgSoreness: 2, avgEnergy: 3, avgStress: 2 },
    goal: { targetWeightKg: 78, weeksToGoal: 10, onTrack: true },
    dataCompleteness: { hasWorkoutLogs: true, hasNutritionLogs: true, hasBiometricEntries: true },
    ...overrides,
  };
}

describe("pickPriority", () => {
  it("tells a brand-new user to log data first when nothing exists yet", () => {
    const state = baseState({ dataCompleteness: { hasWorkoutLogs: false, hasNutritionLogs: false, hasBiometricEntries: false } });
    expect(pickPriority(state).priority).toMatch(/log your first/i);
  });

  it("prioritizes recovery over everything else when status is red", () => {
    const state = baseState({
      recovery: { readinessScore: 30, status: "red", sleepAvgHours: 5, sleepTrend: "down", avgSoreness: 4, avgEnergy: 2, avgStress: 4 },
      nutrition: { ...baseState().nutrition, adherencePct: 10 }, // even with a worse nutrition signal present
    });
    expect(pickPriority(state).priority).toMatch(/recovery day/i);
  });

  it("suggests reduced intensity (not full rest) when recovery is yellow", () => {
    const state = baseState({ recovery: { ...baseState().recovery, status: "yellow" } });
    expect(pickPriority(state).priority).toMatch(/reduce intensity/i);
  });

  it("flags nutrition when adherence is low and recovery is fine", () => {
    const state = baseState({ nutrition: { ...baseState().nutrition, adherencePct: 20 } });
    expect(pickPriority(state).priority).toMatch(/protein and calorie/i);
  });

  it("flags consistency when 28-day training frequency is low", () => {
    const state = baseState({ training: { ...baseState().training, consistencyPct: 30 } });
    expect(pickPriority(state).priority).toMatch(/consistency is slipping/i);
  });

  it("flags a quiet week specifically when 28-day consistency is fine but this week had zero sessions", () => {
    // Real scenario: trained plenty across weeks 2-4 (consistencyPct >= 50) but has
    // taken the last 7 days off entirely — this branch is reachable and distinct from
    // the low-consistency branch above.
    const state = baseState({
      training: { sessionsLast7d: 0, sessionsLast28d: 12, consistencyPct: 75, volumeLast7d: 0, volumeTrend: "down", avgRpeLast7d: null },
    });
    expect(pickPriority(state).priority).toMatch(/no sessions logged this week/i);
  });

  it("says the user is on track when everything looks healthy", () => {
    expect(pickPriority(baseState()).priority).toMatch(/on track/i);
  });
});
