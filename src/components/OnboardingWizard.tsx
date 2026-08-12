"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useApp } from "@/context/AppContext";
import { ACTIVITY_LABELS, GOAL_LABELS } from "@/lib/calculations";
import { EASE } from "@/lib/motion";
import type {
  ActivityLevel,
  DietaryPreference,
  ExperienceLevel,
  Goal,
  InjuryFlag,
  MotivationStyle,
  Sex,
  WorkoutTimePreference,
} from "@/lib/types";

const EQUIPMENT_OPTIONS = ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Pull-up bar", "Bodyweight only"];

const DIETARY_LABELS: Record<DietaryPreference, string> = {
  none: "No restrictions",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  keto: "Keto",
};

const INJURY_LABELS: Record<InjuryFlag, string> = {
  knee: "Knee",
  shoulder: "Shoulder",
  lower_back: "Lower back",
  wrist: "Wrist",
};

const WORKOUT_TIME_LABELS: Record<WorkoutTimePreference, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  flexible: "Flexible",
};

const MOTIVATION_LABELS: Record<MotivationStyle, string> = {
  solo: "I like working toward goals on my own",
  community: "I stay motivated with community & accountability",
  reminders: "I need reminders and structure to stay on track",
  competition: "Challenges and competition push me",
};

const STEPS = [
  "About you",
  "Body stats",
  "Activity",
  "Goal",
  "Nutrition",
  "Injury awareness",
  "Experience & gear",
  "Training time",
  "Motivation",
  "Review",
];

interface FormState {
  sex: Sex | null;
  age: string;
  height_cm: string;
  weight_kg: string;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  dietary_preference: DietaryPreference | null;
  injury_flags: InjuryFlag[];
  experience_level: ExperienceLevel | null;
  equipment: string[];
  preferred_workout_time: WorkoutTimePreference | null;
  motivation_style: MotivationStyle | null;
}

export default function OnboardingWizard() {
  const { updateProfile } = useApp();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    sex: null,
    age: "",
    height_cm: "",
    weight_kg: "",
    activity_level: null,
    goal: null,
    dietary_preference: null,
    injury_flags: [],
    experience_level: null,
    equipment: [],
    preferred_workout_time: null,
    motivation_style: null,
  });

  const canAdvance = (() => {
    switch (step) {
      case 0:
        return !!form.sex && !!form.age;
      case 1:
        return !!form.height_cm && !!form.weight_kg;
      case 2:
        return !!form.activity_level;
      case 3:
        return !!form.goal;
      case 4:
        return !!form.dietary_preference;
      case 5:
        return true; // "none" is a valid, explicit answer via the toggle set
      case 6:
        return !!form.experience_level && form.equipment.length > 0;
      case 7:
        return !!form.preferred_workout_time;
      case 8:
        return !!form.motivation_style;
      default:
        return true;
    }
  })();

  function toggleEquipment(item: string) {
    setForm((f) => ({
      ...f,
      equipment: f.equipment.includes(item)
        ? f.equipment.filter((e) => e !== item)
        : [...f.equipment, item],
    }));
  }

  function toggleInjury(flag: InjuryFlag) {
    setForm((f) => ({
      ...f,
      injury_flags: f.injury_flags.includes(flag)
        ? f.injury_flags.filter((i) => i !== flag)
        : [...f.injury_flags, flag],
    }));
  }

  function goTo(next: number) {
    setDirection(next > step ? "forward" : "back");
    setStep(next);
  }

  const stepContentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!stepContentRef.current) return;
      gsap.from(stepContentRef.current, {
        opacity: 0,
        x: direction === "forward" ? 24 : -24,
        duration: 0.35,
        ease: EASE.standard,
      });
    },
    { scope: stepContentRef, dependencies: [step] }
  );

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        sex: form.sex,
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        activity_level: form.activity_level,
        goal: form.goal,
        dietary_preference: form.dietary_preference,
        injury_flags: form.injury_flags,
        experience_level: form.experience_level,
        equipment: form.equipment,
        preferred_workout_time: form.preferred_workout_time,
        motivation_style: form.motivation_style,
        target_weight_kg: Number(form.weight_kg),
        onboarding_complete: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      <div className="flex items-center gap-1.5 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= step ? "bg-indigo" : "bg-white/8"
              } ${i === step ? "shadow-[0_0_8px_rgba(129,140,248,0.6)]" : ""}`}
            />
          </div>
        ))}
      </div>

      <p className="text-xs font-medium text-indigo-glow mb-1.5 data-readout">
        STEP {step + 1} / {STEPS.length}
      </p>
      <h1 className="font-display text-2xl font-semibold text-white mb-6">{STEPS[step]}</h1>

      <div className="glass-raised p-6 min-h-[280px] overflow-hidden">
        <div ref={stepContentRef}>
          {step === 0 && (
            <div className="space-y-5">
              <Field label="Sex">
                <div className="flex gap-2">
                  {(["male", "female"] as Sex[]).map((s) => (
                    <Pill key={s} active={form.sex === s} onClick={() => setForm({ ...form, sex: s })}>
                      {s === "male" ? "Male" : "Female"}
                    </Pill>
                  ))}
                </div>
              </Field>
              <Field label="Age">
                <input
                  type="number"
                  min={13}
                  max={100}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="input"
                  placeholder="28"
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Field label="Height (cm)">
                <input
                  type="number"
                  value={form.height_cm}
                  onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                  className="input"
                  placeholder="175"
                />
              </Field>
              <Field label="Weight (kg)">
                <input
                  type="number"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  className="input"
                  placeholder="72"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <Field label="How active are you day-to-day, outside of training?">
              <div className="space-y-2">
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                  <RadioRow
                    key={level}
                    active={form.activity_level === level}
                    onClick={() => setForm({ ...form, activity_level: level })}
                  >
                    {ACTIVITY_LABELS[level]}
                  </RadioRow>
                ))}
              </div>
            </Field>
          )}

          {step === 3 && (
            <Field label="What's your primary goal?">
              <div className="space-y-2">
                {(Object.keys(GOAL_LABELS) as Goal[]).map((goal) => (
                  <RadioRow key={goal} active={form.goal === goal} onClick={() => setForm({ ...form, goal })}>
                    {GOAL_LABELS[goal]}
                  </RadioRow>
                ))}
              </div>
            </Field>
          )}

          {step === 4 && (
            <Field label="Any dietary preference we should build around?">
              <div className="space-y-2">
                {(Object.keys(DIETARY_LABELS) as DietaryPreference[]).map((d) => (
                  <RadioRow
                    key={d}
                    active={form.dietary_preference === d}
                    onClick={() => setForm({ ...form, dietary_preference: d })}
                  >
                    {DIETARY_LABELS[d]}
                  </RadioRow>
                ))}
              </div>
            </Field>
          )}

          {step === 5 && (
            <Field label="Any areas to train carefully around? (optional — select any that apply)">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(INJURY_LABELS) as InjuryFlag[]).map((flag) => (
                  <Pill key={flag} active={form.injury_flags.includes(flag)} onClick={() => toggleInjury(flag)}>
                    {INJURY_LABELS[flag]}
                  </Pill>
                ))}
              </div>
              <p className="text-xs text-mist-dim mt-3">
                We&apos;ll use this to suggest safer exercise swaps automatically.
              </p>
            </Field>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <Field label="Training experience">
                <div className="flex gap-2">
                  {(["beginner", "intermediate", "advanced"] as ExperienceLevel[]).map((lvl) => (
                    <Pill
                      key={lvl}
                      active={form.experience_level === lvl}
                      onClick={() => setForm({ ...form, experience_level: lvl })}
                    >
                      {lvl[0].toUpperCase() + lvl.slice(1)}
                    </Pill>
                  ))}
                </div>
              </Field>
              <Field label="Available equipment">
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((item) => (
                    <Pill key={item} active={form.equipment.includes(item)} onClick={() => toggleEquipment(item)}>
                      {item}
                    </Pill>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 7 && (
            <Field label="When do you usually prefer to train?">
              <div className="space-y-2">
                {(Object.keys(WORKOUT_TIME_LABELS) as WorkoutTimePreference[]).map((t) => (
                  <RadioRow
                    key={t}
                    active={form.preferred_workout_time === t}
                    onClick={() => setForm({ ...form, preferred_workout_time: t })}
                  >
                    {WORKOUT_TIME_LABELS[t]}
                  </RadioRow>
                ))}
              </div>
            </Field>
          )}

          {step === 8 && (
            <Field label="What keeps you consistent?">
              <div className="space-y-2">
                {(Object.keys(MOTIVATION_LABELS) as MotivationStyle[]).map((m) => (
                  <RadioRow
                    key={m}
                    active={form.motivation_style === m}
                    onClick={() => setForm({ ...form, motivation_style: m })}
                  >
                    {MOTIVATION_LABELS[m]}
                  </RadioRow>
                ))}
              </div>
            </Field>
          )}

          {step === 9 && (
            <div className="space-y-3">
              <SummaryRow label="Sex" value={form.sex ?? "—"} />
              <SummaryRow label="Age" value={form.age} />
              <SummaryRow label="Height" value={`${form.height_cm} cm`} />
              <SummaryRow label="Weight" value={`${form.weight_kg} kg`} />
              <SummaryRow label="Activity" value={form.activity_level ? ACTIVITY_LABELS[form.activity_level] : "—"} />
              <SummaryRow label="Goal" value={form.goal ? GOAL_LABELS[form.goal] : "—"} />
              <SummaryRow label="Diet" value={form.dietary_preference ? DIETARY_LABELS[form.dietary_preference] : "—"} />
              <SummaryRow
                label="Injury awareness"
                value={form.injury_flags.length ? form.injury_flags.map((f) => INJURY_LABELS[f]).join(", ") : "None"}
              />
              <SummaryRow label="Experience" value={form.experience_level ?? "—"} />
              <SummaryRow label="Equipment" value={form.equipment.join(", ") || "—"} />
              <SummaryRow
                label="Training time"
                value={form.preferred_workout_time ? WORKOUT_TIME_LABELS[form.preferred_workout_time] : "—"}
              />
              <SummaryRow label="Motivation" value={form.motivation_style ? MOTIVATION_LABELS[form.motivation_style] : "—"} />
              {error && <p className="text-xs text-red-400 pt-1">{error}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => goTo(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 text-sm text-mist hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => goTo(step + 1)}
            disabled={!canAdvance}
            className="flex items-center gap-1.5 rounded-lg bg-indigo hover:bg-indigo/90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 text-white text-sm font-medium px-4 py-2 transition-all"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-emerald hover:bg-emerald/90 active:scale-95 disabled:opacity-60 disabled:active:scale-100 text-void text-sm font-semibold px-4 py-2 transition-all"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Start using PulseFit
          </button>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--hairline);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: white;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input:focus {
          border-color: rgba(129, 140, 248, 0.5);
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-mist">{label}</label>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-sm font-medium border active:scale-95 transition-all ${
        active
          ? "bg-indigo/20 border-indigo-glow/50 text-indigo-glow scale-[1.03]"
          : "bg-white/5 border-hairline text-mist hover:text-white hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function RadioRow({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm border active:scale-[0.98] transition-all flex items-center justify-between ${
        active
          ? "bg-indigo/20 border-indigo-glow/50 text-white"
          : "bg-white/5 border-hairline text-mist hover:text-white hover:border-white/20"
      }`}
    >
      {children}
      {active && <Check className="h-3.5 w-3.5 text-indigo-glow" />}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-hairline last:border-0">
      <span className="text-mist">{label}</span>
      <span className="text-white data-readout text-right">{value}</span>
    </div>
  );
}
