import { describe, expect, it } from "vitest";
import { computeWorkoutOptimisation } from "./workoutOptimisation";
import type { WorkoutLog } from "./types";

function log(log_date: string, exercise_name: string, weight_kg: number): WorkoutLog {
  return { id: `${exercise_name}-${log_date}`, user_id: "u1", log_date, exercise_name, sets: 3, reps: 8, weight_kg, rpe: 7, notes: null, created_at: log_date };
}

describe("computeWorkoutOptimisation", () => {
  it("ignores exercises with fewer than 3 logged sessions — not enough history to call a trend", () => {
    const logs = [log("2026-01-01", "Squat", 100), log("2026-01-08", "Squat", 100)];
    const result = computeWorkoutOptimisation(logs);
    expect(result.exercises).toHaveLength(0);
  });

  it("flags an exercise as stalled when the last 3 sessions used the identical weight", () => {
    const logs = [log("2026-01-01", "Bench Press", 60), log("2026-01-08", "Bench Press", 60), log("2026-01-15", "Bench Press", 60)];
    const result = computeWorkoutOptimisation(logs);
    expect(result.exercises[0].stalled).toBe(true);
    expect(result.stalledCount).toBe(1);
    expect(result.exercises[0].suggestion).toMatch(/deload/i);
  });

  it("does not flag an exercise that increased weight across its last 3 sessions", () => {
    const logs = [log("2026-01-01", "Deadlift", 100), log("2026-01-08", "Deadlift", 105), log("2026-01-15", "Deadlift", 110)];
    const result = computeWorkoutOptimisation(logs);
    expect(result.exercises[0].stalled).toBe(false);
    expect(result.stalledCount).toBe(0);
  });

  it("scans every distinct exercise independently, not just the first one logged", () => {
    const logs = [
      log("2026-01-01", "Squat", 100), log("2026-01-08", "Squat", 100), log("2026-01-15", "Squat", 100),
      log("2026-01-01", "Row", 40), log("2026-01-08", "Row", 45), log("2026-01-15", "Row", 50),
    ];
    const result = computeWorkoutOptimisation(logs);
    expect(result.exercises).toHaveLength(2);
    expect(result.stalledCount).toBe(1);
  });
});
