import type { BiometricEntry, Challenge, ChallengeParticipant, ChallengeType, WorkoutLog } from "./types";
import { localDateString } from "./date";
import { supabase } from "./supabase";

export interface DisplayName {
  full_name: string | null;
  avatar_url: string | null;
}

/** Batch-fetches safe public display info (name/avatar only) via the RLS-bypassing RPC. */
export async function fetchDisplayNames(userIds: string[]): Promise<Map<string, DisplayName>> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_display_names", { uids: unique });
  if (error || !data) return new Map();
  return new Map(
    (data as { id: string; full_name: string | null; avatar_url: string | null }[]).map((row) => [
      row.id,
      { full_name: row.full_name, avatar_url: row.avatar_url },
    ])
  );
}

/**
 * Deterministic challenge progress, computed from the same logged data FitnessState
 * uses — never self-reported by typing in a number. Only "healthy" metrics are ever
 * used here (steps, session count) — never weight or other body metrics, per the
 * leaderboard privacy rule.
 */
export function computeChallengeProgress(
  challenge: Pick<Challenge, "challenge_type" | "start_date" | "end_date">,
  workoutLogs: WorkoutLog[],
  biometricEntries: BiometricEntry[]
): number {
  const inRange = (date: string) => date >= challenge.start_date && date <= challenge.end_date;

  if (challenge.challenge_type === "steps") {
    return biometricEntries
      .filter((e) => e.steps !== null && inRange(e.entry_date))
      .reduce((sum, e) => sum + (e.steps ?? 0), 0);
  }

  // workout_count: distinct training days in range
  const days = new Set(workoutLogs.filter((l) => inRange(l.log_date)).map((l) => l.log_date));
  return days.size;
}

export function isChallengeComplete(challenge: Pick<Challenge, "goal_value">, progressValue: number): boolean {
  return progressValue >= challenge.goal_value;
}

export function challengeStatusLabel(challenge: Pick<Challenge, "start_date" | "end_date">): "upcoming" | "active" | "ended" {
  const today = localDateString();
  if (today < challenge.start_date) return "upcoming";
  if (today > challenge.end_date) return "ended";
  return "active";
}

export interface PersonalChallengeStats {
  joined: number;
  completed: number;
  completionRatePct: number | null;
}

/** Deterministic personal challenge history, computed from the participant rows already loaded. */
export function computePersonalChallengeStats(userId: string, participants: ChallengeParticipant[]): PersonalChallengeStats {
  const mine = participants.filter((p) => p.user_id === userId);
  const completed = mine.filter((p) => p.completed).length;
  return {
    joined: mine.length,
    completed,
    completionRatePct: mine.length > 0 ? Math.round((completed / mine.length) * 100) : null,
  };
}

/** Days remaining and whether current progress pace is on track to hit the goal by end_date. */
export function computeChallengePace(
  challenge: Pick<Challenge, "start_date" | "end_date" | "goal_value">,
  progressValue: number
): { daysRemaining: number; onPace: boolean | null } {
  const today = localDateString();
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  const now = new Date(today);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const daysElapsed = Math.min(totalDays, Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000) + 1));
  const daysRemaining = Math.max(0, Math.round((end.getTime() - now.getTime()) / 86400000));

  if (daysElapsed === 0 || challenge.goal_value === 0) return { daysRemaining, onPace: null };
  const expectedPct = daysElapsed / totalDays;
  const actualPct = progressValue / challenge.goal_value;
  return { daysRemaining, onPace: actualPct >= expectedPct - 0.05 };
}

export interface AdvancedChallengeStats {
  byType: Record<ChallengeType, { joined: number; completed: number }>;
  activeCount: number;
}

/** Pro: "Advanced challenge analytics" — breakdown by challenge type, not just a single completion rate. */
export function computeAdvancedChallengeStats(
  userId: string,
  participants: ChallengeParticipant[],
  challenges: Challenge[]
): AdvancedChallengeStats {
  const challengeById = new Map(challenges.map((c) => [c.id, c]));
  const byType: Record<ChallengeType, { joined: number; completed: number }> = {
    steps: { joined: 0, completed: 0 },
    workout_count: { joined: 0, completed: 0 },
  };
  let activeCount = 0;

  for (const p of participants.filter((row) => row.user_id === userId)) {
    const challenge = challengeById.get(p.challenge_id);
    if (!challenge) continue;
    byType[challenge.challenge_type].joined++;
    if (p.completed) {
      byType[challenge.challenge_type].completed++;
    } else if (challengeStatusLabel(challenge) === "active") {
      activeCount++;
    }
  }

  return { byType, activeCount };
}
