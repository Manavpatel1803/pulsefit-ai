"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { BiometricEntry, FitnessState, NutritionLog, UserProfile, WorkoutLog } from "@/lib/types";
import { calculateReadinessScore } from "@/lib/calculations";
import { calculateFitnessState } from "@/lib/fitnessState";
import { getActiveWearableProvider } from "@/lib/wearables";
import { localDateString } from "@/lib/date";

const EMPTY_WORKOUT_LOGS: WorkoutLog[] = [];
const EMPTY_BIOMETRIC_ENTRIES: BiometricEntry[] = [];
const EMPTY_NUTRITION_LOGS: NutritionLog[] = [];

interface AppContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  profileLoading: boolean;

  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: "google" | "facebook" | "apple") => Promise<void>;
  signOut: () => Promise<void>;

  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;

  workoutLogs: WorkoutLog[];
  addWorkoutLog: (
    log: Pick<WorkoutLog, "exercise_name" | "sets" | "reps" | "weight_kg" | "rpe" | "notes"> & {
      log_date?: string;
    }
  ) => Promise<void>;

  biometricEntries: BiometricEntry[];
  latestBiometric: BiometricEntry | null;
  simulateWearableSync: () => Promise<BiometricEntry>;
  logBodyComposition: (entry: {
    weight_kg: number;
    body_fat_pct: number | null;
    muscle_mass_kg: number | null;
  }) => Promise<void>;
  logRecoveryCheckin: (entry: { soreness: number; energy: number; stress: number }) => Promise<void>;

  nutritionLogs: NutritionLog[];
  addNutritionLog: (entry: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    notes?: string | null;
  }) => Promise<void>;

  fitnessState: FitnessState | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [biometricEntries, setBiometricEntries] = useState<BiometricEntry[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);

  const user = session?.user ?? null;

  const fetchProfile = useCallback(
    async (
      userId: string,
      metadata?: { full_name?: string | null; avatar_url?: string | null }
    ): Promise<UserProfile | null> => {
      for (const attempt of [0, 600]) {
        if (attempt) await new Promise((r) => setTimeout(r, attempt));
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (data) return data as UserProfile;
        if (error) return null;
      }
      // Fallback if the on-signup trigger didn't create a row (e.g. schema applied after the user signed up).
      const { data: inserted } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          full_name: metadata?.full_name ?? null,
          avatar_url: metadata?.avatar_url ?? null,
        })
        .select()
        .maybeSingle();
      return (inserted as UserProfile) ?? null;
    },
    []
  );

  const loadProfile = useCallback(
    async (userId: string, metadata?: { full_name?: string | null; avatar_url?: string | null }) => {
      setProfileLoading(true);
      const data = await fetchProfile(userId, metadata);
      setProfile(data);
      setProfileLoading(false);
    },
    [fetchProfile]
  );

  const loadWorkoutLogs = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .limit(200);
    setWorkoutLogs((data as WorkoutLog[]) ?? []);
  }, []);

  const loadBiometricEntries = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("biometric_entries")
      .select("*")
      .eq("user_id", userId)
      .order("entry_date", { ascending: true })
      .limit(90);
    setBiometricEntries((data as BiometricEntry[]) ?? []);
  }, []);

  const loadNutritionLogs = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: true })
      .limit(90);
    setNutritionLogs((data as NutritionLog[]) ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      await Promise.all([
        loadProfile(user.id, {
          full_name: (user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined,
          avatar_url: (user.user_metadata?.avatar_url ?? user.user_metadata?.picture) as string | undefined,
        }),
        loadWorkoutLogs(user.id),
        loadBiometricEntries(user.id),
        loadNutritionLogs(user.id),
      ]);
    })();
  }, [user, loadProfile, loadWorkoutLogs, loadBiometricEntries, loadNutritionLogs]);

  // Derived rather than reset via effect: once signed out, these read as empty regardless
  // of what the last-loaded user's data happened to be.
  const visibleProfile = user ? profile : null;
  const visibleWorkoutLogs = user ? workoutLogs : EMPTY_WORKOUT_LOGS;
  const visibleBiometricEntries = user ? biometricEntries : EMPTY_BIOMETRIC_ENTRIES;
  const visibleNutritionLogs = user ? nutritionLogs : EMPTY_NUTRITION_LOGS;

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google" | "facebook" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data as UserProfile);
    },
    [user]
  );

  const addWorkoutLog = useCallback(
    async (
      log: Pick<WorkoutLog, "exercise_name" | "sets" | "reps" | "weight_kg" | "rpe" | "notes"> & {
        log_date?: string;
      }
    ) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("workout_logs")
        .insert({
          user_id: user.id,
          log_date: log.log_date ?? localDateString(),
          exercise_name: log.exercise_name,
          sets: log.sets,
          reps: log.reps,
          weight_kg: log.weight_kg,
          rpe: log.rpe,
          notes: log.notes,
        })
        .select()
        .single();
      if (error) throw error;
      setWorkoutLogs((prev) => [data as WorkoutLog, ...prev]);
    },
    [user]
  );

  /** Simulates a wearable sync (HealthKit/Garmin/Strava-style feed) for demo purposes. */
  const simulateWearableSync = useCallback(async (): Promise<BiometricEntry> => {
    if (!user) throw new Error("Not signed in.");
    const today = localDateString();
    const hrvBaseline = 55;
    const rhrBaseline = 58;
    const reading = await getActiveWearableProvider().fetchReading();
    const readinessScore = calculateReadinessScore({
      hrvMs: reading.hrvMs,
      hrvBaselineMs: hrvBaseline,
      restingHr: reading.restingHr,
      restingHrBaseline: rhrBaseline,
      sleepQualityPct: reading.sleepQualityPct,
    });

    const { data, error } = await supabase
      .from("biometric_entries")
      .upsert(
        {
          user_id: user.id,
          entry_date: today,
          weight_kg: profile?.weight_kg ?? null,
          resting_hr: reading.restingHr,
          hrv_ms: reading.hrvMs,
          sleep_hours: reading.sleepHours,
          sleep_quality_pct: reading.sleepQualityPct,
          steps: reading.steps,
          readiness_score: readinessScore,
        },
        { onConflict: "user_id,entry_date" }
      )
      .select()
      .single();

    if (error) throw error;
    const entry = data as BiometricEntry;
    setBiometricEntries((prev) => {
      const withoutToday = prev.filter((e) => e.entry_date !== today);
      return [...withoutToday, entry].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    });
    return entry;
  }, [user, profile]);

  const logBodyComposition = useCallback(
    async (entry: { weight_kg: number; body_fat_pct: number | null; muscle_mass_kg: number | null }) => {
      if (!user) return;
      const today = localDateString();
      const { data, error } = await supabase
        .from("biometric_entries")
        .upsert(
          {
            user_id: user.id,
            entry_date: today,
            weight_kg: entry.weight_kg,
            body_fat_pct: entry.body_fat_pct,
            muscle_mass_kg: entry.muscle_mass_kg,
          },
          { onConflict: "user_id,entry_date" }
        )
        .select()
        .single();
      if (error) throw error;
      setBiometricEntries((prev) => {
        const withoutToday = prev.filter((e) => e.entry_date !== today);
        return [...withoutToday, data as BiometricEntry].sort((a, b) =>
          a.entry_date.localeCompare(b.entry_date)
        );
      });
    },
    [user]
  );

  const logRecoveryCheckin = useCallback(
    async (entry: { soreness: number; energy: number; stress: number }) => {
      if (!user) return;
      const today = localDateString();
      const { data, error } = await supabase
        .from("biometric_entries")
        .upsert(
          {
            user_id: user.id,
            entry_date: today,
            soreness: entry.soreness,
            energy: entry.energy,
            stress: entry.stress,
          },
          { onConflict: "user_id,entry_date" }
        )
        .select()
        .single();
      if (error) throw error;
      setBiometricEntries((prev) => {
        const withoutToday = prev.filter((e) => e.entry_date !== today);
        return [...withoutToday, data as BiometricEntry].sort((a, b) =>
          a.entry_date.localeCompare(b.entry_date)
        );
      });
    },
    [user]
  );

  const addNutritionLog = useCallback(
    async (entry: {
      calories: number | null;
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
      notes?: string | null;
    }) => {
      if (!user) return;
      const today = localDateString();
      const { data, error } = await supabase
        .from("nutrition_logs")
        .upsert(
          {
            user_id: user.id,
            log_date: today,
            calories: entry.calories,
            protein_g: entry.protein_g,
            carbs_g: entry.carbs_g,
            fat_g: entry.fat_g,
            notes: entry.notes ?? null,
          },
          { onConflict: "user_id,log_date" }
        )
        .select()
        .single();
      if (error) throw error;
      setNutritionLogs((prev) => {
        const withoutToday = prev.filter((n) => n.log_date !== today);
        return [...withoutToday, data as NutritionLog].sort((a, b) => a.log_date.localeCompare(b.log_date));
      });
    },
    [user]
  );

  const fitnessState = useMemo(
    () =>
      visibleProfile
        ? calculateFitnessState(visibleProfile, visibleWorkoutLogs, visibleBiometricEntries, visibleNutritionLogs)
        : null,
    [visibleProfile, visibleWorkoutLogs, visibleBiometricEntries, visibleNutritionLogs]
  );

  const latestBiometric = useMemo(
    () => (visibleBiometricEntries.length ? visibleBiometricEntries[visibleBiometricEntries.length - 1] : null),
    [visibleBiometricEntries]
  );

  const value: AppContextValue = {
    session,
    user,
    profile: visibleProfile,
    authLoading,
    profileLoading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    workoutLogs: visibleWorkoutLogs,
    addWorkoutLog,
    biometricEntries: visibleBiometricEntries,
    latestBiometric,
    simulateWearableSync,
    logBodyComposition,
    logRecoveryCheckin,
    nutritionLogs: visibleNutritionLogs,
    addNutritionLog,
    fitnessState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
