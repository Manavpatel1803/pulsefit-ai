import { describe, expect, it } from "vitest";
import { suggestNextProgression } from "./workoutProgression";
import type { WorkoutLog } from "./types";

function log(log_date: string, exercise_name: string, weight_kg: number, rpe: number | null): WorkoutLog {
  return { id: `${exercise_name}-${log_date}`, user_id: "u1", log_date, exercise_name, sets: 3, reps: 8, weight_kg, rpe, notes: null, created_at: log_date };
}

describe("suggestNextProgression", () => {
  it("returns null when the athlete has never logged this exercise", () => {
    expect(suggestNextProgression([log("2026-01-01", "Bench Press", 60, 7)], "Squat")).toBeNull();
  });

  it("suggests adding load when the last set was easy (RPE <= 6)", () => {
    const result = suggestNextProgression([log("2026-01-01", "Squat", 100, 6)], "Squat");
    expect(result?.suggestedWeightKg).toBeGreaterThan(100);
    expect(result?.suggestion).toMatch(/easy/i);
  });

  it("suggests holding or reducing load when the last set was near max effort (RPE >= 9)", () => {
    const result = suggestNextProgression([log("2026-01-01", "Squat", 100, 9)], "Squat");
    expect(result?.suggestedWeightKg).toBeLessThan(100);
  });

  it("suggests holding weight and adding a rep when RPE was in the target range", () => {
    const result = suggestNextProgression([log("2026-01-01", "Squat", 100, 7)], "Squat");
    expect(result?.suggestedWeightKg).toBe(100);
    expect(result?.suggestion).toMatch(/extra rep/i);
  });

  it("uses only the most recently logged set for that exercise, not the oldest", () => {
    const logs = [log("2026-01-01", "Squat", 90, 9), log("2026-01-10", "Squat", 100, 6)];
    const result = suggestNextProgression(logs, "Squat");
    expect(result?.lastLoggedDate).toBe("2026-01-10");
    expect(result?.lastWeightKg).toBe(100);
  });
});
