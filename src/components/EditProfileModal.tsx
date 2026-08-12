"use client";

import { useState } from "react";
import { Loader2, Mail, Save } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { ACTIVITY_LABELS, GOAL_LABELS } from "@/lib/calculations";
import type {
  ActivityLevel,
  DietaryPreference,
  ExperienceLevel,
  Goal,
  InjuryFlag,
  MotivationStyle,
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
  solo: "Solo goals",
  community: "Community & accountability",
  reminders: "Reminders & structure",
  competition: "Challenges & competition",
};

export default function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { profile, user, session, updateProfile } = useApp();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [newsletterBusy, setNewsletterBusy] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [age, setAge] = useState(profile?.age ?? 25);
  const [heightCm, setHeightCm] = useState(profile?.height_cm ?? 175);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activity_level ?? "moderate");
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "maintain");
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(profile?.dietary_preference ?? "none");
  const [injuryFlags, setInjuryFlags] = useState<InjuryFlag[]>(profile?.injury_flags ?? []);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experience_level ?? "beginner");
  const [equipment, setEquipment] = useState<string[]>(profile?.equipment ?? []);
  const [workoutTime, setWorkoutTime] = useState<WorkoutTimePreference>(profile?.preferred_workout_time ?? "flexible");
  const [motivation, setMotivation] = useState<MotivationStyle>(profile?.motivation_style ?? "solo");

  if (!profile) return null;

  function toggle<T>(list: T[], setList: (v: T[]) => void, item: T) {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }

  async function handleNewsletterToggle() {
    if (!session || !user?.email) return;
    setNewsletterBusy(true);
    const subscribing = !profile?.newsletter_subscribed;
    try {
      // Unsubscribing is purely a Supabase state change — there's no external list to
      // leave. Subscribing also sends a confirmation email (needs a live Resend key).
      if (subscribing) {
        const res = await fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ email: user.email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not subscribe.");
      }
      await updateProfile({
        newsletter_subscribed: subscribing,
        newsletter_subscribed_at: subscribing ? new Date().toISOString() : null,
        newsletter_prompted: true,
      });
      toast.success(subscribing ? "Subscribed to daily tips" : "Unsubscribed from daily tips");
    } catch (err) {
      toast.error("Could not update subscription", err instanceof Error ? err.message : undefined);
    } finally {
      setNewsletterBusy(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        age,
        height_cm: heightCm,
        activity_level: activityLevel,
        goal,
        dietary_preference: dietaryPreference,
        injury_flags: injuryFlags,
        experience_level: experienceLevel,
        equipment,
        preferred_workout_time: workoutTime,
        motivation_style: motivation,
      });
      toast.success("Profile updated");
      onClose();
    } catch (err) {
      toast.error("Could not update profile", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit profile" onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 border border-hairline p-3.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <Mail className="h-4 w-4 text-indigo-glow shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm text-white">Daily tips email</p>
              <p className="text-xs text-mist-dim">
                {profile.newsletter_subscribed ? "Subscribed — one tip every morning at 9am." : "Not subscribed."}
              </p>
            </div>
          </div>
          <button
            onClick={handleNewsletterToggle}
            disabled={newsletterBusy}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border active:scale-95 disabled:opacity-60 transition-all ${
              profile.newsletter_subscribed
                ? "border-hairline text-mist hover:text-white"
                : "border-indigo-glow/40 text-indigo-glow hover:bg-indigo/10"
            }`}
          >
            {newsletterBusy && <Loader2 className="h-3 w-3 animate-spin" />}
            {profile.newsletter_subscribed ? "Unsubscribe" : "Subscribe"}
          </button>
        </div>

        <LabeledInput label="Name" value={fullName} onChange={setFullName} placeholder="Alex Rivera" />
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Age" type="number" value={String(age)} onChange={(v) => setAge(Number(v))} />
          <LabeledInput label="Height (cm)" type="number" value={String(heightCm)} onChange={(v) => setHeightCm(Number(v))} />
        </div>

        <SelectField label="Activity level" value={activityLevel} onChange={(v) => setActivityLevel(v as ActivityLevel)}>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
            <option key={a} value={a} className="bg-surface">
              {ACTIVITY_LABELS[a]}
            </option>
          ))}
        </SelectField>

        <SelectField label="Goal" value={goal} onChange={(v) => setGoal(v as Goal)}>
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <option key={g} value={g} className="bg-surface">
              {GOAL_LABELS[g]}
            </option>
          ))}
        </SelectField>

        <SelectField label="Dietary preference" value={dietaryPreference} onChange={(v) => setDietaryPreference(v as DietaryPreference)}>
          {(Object.keys(DIETARY_LABELS) as DietaryPreference[]).map((d) => (
            <option key={d} value={d} className="bg-surface">
              {DIETARY_LABELS[d]}
            </option>
          ))}
        </SelectField>

        <SelectField label="Training experience" value={experienceLevel} onChange={(v) => setExperienceLevel(v as ExperienceLevel)}>
          <option value="beginner" className="bg-surface">Beginner</option>
          <option value="intermediate" className="bg-surface">Intermediate</option>
          <option value="advanced" className="bg-surface">Advanced</option>
        </SelectField>

        <SelectField label="Preferred training time" value={workoutTime} onChange={(v) => setWorkoutTime(v as WorkoutTimePreference)}>
          {(Object.keys(WORKOUT_TIME_LABELS) as WorkoutTimePreference[]).map((t) => (
            <option key={t} value={t} className="bg-surface">
              {WORKOUT_TIME_LABELS[t]}
            </option>
          ))}
        </SelectField>

        <SelectField label="What keeps you consistent" value={motivation} onChange={(v) => setMotivation(v as MotivationStyle)}>
          {(Object.keys(MOTIVATION_LABELS) as MotivationStyle[]).map((m) => (
            <option key={m} value={m} className="bg-surface">
              {MOTIVATION_LABELS[m]}
            </option>
          ))}
        </SelectField>

        <div className="space-y-2">
          <span className="text-xs font-medium text-mist">Available equipment</span>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((item) => (
              <TogglePill key={item} active={equipment.includes(item)} onClick={() => toggle(equipment, setEquipment, item)}>
                {item}
              </TogglePill>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-mist">Areas to train carefully around</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(INJURY_LABELS) as InjuryFlag[]).map((flag) => (
              <TogglePill key={flag} active={injuryFlags.includes(flag)} onClick={() => toggle(injuryFlags, setInjuryFlags, flag)}>
                {INJURY_LABELS[flag]}
              </TogglePill>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo hover:bg-indigo/90 active:scale-[0.98] disabled:opacity-60 text-white text-sm font-medium py-2.5 transition-all"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
      </div>
    </Modal>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-mist">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white placeholder:text-mist-dim outline-none focus:border-indigo-glow/50 transition-colors"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-mist">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50 transition-colors"
      >
        {children}
      </select>
    </div>
  );
}

function TogglePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border active:scale-95 transition-all ${
        active
          ? "bg-indigo/20 border-indigo-glow/50 text-indigo-glow"
          : "bg-white/5 border-hairline text-mist hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
