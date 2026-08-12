import type { FitnessDecision, FitnessState } from "./types";

export interface DeterministicPriority {
  priority: string;
  actions: string[];
}

/**
 * Deterministic "what matters most today" picker. This is the backbone the AI Decision
 * Engine (Phase 4) explains and lightly enriches — it never overrides this logic. Kept
 * separate from lib/auraCoachEngine.ts's per-session RPE adjuster: this operates on the
 * full weekly FitnessState, not a single planned lift.
 */
export function pickPriority(state: FitnessState): DeterministicPriority {
  if (!state.dataCompleteness.hasWorkoutLogs && !state.dataCompleteness.hasBiometricEntries) {
    return {
      priority: "Log your first workout or check-in to get a real picture of your fitness state.",
      actions: ["Log a workout set", "Do a recovery check-in"],
    };
  }

  if (state.recovery.status === "red") {
    return {
      priority: "Recovery day — your readiness signals say back off today.",
      actions: ["Light walk or mobility work", "Prioritize sleep tonight", "Skip high-intensity training"],
    };
  }

  if (state.recovery.status === "yellow") {
    return {
      priority: "Train today, but reduce intensity — recovery is dipping.",
      actions: ["Cut planned load ~10%", "Leave 1-2 reps in reserve"],
    };
  }

  if (state.nutrition.adherencePct !== null && state.nutrition.adherencePct < 50) {
    return {
      priority: "Prioritize hitting your protein and calorie targets today.",
      actions: [`Aim for ${state.nutrition.proteinTargetG ?? "your"} g protein`, "Log meals as you go"],
    };
  }

  if (state.training.consistencyPct < 50) {
    return {
      priority: "Consistency is slipping — get a session in today.",
      actions: ["Train today, even a shorter session counts"],
    };
  }

  if (state.training.sessionsLast7d === 0) {
    return {
      priority: "No sessions logged this week yet — today's a good day to start.",
      actions: ["Log today's workout"],
    };
  }

  return {
    priority: "You're on track — stick to your plan today.",
    actions: ["Train as planned", "Log the session when done"],
  };
}

/**
 * Asks the AI Decision Engine to explain the deterministic priority (Plus+ only).
 * Returns null on any failure — callers must fall back to the deterministic priority
 * alone rather than breaking. Never throws.
 */
export async function fetchAIDecision(
  fitnessState: FitnessState,
  deterministic: DeterministicPriority,
  goal: string | null,
  accessToken: string
): Promise<FitnessDecision | null> {
  try {
    const res = await fetch("/api/ai/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ fitnessState, deterministic, goal }),
    });
    if (!res.ok) return null;
    return (await res.json()) as FitnessDecision;
  } catch {
    return null;
  }
}
