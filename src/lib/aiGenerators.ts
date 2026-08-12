import type { DietPlan, WorkoutPlan, UserProfile } from "./types";

export class AIGenerationError extends Error {}

async function postJson<T>(url: string, accessToken: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new AIGenerationError(data.error ?? `Request to ${url} failed (${res.status}).`);
  }
  return data as T;
}

export function generateDietPlan(
  profile: Pick<UserProfile, "goal" | "activity_level" | "equipment">,
  calorieTarget: number,
  macros: { proteinG: number; carbsG: number; fatG: number },
  accessToken: string
): Promise<DietPlan> {
  return postJson<DietPlan>("/api/ai/plan", accessToken, { type: "diet", profile, calorieTarget, macros });
}

export function generateWorkoutPlan(
  profile: Pick<UserProfile, "goal" | "experience_level" | "equipment">,
  daysPerWeek: number,
  accessToken: string
): Promise<WorkoutPlan> {
  return postJson<WorkoutPlan>("/api/ai/plan", accessToken, { type: "workout", profile, daysPerWeek });
}
