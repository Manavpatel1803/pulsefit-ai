"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { computeWeeklyStats } from "@/lib/fitnessState";
import type { WeeklyReview } from "@/lib/types";

export default function WeeklyReviewCard() {
  const { user, session, profile, workoutLogs, biometricEntries, nutritionLogs } = useApp();
  const toast = useToast();
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedOnce, setFetchedOnce] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setReview((data as WeeklyReview) ?? null);
        setFetchedOnce(true);
      });
  }, [user]);

  async function handleGenerate() {
    if (!session) return;
    setLoading(true);
    try {
      const stats = computeWeeklyStats(workoutLogs, biometricEntries, nutritionLogs);
      const res = await fetch("/api/ai/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ stats, goal: profile?.goal ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate review.");
      setReview(data as WeeklyReview);
      toast.success("Weekly review ready");
    } catch (err) {
      toast.error("Weekly review failed", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-raised p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-indigo-glow" />
          <h3 className="text-sm font-medium text-white">Weekly AI review</h3>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-indigo hover:bg-indigo/90 disabled:opacity-60 text-white text-xs font-medium px-3.5 py-2 transition-colors"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {review ? "Regenerate" : "Generate this week's review"}
        </button>
      </div>

      {!fetchedOnce && !review && <p className="text-sm text-mist">Loading...</p>}

      {review && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <MiniStat label="Sessions" value={review.stats.trainingSessions} />
            <MiniStat label="Avg kcal" value={review.stats.avgCalories ?? "—"} />
            <MiniStat label="Avg sleep" value={review.stats.avgSleepHours ? `${review.stats.avgSleepHours}h` : "—"} />
            <MiniStat label="Weight Δ" value={review.stats.weightChangeKg !== null ? `${review.stats.weightChangeKg}kg` : "—"} />
          </div>
          <ReviewRow label="What went well" value={review.summary.wentWell} />
          <ReviewRow label="Biggest limiter" value={review.summary.biggestLimiter} />
          <ReviewRow label="Next week's priority" value={review.summary.nextWeekPriority} />
          {review.summary.longTermComparison && (
            <ReviewRow label="Long-term pattern" value={review.summary.longTermComparison} />
          )}
        </div>
      )}

      {fetchedOnce && !review && (
        <p className="text-sm text-mist text-center py-6">
          No review yet this week — generate one to see how your week went.
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass p-3">
      <p className="text-[10px] uppercase tracking-wide text-mist-dim">{label}</p>
      <p className="text-sm data-readout text-white mt-0.5">{value}</p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-hairline p-3">
      <p className="text-[10px] uppercase tracking-wide text-indigo-glow mb-1">{label}</p>
      <p className="text-sm text-slate-200 leading-relaxed">{value}</p>
    </div>
  );
}
