import { describe, expect, it } from "vitest";
import {
  challengeStatusLabel,
  computeAdvancedChallengeStats,
  computeChallengePace,
  computeChallengeProgress,
  computePersonalChallengeStats,
  isChallengeComplete,
} from "./community";
import { localDateString } from "./date";
import type { BiometricEntry, Challenge, ChallengeParticipant, WorkoutLog } from "./types";

function participant(user_id: string, progress_value: number, completed: boolean, challenge_id = "c1"): ChallengeParticipant {
  return { id: `${user_id}-${challenge_id}-${progress_value}`, challenge_id, user_id, progress_value, completed, joined_at: "2026-01-01T00:00:00Z" };
}

function challenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: "c1",
    creator_id: null,
    title: "Test challenge",
    description: null,
    challenge_type: "workout_count",
    goal_value: 20,
    start_date: "2000-01-01",
    end_date: "2099-01-01",
    created_at: "2026-01-01T00:00:00Z",
    min_tier: "free",
    ...overrides,
  };
}

function workoutLog(log_date: string): WorkoutLog {
  return { id: log_date, user_id: "u1", log_date, exercise_name: "Squat", sets: 3, reps: 5, weight_kg: 100, rpe: 8, notes: null, created_at: log_date };
}

function biometric(entry_date: string, steps: number): BiometricEntry {
  return {
    id: entry_date,
    user_id: "u1",
    entry_date,
    weight_kg: null,
    body_fat_pct: null,
    muscle_mass_kg: null,
    resting_hr: null,
    hrv_ms: null,
    sleep_hours: null,
    sleep_quality_pct: null,
    steps,
    readiness_score: null,
    soreness: null,
    energy: null,
    stress: null,
  };
}

describe("computeChallengeProgress", () => {
  const stepsChallenge: Pick<Challenge, "challenge_type" | "start_date" | "end_date"> = {
    challenge_type: "steps",
    start_date: "2026-01-01",
    end_date: "2026-01-31",
  };

  it("sums steps only within the challenge's date range", () => {
    const entries = [biometric("2025-12-31", 9000), biometric("2026-01-05", 8000), biometric("2026-01-10", 12000), biometric("2026-02-01", 5000)];
    expect(computeChallengeProgress(stepsChallenge, [], entries)).toBe(20000);
  });

  it("counts distinct training days, not total logged sets, for workout_count challenges", () => {
    const consistencyChallenge: Pick<Challenge, "challenge_type" | "start_date" | "end_date"> = {
      challenge_type: "workout_count",
      start_date: "2026-01-01",
      end_date: "2026-01-31",
    };
    // 3 sets logged on the same day should count as 1 session, not 3
    const logs = [workoutLog("2026-01-05"), workoutLog("2026-01-05"), workoutLog("2026-01-05"), workoutLog("2026-01-10")];
    expect(computeChallengeProgress(consistencyChallenge, logs, [])).toBe(2);
  });

  it("never uses body-weight data — only steps or session counts are ever read", () => {
    // A biometric entry with weight_kg set but steps null must contribute 0, proving
    // the function can't accidentally leak a body metric into a public leaderboard.
    const entries = [{ ...biometric("2026-01-05", 0), steps: null, weight_kg: 65 }];
    expect(computeChallengeProgress(stepsChallenge, [], entries)).toBe(0);
  });
});

describe("isChallengeComplete", () => {
  it("is complete once progress meets or exceeds the goal", () => {
    expect(isChallengeComplete({ goal_value: 20 }, 20)).toBe(true);
    expect(isChallengeComplete({ goal_value: 20 }, 25)).toBe(true);
    expect(isChallengeComplete({ goal_value: 20 }, 19)).toBe(false);
  });
});

describe("challengeStatusLabel", () => {
  it("labels a challenge starting in the future as upcoming", () => {
    const future = { start_date: "2099-01-01", end_date: "2099-01-31" };
    expect(challengeStatusLabel(future)).toBe("upcoming");
  });

  it("labels a challenge that already ended as ended", () => {
    const past = { start_date: "2000-01-01", end_date: "2000-01-31" };
    expect(challengeStatusLabel(past)).toBe("ended");
  });

  it("labels a challenge spanning today as active", () => {
    const today = localDateString();
    const spanning = { start_date: "2000-01-01", end_date: "2099-01-01" };
    expect(challengeStatusLabel(spanning)).toBe("active");
    expect(today >= spanning.start_date && today <= spanning.end_date).toBe(true);
  });
});

describe("computePersonalChallengeStats", () => {
  it("counts only the given user's own participation rows, not everyone's", () => {
    const rows = [participant("me", 20, true), participant("me", 5, false), participant("someone-else", 20, true)];
    expect(computePersonalChallengeStats("me", rows)).toEqual({ joined: 2, completed: 1, completionRatePct: 50 });
  });

  it("returns a null completion rate rather than dividing by zero when nothing was joined", () => {
    expect(computePersonalChallengeStats("me", [])).toEqual({ joined: 0, completed: 0, completionRatePct: null });
  });
});

describe("computeChallengePace", () => {
  it("flags on-pace when progress share meets or exceeds elapsed-time share", () => {
    const today = localDateString();
    const challenge = { start_date: today, end_date: today, goal_value: 10 };
    const { onPace } = computeChallengePace(challenge, 10);
    expect(onPace).toBe(true);
  });

  it("flags behind-pace when progress lags well behind elapsed time", () => {
    const start = new Date();
    start.setDate(start.getDate() - 9);
    const end = new Date();
    end.setDate(end.getDate() + 1);
    const challenge = { start_date: localDateString(start), end_date: localDateString(end), goal_value: 100 };
    // ~90% of the window elapsed, only 5% of the goal reached
    const { onPace } = computeChallengePace(challenge, 5);
    expect(onPace).toBe(false);
  });
});

describe("computeAdvancedChallengeStats", () => {
  it("breaks down completed-vs-joined by challenge type, using only the given user's rows", () => {
    const challenges = [
      challenge({ id: "steps-1", challenge_type: "steps" }),
      challenge({ id: "workout-1", challenge_type: "workout_count" }),
    ];
    const rows = [
      participant("me", 300000, true, "steps-1"),
      participant("me", 5, false, "workout-1"),
      participant("someone-else", 300000, true, "steps-1"),
    ];
    const stats = computeAdvancedChallengeStats("me", rows, challenges);
    expect(stats.byType.steps).toEqual({ joined: 1, completed: 1 });
    expect(stats.byType.workout_count).toEqual({ joined: 1, completed: 0 });
  });

  it("counts an incomplete row toward activeCount only while the challenge is currently active", () => {
    const active = challenge({ id: "active-1", start_date: "2000-01-01", end_date: "2099-01-01" });
    const ended = challenge({ id: "ended-1", start_date: "2000-01-01", end_date: "2000-01-31" });
    const rows = [participant("me", 5, false, "active-1"), participant("me", 5, false, "ended-1")];
    const stats = computeAdvancedChallengeStats("me", rows, [active, ended]);
    expect(stats.activeCount).toBe(1);
  });
});
