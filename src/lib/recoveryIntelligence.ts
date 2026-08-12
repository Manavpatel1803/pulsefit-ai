import { localDateString } from "./date";
import type { BiometricEntry } from "./types";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function daysAgoString(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

const HRV_DROP_THRESHOLD_PCT = 15;
const RHR_RISE_THRESHOLD_PCT = 7;

export interface RecoveryIntelligence {
  hrvBaselineMs: number | null;
  hrvDeviationPct: number | null;
  rhrBaselineBpm: number | null;
  rhrDeviationPct: number | null;
  overreachingRisk: boolean;
  insight: string;
  hasEnoughData: boolean;
}

/**
 * Deterministic overreaching-risk read: compares the latest HRV/resting-HR reading
 * against the athlete's OWN trailing 30-day baseline, never a population norm. A
 * meaningful HRV drop paired with an elevated resting HR is the classic early signal
 * of accumulated fatigue — this is the whole point of "advanced" recovery intelligence
 * over Plus's single-day readiness score.
 */
export function computeRecoveryIntelligence(biometricEntries: BiometricEntry[]): RecoveryIntelligence {
  const sorted = [...biometricEntries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const latest = sorted[sorted.length - 1];
  const cutoff = daysAgoString(30);
  const baselineEntries = sorted.slice(0, -1).filter((e) => e.entry_date >= cutoff);

  const hrvBaselineMs = average(baselineEntries.filter((e) => e.hrv_ms !== null).map((e) => e.hrv_ms!));
  const rhrBaselineBpm = average(baselineEntries.filter((e) => e.resting_hr !== null).map((e) => e.resting_hr!));

  const hasEnoughData =
    !!latest &&
    baselineEntries.length >= 5 &&
    hrvBaselineMs !== null &&
    rhrBaselineBpm !== null &&
    latest.hrv_ms !== null &&
    latest.resting_hr !== null;

  if (!hasEnoughData) {
    return {
      hrvBaselineMs,
      hrvDeviationPct: null,
      rhrBaselineBpm,
      rhrDeviationPct: null,
      overreachingRisk: false,
      hasEnoughData: false,
      insight: "Sync your wearable for a few more days to unlock baseline-deviation analysis.",
    };
  }

  const hrvDeviationPct = Math.round(((latest.hrv_ms! - hrvBaselineMs!) / hrvBaselineMs!) * 1000) / 10;
  const rhrDeviationPct = Math.round(((latest.resting_hr! - rhrBaselineBpm!) / rhrBaselineBpm!) * 1000) / 10;
  const overreachingRisk = hrvDeviationPct <= -HRV_DROP_THRESHOLD_PCT && rhrDeviationPct >= RHR_RISE_THRESHOLD_PCT;

  let insight: string;
  if (overreachingRisk) {
    insight = `HRV is ${Math.abs(hrvDeviationPct)}% below your 30-day baseline and resting HR is ${rhrDeviationPct}% above it — signs of accumulated fatigue. Consider a lighter session or a rest day.`;
  } else if (hrvDeviationPct <= -HRV_DROP_THRESHOLD_PCT) {
    insight = `HRV is ${Math.abs(hrvDeviationPct)}% below your 30-day baseline. Worth watching over the next few days.`;
  } else {
    insight = "HRV and resting HR are within normal range of your 30-day baseline.";
  }

  return {
    hrvBaselineMs: Math.round(hrvBaselineMs!),
    hrvDeviationPct,
    rhrBaselineBpm: Math.round(rhrBaselineBpm!),
    rhrDeviationPct,
    overreachingRisk,
    insight,
    hasEnoughData: true,
  };
}
