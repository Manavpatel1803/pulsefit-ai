"use client";

import { useState } from "react";
import { Loader2, Plus, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import AdvancedAnalyticsPanel from "@/components/AdvancedAnalyticsPanel";
import DataExportPanel from "@/components/DataExportPanel";

export default function BiometricDashboard() {
  const { profile, biometricEntries, logBodyComposition } = useApp();
  const toast = useToast();
  const [weight, setWeight] = useState(profile?.weight_kg ?? 72);
  const [bodyFat, setBodyFat] = useState(18);
  const [muscle, setMuscle] = useState(32);
  const [saving, setSaving] = useState(false);

  const chartData = biometricEntries.map((e) => ({
    date: e.entry_date.slice(5),
    weight: e.weight_kg,
    bodyFat: e.body_fat_pct,
    muscle: e.muscle_mass_kg,
  }));

  async function handleSave() {
    setSaving(true);
    try {
      await logBodyComposition({ weight_kg: weight, body_fat_pct: bodyFat, muscle_mass_kg: muscle });
      toast.success("Check-in saved", `${weight}kg · ${bodyFat}% body fat · ${muscle}kg muscle`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <AdvancedAnalyticsPanel />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Weight" dataKey="weight" unit="kg" color="#818cf8" data={chartData} />
        <ChartCard title="Body fat %" dataKey="bodyFat" unit="%" color="#f59e0b" data={chartData} />
        <ChartCard title="Muscle mass" dataKey="muscle" unit="kg" color="#10b981" data={chartData} />
        <div className="glass p-5 flex flex-col justify-center items-center text-center gap-2">
          <TrendingUp className="h-5 w-5 text-mist" />
          <p className="text-xs text-mist">
            {biometricEntries.length} check-in{biometricEntries.length === 1 ? "" : "s"} logged
          </p>
        </div>
      </div>

      <div className="glass-raised p-6 space-y-4">
        <h3 className="text-sm font-medium text-white">Log today&apos;s body composition</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Weight (kg)" value={weight} onChange={setWeight} step={0.1} />
          <NumberField label="Body fat %" value={bodyFat} onChange={setBodyFat} step={0.1} />
          <NumberField label="Muscle mass (kg)" value={muscle} onChange={setMuscle} step={0.1} />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-emerald hover:bg-emerald/90 disabled:opacity-60 text-ink text-sm font-semibold px-4 py-2 transition-colors"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Save check-in
        </button>
      </div>

      <DataExportPanel />
    </section>
  );
}

function ChartCard({
  title,
  dataKey,
  unit,
  color,
  data,
}: {
  title: string;
  dataKey: string;
  unit: string;
  color: string;
  data: Record<string, string | number | null>[];
}) {
  const hasData = data.some((d) => d[dataKey] != null);
  return (
    <div className="glass p-5">
      <h3 className="text-sm font-medium text-white mb-3">
        {title} <span className="text-xs text-mist-dim">({unit})</span>
      </h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ left: -20, right: 10 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={32} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                background: "#101526",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-40 flex items-center justify-center text-xs text-mist-dim">No data yet</div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-mist">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none focus:border-indigo-glow/50"
      />
    </div>
  );
}
