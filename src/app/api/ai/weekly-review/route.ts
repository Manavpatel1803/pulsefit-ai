import { NextResponse } from "next/server";
import { generateJson } from "@/lib/groq";
import { requireFeature } from "@/lib/supabaseServer";
import { notifyUser } from "@/lib/notifications";
import type { WeeklyReviewStats, WeeklyReviewSummary } from "@/lib/types";

interface WeeklyReviewRequestBody {
  stats: WeeklyReviewStats;
  goal: string | null;
}

function validate(raw: unknown, wantsLongTerm: boolean): WeeklyReviewSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.wentWell !== "string" || !r.wentWell.trim()) return null;
  if (typeof r.biggestLimiter !== "string" || !r.biggestLimiter.trim()) return null;
  if (typeof r.nextWeekPriority !== "string" || !r.nextWeekPriority.trim()) return null;
  const summary: WeeklyReviewSummary = {
    wentWell: r.wentWell.slice(0, 400),
    biggestLimiter: r.biggestLimiter.slice(0, 400),
    nextWeekPriority: r.nextWeekPriority.slice(0, 400),
  };
  if (wantsLongTerm && typeof r.longTermComparison === "string" && r.longTermComparison.trim()) {
    summary.longTermComparison = r.longTermComparison.slice(0, 400);
  }
  return summary;
}

export async function POST(request: Request) {
  const access = await requireFeature(request, "weekly_ai_review");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: WeeklyReviewRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.stats) {
    return NextResponse.json({ error: "stats is required." }, { status: 400 });
  }

  const isPro = access.tier === "pro";
  const { stats } = body;

  const prompt = `You are PulseFit AI's weekly review writer. Using ONLY the structured stats below (never invent numbers or achievements the data doesn't support), write a concise weekly review.

Stats for the week starting ${stats.weekStart}:
- Training sessions: ${stats.trainingSessions}
- Training volume: ${stats.trainingVolume}
- Avg daily calories: ${stats.avgCalories ?? "not logged"}
- Avg daily protein: ${stats.avgProtein ?? "not logged"}g
- Avg sleep: ${stats.avgSleepHours ?? "unknown"}h
- Avg readiness: ${stats.avgReadiness ?? "unknown"}/100
- Weight change vs prior week: ${stats.weightChangeKg ?? "unknown"}kg
- Stated goal: ${body.goal ?? "unspecified"}

Respond as strict JSON only, no markdown:
{
  "wentWell": string (1-2 sentences, specific to the numbers above),
  "biggestLimiter": string (1-2 sentences — the clearest limiting factor visible in this data; if data is too sparse to tell, say so),
  "nextWeekPriority": string (one concrete, actionable priority for next week)${isPro ? ',\n  "longTermComparison": string (1-2 sentences on how this week fits the broader pattern, using only the data given)' : ""}
}`;

  let summary: WeeklyReviewSummary;
  try {
    const text = await generateJson(prompt);
    const parsed = validate(JSON.parse(text), isPro);
    summary = parsed ?? {
      wentWell: `Logged ${stats.trainingSessions} training session(s) this week.`,
      biggestLimiter: "Not enough logged data yet to identify a clear limiter.",
      nextWeekPriority: "Keep logging workouts, nutrition, and recovery check-ins consistently.",
    };
  } catch {
    summary = {
      wentWell: `Logged ${stats.trainingSessions} training session(s) this week.`,
      biggestLimiter: "AI review is temporarily unavailable — showing your raw stats only.",
      nextWeekPriority: "Keep logging workouts, nutrition, and recovery check-ins consistently.",
    };
  }

  const { data: stored, error } = await access.client
    .from("weekly_reviews")
    .upsert(
      { user_id: access.user.id, week_start: stats.weekStart, stats, summary },
      { onConflict: "user_id,week_start" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `Could not save review: ${error.message}` }, { status: 500 });
  }

  await notifyUser(
    access.client,
    access.user.id,
    "weekly_review_ready",
    "Your weekly review is ready",
    summary.nextWeekPriority
  );

  return NextResponse.json(stored);
}
