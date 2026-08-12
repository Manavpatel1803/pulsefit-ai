"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Activity,
  Bot,
  Calculator,
  Dumbbell,
  Flame,
  HeartPulse,
  Loader2,
  Moon,
  Sparkles,
  Target,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Tier } from "@/lib/types";
import AuthScreen from "@/components/AuthScreen";
import OnboardingWizard from "@/components/OnboardingWizard";
import PlanSelection from "@/components/PlanSelection";
import Header from "@/components/Header";
import PulseWave from "@/components/PulseWave";
import TierGate from "@/components/TierGate";
import TodayDashboard from "@/components/TodayDashboard";
import FreeCalculators from "@/components/FreeCalculators";
import WorkoutLibrary from "@/components/WorkoutLibrary";
import AIGoalBlueprint from "@/components/AIGoalBlueprint";
import AIWorkoutEngine from "@/components/AIWorkoutEngine";
import AIDietEngine from "@/components/AIDietEngine";
import GymStreakTracker from "@/components/GymStreakTracker";
import BiometricDashboard from "@/components/BiometricDashboard";
import SleepRecoveryTracker from "@/components/SleepRecoveryTracker";
import AuraCoachAgent from "@/components/AuraCoachAgent";
import CoachAuraChat from "@/components/CoachAuraChat";
import CommunityHub from "@/components/CommunityHub";
import Footer from "@/components/Footer";
import NewsletterSubscribeModal from "@/components/NewsletterSubscribeModal";
import { EASE } from "@/lib/motion";
import type { FitnessState } from "@/lib/types";

type SectionKey =
  | "today"
  | "calculators"
  | "library"
  | "community"
  | "blueprint"
  | "ai_workout"
  | "ai_diet"
  | "streak"
  | "biometrics"
  | "recovery"
  | "coach";

const SECTIONS: {
  key: SectionKey;
  label: string;
  tier: Tier;
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  { key: "today", label: "Today", tier: "free", icon: <Sparkles className="h-4 w-4" />, title: "Today", description: "What matters most today, based on your real training, recovery, and nutrition data." },
  { key: "calculators", label: "Calculators", tier: "free", icon: <Calculator className="h-4 w-4" />, title: "BMR & TDEE calculators", description: "See your energy needs update live as you adjust your stats." },
  { key: "library", label: "Workouts", tier: "free", icon: <Dumbbell className="h-4 w-4" />, title: "Workout library", description: "Standardized exercise mechanics and form cues, filterable by equipment." },
  { key: "community", label: "Community", tier: "free", icon: <UsersRound className="h-4 w-4" />, title: "Community", description: "Feed, challenges, and groups — accountability and motivation, not a social network." },
  { key: "streak", label: "Streak", tier: "free", icon: <Flame className="h-4 w-4" />, title: "Gym streak tracker", description: "Log sets and watch your consistency build day over day." },
  { key: "recovery", label: "Recovery", tier: "free", icon: <Moon className="h-4 w-4" />, title: "Sleep & recovery", description: "Readiness status from sleep, soreness, energy, and stress." },
  { key: "blueprint", label: "Goal Blueprint", tier: "plus", icon: <Target className="h-4 w-4" />, title: "AI goal blueprint", description: "A timeline to your target weight, with calories and macros to match." },
  { key: "ai_workout", label: "AI Workouts", tier: "plus", icon: <Bot className="h-4 w-4" />, title: "AI workout engine", description: "A training split generated around your goal, experience, and equipment." },
  { key: "ai_diet", label: "AI Diet", tier: "plus", icon: <UtensilsCrossed className="h-4 w-4" />, title: "AI diet engine", description: "A sample day of meals built to your calorie and macro targets." },
  { key: "biometrics", label: "Biometrics", tier: "pro", icon: <Activity className="h-4 w-4" />, title: "Biometric dashboard", description: "Weight, body fat, and muscle mass trends over time." },
  { key: "coach", label: "AuraCoach", tier: "plus", icon: <HeartPulse className="h-4 w-4" />, title: "AuraCoach RPE engine", description: "Real-time load adjustments and injury-aware exercise regressions." },
];

const TIER_DOT: Record<Tier, string> = { free: "", plus: "bg-indigo-glow", pro: "bg-amber" };

function greetingForHour(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function statusLine(fitnessState: FitnessState | null): string {
  if (!fitnessState) return "Let's get your first log in today.";
  const { recovery, training } = fitnessState;
  if (recovery.status === "red") return "Recovery is low today — an easy day will pay off more than a hard one.";
  if (recovery.status === "yellow") return "Recovery is moderate — train, but ease off the intensity.";
  if (training.sessionsLast7d === 0) return "No sessions logged this week yet — let's change that.";
  return "Recovery looks solid — you're clear to train as planned.";
}

function welcomeHeading(justFinishedOnboarding: boolean, fullName: string | null): string {
  const firstName = fullName?.split(" ")[0];
  if (justFinishedOnboarding) return `Welcome aboard${firstName ? `, ${firstName}` : ""}`;
  return "Welcome back";
}

export default function Home() {
  const { authLoading, user, profile, profileLoading, fitnessState } = useApp();
  const [section, setSection] = useState<SectionKey>("today");
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Captures whether plan_selected was already true the FIRST time we saw a real
  // profile this session. If it was false back then and is true now, the user
  // completed the plan screen during this same session — i.e. this is their very
  // first dashboard view — distinct from someone who onboarded a while ago and is
  // just logging back in, where plan_selected was already true on first load.
  // useLayoutEffect (not useState's lazy initializer) because `profile` isn't
  // known yet on the true first render — it streams in from AppContext — so the
  // capture has to happen once profile actually arrives, not at mount.
  const [initialPlanSelected, setInitialPlanSelected] = useState<boolean | null>(null);
  const capturedRef = useRef(false);
  useLayoutEffect(() => {
    if (!capturedRef.current && profile) {
      capturedRef.current = true;
      setInitialPlanSelected(profile.plan_selected);
    }
  }, [profile]);
  const justFinishedOnboarding = initialPlanSelected === false && profile?.plan_selected === true;

  useGSAP(
    () => {
      const nav = navRef.current;
      const indicator = indicatorRef.current;
      const activeBtn = nav?.querySelector<HTMLElement>(`[data-section="${section}"]`);
      if (!nav || !indicator || !activeBtn) return;
      const navRect = nav.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      gsap.to(indicator, {
        x: btnRect.left - navRect.left + nav.scrollLeft,
        y: btnRect.top - navRect.top + nav.scrollTop,
        width: btnRect.width,
        height: btnRect.height,
        duration: 0.35,
        ease: EASE.standard,
      });
      // Deps also cover the loading/onboarding gates above: nav doesn't exist in the
      // DOM until those resolve, so the effect must re-run once they flip to pick up
      // the now-mounted ref (a [section]-only dep array would fire once too early).
    },
    {
      scope: navRef,
      dependencies: [section, authLoading, profileLoading, profile?.onboarding_complete, profile?.plan_selected],
    }
  );

  useGSAP(
    () => {
      if (!headerRef.current) return;
      gsap.from(headerRef.current, { opacity: 0, y: 8, duration: 0.3, ease: EASE.standard });
    },
    { scope: headerRef, dependencies: [section] }
  );

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-glow" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (profileLoading || !profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-glow" />
      </div>
    );
  }

  if (!profile.onboarding_complete) {
    return <OnboardingWizard />;
  }

  if (!profile.plan_selected) {
    return <PlanSelection />;
  }

  const active = SECTIONS.find((s) => s.key === section)!;

  return (
    <div className="flex-1 flex flex-col">
      <Header />

      <div className="opacity-40 -mb-6">
        <PulseWave height={56} repeats={9} animated={false} color="var(--mist-dim)" />
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 flex-1">
        <div className="relative mb-6 border-b border-hairline">
          <nav ref={navRef} className="relative flex gap-1.5 overflow-x-auto pb-4">
            <div
              ref={indicatorRef}
              className="absolute left-0 top-0 rounded-lg bg-white/8 pointer-events-none"
              style={{ width: 0, height: 0 }}
              aria-hidden="true"
            />
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                data-section={s.key}
                onClick={() => setSection(s.key)}
                className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  section === s.key ? "text-white" : "text-mist hover:text-white hover:bg-white/5"
                }`}
              >
                {s.icon}
                {s.label}
                {TIER_DOT[s.tier] && (
                  <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[s.tier]}`} aria-hidden="true" />
                )}
              </button>
            ))}
          </nav>
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-4 w-10 bg-gradient-to-l from-void to-transparent"
            aria-hidden="true"
          />
        </div>

        <div ref={headerRef} className="mb-6">
          {section === "today" ? (
            <>
              <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
                {welcomeHeading(justFinishedOnboarding, profile.full_name)}
              </h1>
              <p className="text-sm text-mist mt-1">
                {justFinishedOnboarding
                  ? `${greetingForHour(new Date().getHours())} — let's get your first log in today.`
                  : statusLine(fitnessState)}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-white tracking-tight">{active.title}</h1>
              <p className="text-sm text-mist mt-1">{active.description}</p>
            </>
          )}
        </div>

        <TierGate requiredTier={active.tier} currentTier={profile.tier} featureName={active.label}>
          {section === "today" && <TodayDashboard />}
          {section === "calculators" && <FreeCalculators />}
          {section === "library" && <WorkoutLibrary />}
          {section === "community" && <CommunityHub />}
          {section === "blueprint" && <AIGoalBlueprint />}
          {section === "ai_workout" && <AIWorkoutEngine />}
          {section === "ai_diet" && <AIDietEngine />}
          {section === "streak" && <GymStreakTracker />}
          {section === "biometrics" && <BiometricDashboard />}
          {section === "recovery" && <SleepRecoveryTracker />}
          {section === "coach" && <AuraCoachAgent />}
        </TierGate>
      </main>

      <Footer />
      <CoachAuraChat />

      {!profile.newsletter_subscribed && !profile.newsletter_prompted && (
        <NewsletterSubscribeModal onClose={() => {}} />
      )}
    </div>
  );
}
