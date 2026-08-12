import { tierMeetsMinimum, type Tier } from "./types";

/**
 * Single source of truth for which tier unlocks which capability.
 * Add new features here rather than hardcoding tier literals at call sites.
 */
export const FEATURE_TIER = {
  // Free
  fitness_profile: "free",
  weight_tracking: "free",
  basic_workout_tracking: "free",
  basic_nutrition_tracking: "free",
  basic_progress_charts: "free",
  today_dashboard: "free",
  basic_ai_coach: "free",
  gym_streak: "free",
  community_browse: "free",
  community_react_comment: "free",
  challenge_join: "free",
  progress_sharing: "free",

  // Plus
  goal_blueprint: "plus",
  adaptive_workouts: "plus",
  nutrition_recommendations: "plus",
  recovery_intelligence: "plus",
  weekly_ai_review: "plus",
  goal_forecasting: "plus",
  progress_analysis: "plus",
  context_aware_coach: "plus",
  community_post: "plus",
  group_join: "plus",
  workout_progression: "plus",
  challenge_stats: "plus",

  // Pro
  advanced_workout_optimisation: "pro",
  advanced_nutrition_intelligence: "pro",
  advanced_recovery_intelligence: "pro",
  biometric_dashboard: "pro",
  wearable_integration: "pro",
  predictive_recommendations: "pro",
  advanced_ai_coach: "pro",
  advanced_reports: "pro",
  advanced_exports: "pro",
  multiple_programs: "pro",
  advanced_challenge_analytics: "pro",
  advanced_leaderboard: "pro",
  challenge_create: "pro",
  group_create: "pro",
} as const satisfies Record<string, Tier>;

export type Feature = keyof typeof FEATURE_TIER;

export function canAccess(tier: Tier, feature: Feature): boolean {
  return tierMeetsMinimum(tier, FEATURE_TIER[feature]);
}

export function requiredTierFor(feature: Feature): Tier {
  return FEATURE_TIER[feature];
}
