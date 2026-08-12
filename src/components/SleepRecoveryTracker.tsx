"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Heart, Loader2, Moon, Plus, RefreshCw, ShieldCheck, Waves } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import TierGate from "./TierGate";
import { computeRecoveryIntelligence } from "@/lib/recoveryIntelligence";

export default function SleepRecoveryTracker() {
  const { profile, latestBiometric, biometricEntries, fitnessState, simulateWearableSync, logRecoveryCheckin } = useApp();
  const toast = useToast();
  const recoveryIntel = useMemo(() => computeRecoveryIntelligence(biometricEntries), [biometricEntries]);
  const [syncing, setSyncing] = useState(false);
  const [soreness, setSoreness] = useState(2);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(2);
  const [savingCheckin, setSavingCheckin] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const entry = await simulateWearableSync();
      toast.success("Wearable synced", `Readiness ${entry.readiness_score} · HRV ${entry.hrv_ms}ms`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleCheckin() {
    setSavingCheckin(true);
    try {
      await logRecoveryCheckin({ soreness, energy, stress });
      toast.success("Check-in saved", `Soreness ${soreness}/5 · Energy ${energy}/5 · Stress ${stress}/5`);
    } finally {
      setSavingCheckin(false);
    }
  }

  if (!profile) return null;
  const readiness = latestBiometric?.readiness_score ?? null;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <ReadinessGauge score={readiness} status={fitnessState?.recovery.status} />

        <div className="lg:col-span-2 space-y-4">
          <div className="glass p-5 space-y-3">
            <h3 className="text-sm font-medium text-white">How are you feeling?</h3>
            <SliderRow label="Soreness" value={soreness} onChange={setSoreness} />
            <SliderRow label="Energy" value={energy} onChange={setEnergy} />
            <SliderRow label="Stress" value={stress} onChange={setStress} />
            <button
              onClick={handleCheckin}
              disabled={savingCheckin}
              className="flex items-center gap-1.5 rounded-lg bg-emerald hover:bg-emerald/90 disabled:opacity-60 text-void text-sm font-semibold px-4 py-2 transition-colors"
            >
              {savingCheckin ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save check-in
            </button>
          </div>

          <TierGate requiredTier="plus" currentTier={profile.tier} featureName="recovery recommendations">
            <div className="glass-plus glass p-4">
              <p className="text-xs font-medium text-indigo-glow uppercase tracking-wide mb-1">
                Recovery recommendation
              </p>
              <p className="text-sm text-slate-200">{recoveryRecommendation(fitnessState?.recovery.status)}</p>
            </div>
          </TierGate>
        </div>
      </div>

      <TierGate requiredTier="pro" currentTier={profile.tier} featureName="wearable sync and detailed recovery metrics">
        <div className="space-y-4">
          <div className="glass-raised p-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Wearable data</h2>
              <p className="text-xs text-mist mt-0.5">
                {latestBiometric ? `Last synced ${latestBiometric.entry_date}` : "No wearable data yet"}
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg bg-indigo hover:bg-indigo/90 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors shrink-0"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync wearable
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MetricTile icon={<Waves className="h-4 w-4 text-indigo-glow" />} label="HRV" value={latestBiometric?.hrv_ms} unit="ms" />
            <MetricTile icon={<Heart className="h-4 w-4 text-amber" />} label="Resting HR" value={latestBiometric?.resting_hr} unit="bpm" />
            <MetricTile icon={<Moon className="h-4 w-4 text-emerald" />} label="Sleep" value={latestBiometric?.sleep_hours} unit="hrs" />
            <MetricTile icon={<Moon className="h-4 w-4 text-mist" />} label="Sleep quality" value={latestBiometric?.sleep_quality_pct} unit="%" />
          </div>

          <div className={`glass p-5 space-y-2 ${recoveryIntel.overreachingRisk ? "border-amber/40" : ""}`}>
            <div className="flex items-center gap-2">
              {recoveryIntel.overreachingRisk ? (
                <AlertTriangle className="h-4 w-4 text-amber" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald" />
              )}
              <h3 className="text-sm font-medium text-white">Advanced recovery intelligence</h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{recoveryIntel.insight}</p>
            {recoveryIntel.hasEnoughData && (
              <p className="text-[10px] text-mist-dim">
                30-day baseline: HRV {recoveryIntel.hrvBaselineMs}ms · resting HR {recoveryIntel.rhrBaselineBpm}bpm
              </p>
            )}
          </div>
        </div>
      </TierGate>
    </section>
  );
}

function recoveryRecommendation(status?: string): string {
  if (status === "red") return "Recovery is low. Skip high-intensity work — active recovery or full rest today.";
  if (status === "yellow") return "Recovery is moderate. Train, but cut planned load by about 10%.";
  return "Recovery looks solid. No restrictions on today's training.";
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-mist">
        <span>{label}</span>
        <span className="data-readout text-white">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo"
      />
    </div>
  );
}

function ReadinessGauge({ score, status }: { score: number | null; status?: string }) {
  const pct = score ?? 0;
  const color = status === "red" ? "#f87171" : status === "yellow" ? "var(--amber)" : "var(--emerald)";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="glass p-6 flex flex-col items-center justify-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          {score !== null && (
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-semibold text-white data-readout">
            {score ?? "—"}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-mist-dim">Readiness</span>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  return (
    <div className="glass p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-mist uppercase tracking-wide">{label}</span>
      </div>
      <span className="font-display text-xl font-semibold text-white data-readout">
        {value ?? "—"} {value != null && <span className="text-xs text-mist-dim font-sans">{unit}</span>}
      </span>
    </div>
  );
}
