import { NextResponse } from "next/server";
import { generateJson } from "@/lib/groq";
import { requireTier } from "@/lib/supabaseServer";
import type { UserProfile } from "@/lib/types";

interface DietRequestBody {
  type: "diet";
  profile: Pick<UserProfile, "goal" | "activity_level" | "equipment">;
  calorieTarget: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
}

interface WorkoutRequestBody {
  type: "workout";
  profile: Pick<UserProfile, "goal" | "experience_level" | "equipment">;
  daysPerWeek: number;
}

type RequestBody = DietRequestBody | WorkoutRequestBody;

const DIET_SCHEMA_HINT = `{
  "calorieTarget": number,
  "macros": { "proteinG": number, "carbsG": number, "fatG": number },
  "meals": [ { "name": string, "description": string, "calories": number } ] (4 meals),
  "notes": string (one short coaching tip, under 200 characters)
}`;

const WORKOUT_SCHEMA_HINT = `{
  "split": string (e.g. "Upper/Lower", "Push/Pull/Legs"),
  "days": [
    {
      "day": string (e.g. "Day 1 — Push"),
      "focus": string,
      "exercises": [ { "name": string, "sets": number, "reps": string, "rpe": number } ]
    }
  ],
  "notes": string (one short coaching tip, under 200 characters)
}`;

export async function POST(request: Request) {
  const access = await requireTier(request, "plus");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = buildPrompt(body);
  if (!prompt) {
    return NextResponse.json({ error: "Invalid plan type." }, { status: 400 });
  }

  try {
    const text = await generateJson(prompt);
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `AI generation failed: ${message}` },
      { status: 502 }
    );
  }
}

function buildPrompt(body: RequestBody): string | null {
  if (body.type === "diet") {
    const { profile, calorieTarget, macros } = body;
    return `You are a sports nutrition coach. Build a one-day sample meal plan as strict JSON matching this shape exactly, no markdown, no commentary outside the JSON:
${DIET_SCHEMA_HINT}

Constraints:
- Goal: ${profile.goal ?? "maintain"}
- Activity level: ${profile.activity_level ?? "moderate"}
- Calorie target: ${calorieTarget} kcal
- Macro target: ${macros.proteinG}g protein, ${macros.carbsG}g carbs, ${macros.fatG}g fat
- Use realistic, specific whole foods (not "protein source"). 4 meals that roughly sum to the calorie target.`;
  }

  if (body.type === "workout") {
    const { profile } = body;
    const daysPerWeek = Math.min(Math.max(Math.round(body.daysPerWeek), 1), 7);
    const equipment = profile.equipment?.length ? profile.equipment.join(", ") : "bodyweight only";
    return `You are a strength coach. Build a ${daysPerWeek}-day-per-week training split as strict JSON matching this shape exactly, no markdown, no commentary outside the JSON:
${WORKOUT_SCHEMA_HINT}

Constraints:
- Goal: ${profile.goal ?? "maintain"}
- Experience level: ${profile.experience_level ?? "beginner"}
- Available equipment: ${equipment}
- Exactly ${daysPerWeek} entries in "days"
- RPE values between 6 and 9, appropriate to experience level
- Prefer compound lifts as the first 1-2 exercises each day`;
  }

  return null;
}
