import type { CoachMessage, FitnessState, InjuryFlag } from "./types";

export type ReadinessTier = "green" | "yellow" | "red";

export interface LoadAdjustment {
  tier: ReadinessTier;
  adjustedRpe: number;
  loadChangePct: number;
  recommendation: string;
}

/** Deterministic RPE/load auto-adjuster driven by today's readiness score. */
export function adjustLoadForReadiness(readinessScore: number, plannedRpe: number): LoadAdjustment {
  if (readinessScore >= 85) {
    return {
      tier: "green",
      adjustedRpe: Math.min(plannedRpe + 0.5, 10),
      loadChangePct: 5,
      recommendation: "Readiness is high — cleared to push intensity slightly above plan today.",
    };
  }
  if (readinessScore >= 70) {
    return {
      tier: "green",
      adjustedRpe: plannedRpe,
      loadChangePct: 0,
      recommendation: "Readiness is solid. Train as planned.",
    };
  }
  if (readinessScore >= 55) {
    return {
      tier: "yellow",
      adjustedRpe: Math.max(plannedRpe - 1, 5),
      loadChangePct: -10,
      recommendation: "Readiness is dipping. Drop load ~10% and keep 1-2 reps in reserve.",
    };
  }
  return {
    tier: "red",
    adjustedRpe: Math.max(plannedRpe - 2, 4),
    loadChangePct: -20,
    recommendation: "Readiness is low. Cut load ~20%, prioritize technique, or swap to active recovery.",
  };
}

const REGRESSIONS: Record<InjuryFlag, { pattern: RegExp; alternative: string }[]> = {
  knee: [
    { pattern: /squat/i, alternative: "Box squat (higher box) or leg press with limited depth" },
    { pattern: /lunge/i, alternative: "Static split squat with reduced range of motion" },
  ],
  shoulder: [
    { pattern: /bench press/i, alternative: "Floor press or neutral-grip dumbbell press" },
    { pattern: /overhead press/i, alternative: "Landmine press" },
  ],
  lower_back: [
    { pattern: /deadlift/i, alternative: "Trap bar deadlift or hip thrust" },
    { pattern: /row/i, alternative: "Chest-supported row" },
  ],
  wrist: [
    { pattern: /push[- ]?up/i, alternative: "Push-up on parallettes or dumbbell floor press" },
  ],
};

/** Returns a suggested regression for an exercise given an injury flag, or null if none applies. */
export function getRegression(exerciseName: string, flag: InjuryFlag): string | null {
  const rules = REGRESSIONS[flag];
  const match = rules.find((rule) => rule.pattern.test(exerciseName));
  return match?.alternative ?? null;
}

export class CoachChatError extends Error {}

export async function sendCoachMessage(
  messages: Pick<CoachMessage, "role" | "content">[],
  goal: string | null,
  fitnessState: FitnessState | null,
  accessToken: string
): Promise<string> {
  const res = await fetch("/api/ai/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messages, goal, fitnessState }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new CoachChatError(data.error ?? "AuraCoach request failed.");
  }
  return data.reply as string;
}
