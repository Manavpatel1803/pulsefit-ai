import { NextResponse } from "next/server";
import { generateChatReply } from "@/lib/groq";
import { requireFeature } from "@/lib/supabaseServer";
import type { FitnessState, Tier } from "@/lib/types";

interface CoachRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  goal: string | null;
  fitnessState: FitnessState | null;
}

const BASE_PREAMBLE = `You are AuraCoach, the AI coach embedded in PulseFit AI, a biometric fitness app. You speak directly, briefly, and like a knowledgeable strength coach — never generic wellness fluff. Keep replies under 120 words unless the user asks for detail. Never invent measurements or history you weren't given — if you lack the data to answer precisely, say so plainly instead of guessing.`;

function buildPreamble(tier: Tier, goal: string | null, state: FitnessState | null): string {
  if (tier === "free" || !state) {
    return `${BASE_PREAMBLE}

Stated goal: ${goal ?? "unspecified"}
You do not have this user's logged training/recovery/nutrition history available — answer generally and encourage them to log data for more specific coaching. Do not fabricate numbers.`;
  }

  const core = `${BASE_PREAMBLE}

Stated goal: ${goal ?? "unspecified"}
Current fitness state:
- Recovery: ${state.recovery.status} (readiness ${state.recovery.readinessScore ?? "unknown"}/100, sleep avg ${state.recovery.sleepAvgHours ?? "unknown"}h)
- Training: ${state.training.sessionsLast7d} sessions in the last 7 days, ${state.training.consistencyPct}% consistency, avg RPE ${state.training.avgRpeLast7d ?? "unknown"}
- Nutrition: avg ${state.nutrition.avgCalories ?? "unknown"} kcal/day vs target ${state.nutrition.calorieTarget ?? "unknown"}, adherence ${state.nutrition.adherencePct ?? "unknown"}%`;

  if (tier === "plus") {
    return `${core}

If readiness is red, proactively suggest reducing load or volume. Ground advice in the numbers above when relevant.`;
  }

  // pro: deeper long-term signals layered on top
  return `${core}
- Weight: ${state.weight.current ?? "unknown"}kg, trend ${state.weight.trend} (${state.weight.changeKg4wk ?? "unknown"}kg over 4 weeks)
- Training volume trend: ${state.training.volumeTrend}
- Sleep trend: ${state.recovery.sleepTrend}
- Goal trajectory: ${state.goal.weeksToGoal ?? "unknown"} weeks to target, on track: ${state.goal.onTrack ?? "unknown"}

You have this user's longer-term trend data — use it. Reference patterns over time, not just today, when relevant. If readiness is red, proactively suggest reducing load or volume.`;
}

export async function POST(request: Request) {
  const access = await requireFeature(request, "basic_ai_coach");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: CoachRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.messages?.length) {
    return NextResponse.json({ error: "messages is required." }, { status: 400 });
  }

  try {
    const preamble = buildPreamble(access.tier, body.goal, body.fitnessState);
    const reply = await generateChatReply(preamble, body.messages);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `AuraCoach is unavailable: ${message}` },
      { status: 502 }
    );
  }
}
