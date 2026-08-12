import { describe, expect, it } from "vitest";
import { computeRecoveryIntelligence } from "./recoveryIntelligence";
import { localDateString } from "./date";
import type { BiometricEntry } from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

function entry(entry_date: string, hrv_ms: number | null, resting_hr: number | null): BiometricEntry {
  return {
    id: entry_date,
    user_id: "u1",
    entry_date,
    weight_kg: null,
    body_fat_pct: null,
    muscle_mass_kg: null,
    resting_hr,
    hrv_ms,
    sleep_hours: null,
    sleep_quality_pct: null,
    steps: null,
    readiness_score: null,
    soreness: null,
    energy: null,
    stress: null,
  };
}

describe("computeRecoveryIntelligence", () => {
  it("reports insufficient data with a thin history", () => {
    const result = computeRecoveryIntelligence([entry(daysAgo(0), 55, 58)]);
    expect(result.hasEnoughData).toBe(false);
    expect(result.overreachingRisk).toBe(false);
  });

  it("flags overreaching risk when HRV drops well below baseline and resting HR rises", () => {
    const baseline = Array.from({ length: 10 }, (_, i) => entry(daysAgo(i + 1), 60, 55));
    const today = entry(daysAgo(0), 45, 62); // HRV -25%, RHR +12.7%
    const result = computeRecoveryIntelligence([...baseline, today]);
    expect(result.hasEnoughData).toBe(true);
    expect(result.overreachingRisk).toBe(true);
    expect(result.insight).toMatch(/fatigue/i);
  });

  it("does not flag risk when today's readings are within normal range of baseline", () => {
    const baseline = Array.from({ length: 10 }, (_, i) => entry(daysAgo(i + 1), 60, 55));
    const today = entry(daysAgo(0), 59, 56);
    const result = computeRecoveryIntelligence([...baseline, today]);
    expect(result.overreachingRisk).toBe(false);
  });

  it("uses the athlete's own trailing baseline, never a fixed population number", () => {
    // A naturally low-HRV athlete (baseline ~40ms) reading 40ms today should NOT be flagged,
    // proving the comparison is against their own history, not an absolute threshold.
    const baseline = Array.from({ length: 10 }, (_, i) => entry(daysAgo(i + 1), 40, 50));
    const today = entry(daysAgo(0), 40, 50);
    const result = computeRecoveryIntelligence([...baseline, today]);
    expect(result.overreachingRisk).toBe(false);
  });
});
