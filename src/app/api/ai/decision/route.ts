import { NextResponse } from "next/server";
import { generateJson } from "@/lib/groq";
import { requireFeature } from "@/lib/supabaseServer";
import { notifyUser } from "@/lib/notifications";
import type { FitnessDecision, FitnessState } from "@/lib/types";

interface DecisionRequestBody {
  fitnessState: FitnessState;
  deterministic: { priority: string; actions: string[] };
  goal: string | null;
}

const CONFIDENCE_VALUES = ["low", "medium", "high"];

function fallbackDecision(body: DecisionRequestBody): FitnessDecision {
  return {
    priority: body.deterministic.priority,
    recommendation: body.deterministic.priority,
    reason: "Based on your recent training, recovery, and nutrition data.",
    confidence: "medium",
    actions: body.deterministic.actions,
  };
}

/** Structured validation — never trust raw AI output. */
function validate(raw: unknown): { recommendation: string; reason: string; confidence: FitnessDecision["confidence"] } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.recommendation !== "string" || !r.recommendation.trim()) return null;
  if (typeof r.reason !== "string" || !r.reason.trim()) return null;
  if (typeof r.confidence !== "string" || !CONFIDENCE_VALUES.includes(r.confidence)) return null;
  return {
    recommendation: r.recommendation.slice(0, 300),
    reason: r.reason.slice(0, 500),
    confidence: r.confidence as FitnessDecision["confidence"],
  };
}

export async function POST(request: Request) {
  const access = await requireFeature(request, "context_aware_coach");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: DecisionRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.fitnessState || !body.deterministic) {
    return NextResponse.json({ error: "fitnessState and deterministic are required." }, { status: 400 });
  }

  if (body.fitnessState.recovery.status !== "green") {
    await notifyUser(
      access.client,
      access.user.id,
      "plan_adjusted",
      "Your plan has been adjusted",
      body.deterministic.priority,
      20 // dedupe: at most once per ~day
    );
  }

  const depth = access.tier === "pro" ? "long-term history and every available signal" : "this week's data";
  const s = body.fitnessState;
  const prompt = `You are PulseFit AI's decision engine. A deterministic rules engine already picked today's priority — your only job is to explain WHY in one or two sentences and rate your confidence, grounded strictly in the numbers below. Never invent data. If a value is null, say the data isn't available yet rather than guessing.

Deterministic priority already chosen: "${body.deterministic.priority}"
Stated goal: ${body.goal ?? "unspecified"}
Analysis depth for this user's tier: ${depth}

Fitness state:
- Recovery: ${s.recovery.status} (readiness ${s.recovery.readinessScore ?? "unknown"}/100, sleep avg ${s.recovery.sleepAvgHours ?? "unknown"}h, trend ${s.recovery.sleepTrend})
- Training: ${s.training.sessionsLast7d} sessions last 7d, ${s.training.consistencyPct}% consistency, volume trend ${s.training.volumeTrend}, avg RPE ${s.training.avgRpeLast7d ?? "unknown"}
- Nutrition: ${s.nutrition.loggedDaysLast7d} days logged, avg ${s.nutrition.avgCalories ?? "unknown"} kcal vs target ${s.nutrition.calorieTarget ?? "unknown"}, adherence ${s.nutrition.adherencePct ?? "unknown"}%
- Weight: ${s.weight.current ?? "unknown"}kg, trend ${s.weight.trend}
- Goal: ${s.goal.weeksToGoal ?? "unknown"} weeks to target, on track: ${s.goal.onTrack ?? "unknown"}

Respond as strict JSON only, no markdown:
{ "recommendation": string (a specific, actionable one-liner), "reason": string (1-2 sentences, cite the actual numbers above), "confidence": "low" | "medium" | "high" }`;

  try {
    const text = await generateJson(prompt);
    const parsed = validate(JSON.parse(text));
    if (!parsed) {
      return NextResponse.json(fallbackDecision(body));
    }
    const decision: FitnessDecision = {
      priority: body.deterministic.priority,
      recommendation: parsed.recommendation,
      reason: parsed.reason,
      confidence: parsed.confidence,
      actions: body.deterministic.actions,
    };
    return NextResponse.json(decision);
  } catch {
    // AI provider unavailable — the app must not break. Deterministic fallback.
    return NextResponse.json(fallbackDecision(body));
  }
}
