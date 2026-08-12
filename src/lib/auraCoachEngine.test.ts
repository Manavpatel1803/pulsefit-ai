import { describe, expect, it } from "vitest";
import { adjustLoadForReadiness, getRegression } from "./auraCoachEngine";

describe("adjustLoadForReadiness", () => {
  it("clears the athlete to push slightly above plan at very high readiness", () => {
    const result = adjustLoadForReadiness(90, 8);
    expect(result.tier).toBe("green");
    expect(result.loadChangePct).toBeGreaterThan(0);
    expect(result.adjustedRpe).toBeGreaterThanOrEqual(8);
  });

  it("holds the plan as-is in the solid-but-not-exceptional range", () => {
    const result = adjustLoadForReadiness(75, 8);
    expect(result.tier).toBe("green");
    expect(result.loadChangePct).toBe(0);
    expect(result.adjustedRpe).toBe(8);
  });

  it("cuts load moderately when readiness is dipping", () => {
    const result = adjustLoadForReadiness(60, 8);
    expect(result.tier).toBe("yellow");
    expect(result.loadChangePct).toBeLessThan(0);
    expect(result.adjustedRpe).toBeLessThan(8);
  });

  it("cuts load more aggressively when readiness is low, but never below a sane RPE floor", () => {
    const result = adjustLoadForReadiness(30, 8);
    expect(result.tier).toBe("red");
    expect(result.loadChangePct).toBeLessThan(-10);
    expect(result.adjustedRpe).toBeGreaterThanOrEqual(4);
  });

  it("never recommends an adjusted RPE above 10, even from a high planned RPE", () => {
    const result = adjustLoadForReadiness(95, 10);
    expect(result.adjustedRpe).toBeLessThanOrEqual(10);
  });
});

describe("getRegression", () => {
  it("suggests a knee-friendly squat alternative for a knee flag", () => {
    expect(getRegression("Barbell Back Squat", "knee")).toMatch(/box squat|leg press/i);
  });

  it("suggests a shoulder-friendly press alternative for bench press under a shoulder flag", () => {
    expect(getRegression("Barbell Bench Press", "shoulder")).toMatch(/floor press|dumbbell press/i);
  });

  it("returns null when the exercise doesn't stress the flagged joint", () => {
    expect(getRegression("Barbell Back Squat", "wrist")).toBeNull();
  });

  it("matches case-insensitively and against exercise name substrings", () => {
    expect(getRegression("Conventional Deadlift", "lower_back")).toMatch(/trap bar|hip thrust/i);
  });
});
