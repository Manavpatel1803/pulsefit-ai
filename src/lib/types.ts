export type Tier = "free" | "plus" | "pro";

/** Ordering used to check "does this tier meet the minimum required tier". */
export const TIER_RANK: Record<Tier, number> = { free: 0, plus: 1, pro: 2 };

export function tierMeetsMinimum(tier: Tier, minimum: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[minimum];
}

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose_fat" | "maintain" | "build_muscle" | "recomposition";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type DietaryPreference = "none" | "vegetarian" | "vegan" | "pescatarian" | "keto";
export type InjuryFlag = "knee" | "shoulder" | "lower_back" | "wrist";
export type WorkoutTimePreference = "morning" | "afternoon" | "evening" | "flexible";
export type MotivationStyle = "solo" | "community" | "reminders" | "competition";

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  tier: Tier;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  experience_level: ExperienceLevel | null;
  equipment: string[];
  target_weight_kg: number | null;
  target_date: string | null;
  dietary_preference: DietaryPreference | null;
  injury_flags: InjuryFlag[];
  preferred_workout_time: WorkoutTimePreference | null;
  motivation_style: MotivationStyle | null;
  newsletter_subscribed: boolean;
  newsletter_subscribed_at: string | null;
  newsletter_prompted: boolean;
  onboarding_complete: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  log_date: string;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  notes: string | null;
  created_at: string;
}

export interface BiometricEntry {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  resting_hr: number | null;
  hrv_ms: number | null;
  sleep_hours: number | null;
  sleep_quality_pct: number | null;
  steps: number | null;
  readiness_score: number | null;
  soreness: number | null;
  energy: number | null;
  stress: number | null;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  log_date: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  difficulty: ExperienceLevel;
  cues: string[];
  category: "push" | "pull" | "legs" | "core" | "cardio" | "full_body";
}

export interface DietPlan {
  calorieTarget: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
  meals: { name: string; description: string; calories: number }[];
  notes: string;
}

export interface WorkoutPlanDay {
  day: string;
  focus: string;
  exercises: { name: string; sets: number; reps: string; rpe: number }[];
}

export interface WorkoutPlan {
  split: string;
  days: WorkoutPlanDay[];
  notes: string;
}

export interface GoalBlueprint {
  weeklyRateKg: number;
  weeksToGoal: number;
  calorieTarget: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
  milestones: { week: number; weightKg: number }[];
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export type RecoveryStatus = "green" | "yellow" | "red";

export type TrendDirection = "up" | "down" | "flat";

/**
 * Deterministic snapshot of a user's current fitness state, computed from real logged
 * data (never invented by the AI — see lib/fitnessState.ts). AI services interpret this;
 * they never calculate it.
 */
export interface FitnessState {
  weight: {
    current: number | null;
    trend: TrendDirection;
    changeKg4wk: number | null;
  };
  training: {
    sessionsLast7d: number;
    sessionsLast28d: number;
    consistencyPct: number; // sessionsLast28d against an expected cadence
    volumeLast7d: number; // sum(sets * reps * weight_kg)
    volumeTrend: TrendDirection;
    avgRpeLast7d: number | null;
  };
  nutrition: {
    loggedDaysLast7d: number;
    avgCalories: number | null;
    avgProteinG: number | null;
    calorieTarget: number | null;
    proteinTargetG: number | null;
    adherencePct: number | null; // logged days with calories within 15% of target
  };
  recovery: {
    readinessScore: number | null;
    status: RecoveryStatus;
    sleepAvgHours: number | null;
    sleepTrend: TrendDirection;
    avgSoreness: number | null;
    avgEnergy: number | null;
    avgStress: number | null;
  };
  goal: {
    targetWeightKg: number | null;
    weeksToGoal: number | null;
    onTrack: boolean | null;
  };
  dataCompleteness: {
    hasWorkoutLogs: boolean;
    hasNutritionLogs: boolean;
    hasBiometricEntries: boolean;
  };
}

export interface WeeklyReviewStats {
  weekStart: string;
  trainingSessions: number;
  trainingVolume: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgSleepHours: number | null;
  avgReadiness: number | null;
  weightChangeKg: number | null;
}

export interface WeeklyReviewSummary {
  wentWell: string;
  biggestLimiter: string;
  nextWeekPriority: string;
  longTermComparison?: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;
  stats: WeeklyReviewStats;
  summary: WeeklyReviewSummary;
  created_at: string;
}

/** Deterministic 8-week trend read, including plateau detection. Plus tier. */
export interface ProgressAnalysis {
  weightChangeKg8wk: number | null;
  weightTrend8wk: TrendDirection;
  trainingVolumeTrend8wk: TrendDirection;
  plateauDetected: boolean;
  plateauWeeks: number;
  headline: string;
  hasEnoughData: boolean;
}

/** A saved, named goal snapshot. Pro tier — activating one mirrors its fields onto profiles. */
export interface FitnessProgram {
  id: string;
  user_id: string;
  name: string;
  goal: Goal;
  target_weight_kg: number | null;
  target_date: string | null;
  is_active: boolean;
  created_at: string;
}

/** Deterministic next-session suggestion for one exercise, from the athlete's own log history. Plus tier. */
export interface ProgressionSuggestion {
  exerciseName: string;
  lastLoggedDate: string;
  lastWeightKg: number | null;
  lastReps: number | null;
  lastRpe: number | null;
  suggestion: string;
  suggestedWeightKg: number | null;
}

/** Structured output the AI Decision Engine must produce — validated before use. */
export interface FitnessDecision {
  priority: string;
  recommendation: string;
  reason: string;
  confidence: "low" | "medium" | "high";
  actions: string[];
}

export type PostType =
  | "progress_update"
  | "workout_achievement"
  | "question"
  | "nutrition_experience"
  | "milestone"
  | "tip";

export type MilestoneType = "workout" | "strength" | "consistency" | "goal";

export interface CommunityPost {
  id: string;
  user_id: string;
  group_id: string | null;
  post_type: PostType;
  milestone_type: MilestoneType | null;
  content: string;
  created_at: string;
  author_name?: string | null;
  reaction_count?: number;
  comment_count?: number;
  reacted_by_me?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string | null;
}

export type ChallengeType = "steps" | "workout_count";

export interface Challenge {
  id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  challenge_type: ChallengeType;
  goal_value: number;
  start_date: string;
  end_date: string;
  created_at: string;
  min_tier: Tier;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  progress_value: number;
  completed: boolean;
  joined_at: string;
  author_name?: string | null;
}

export type GroupCategory =
  | "weight_loss"
  | "muscle_building"
  | "running"
  | "strength"
  | "beginners"
  | "home_workouts";

export interface FitnessGroup {
  id: string;
  creator_id: string | null;
  name: string;
  description: string | null;
  category: GroupCategory;
  created_at: string;
  member_count?: number;
}
