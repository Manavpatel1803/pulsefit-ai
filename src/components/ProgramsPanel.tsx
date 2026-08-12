"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import TierGate from "@/components/TierGate";
import { supabase } from "@/lib/supabase";
import { GOAL_LABELS } from "@/lib/calculations";
import type { FitnessProgram, Goal } from "@/lib/types";

/** Pro: "Multiple goals/programs" — saved goal snapshots you can switch between. */
export default function ProgramsPanel() {
  const { user, profile, updateProfile } = useApp();
  const toast = useToast();
  const [programs, setPrograms] = useState<FitnessProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Goal>("lose_fat");
  const [targetWeight, setTargetWeight] = useState(profile?.weight_kg ?? 70);
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("fitness_programs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPrograms((data as FitnessProgram[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleCreate() {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("fitness_programs").insert({
        user_id: user.id,
        name: name.trim(),
        goal,
        target_weight_kg: targetWeight,
        is_active: false,
      });
      if (error) throw error;
      toast.success("Program saved");
      setShowCreate(false);
      setName("");
      await load();
    } catch (err) {
      toast.error("Could not save program", err instanceof Error ? err.message : undefined);
    } finally {
      setCreating(false);
    }
  }

  async function handleActivate(program: FitnessProgram) {
    if (!user) return;
    setActivating(program.id);
    try {
      await supabase.from("fitness_programs").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
      const { error } = await supabase.from("fitness_programs").update({ is_active: true }).eq("id", program.id);
      if (error) throw error;
      await updateProfile({
        goal: program.goal,
        target_weight_kg: program.target_weight_kg,
        target_date: program.target_date,
      });
      toast.success(`Switched to "${program.name}"`);
      await load();
    } catch (err) {
      toast.error("Could not switch program", err instanceof Error ? err.message : undefined);
    } finally {
      setActivating(null);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("fitness_programs").delete().eq("id", id);
    toast.success("Program deleted");
    await load();
  }

  if (!profile) return null;

  return (
    <TierGate requiredTier="pro" currentTier={profile.tier} featureName="multiple goals and programs">
      <div className="glass-raised p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Programs</h3>
          <button
            onClick={() => setShowCreate((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-amber border border-amber/40 rounded-full px-3 py-1.5 hover:bg-amber/10"
          >
            <Plus className="h-3.5 w-3.5" /> Save current as program
          </button>
        </div>

        {showCreate && (
          <div className="glass-pro glass p-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Program name (e.g. Summer cut)"
              className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as Goal)}
                className="rounded-lg bg-white/5 border border-hairline px-2 py-2 text-xs text-white outline-none"
              >
                {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                  <option key={g} value={g} className="bg-surface">
                    {GOAL_LABELS[g]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step={0.5}
                value={targetWeight}
                onChange={(e) => setTargetWeight(Number(e.target.value))}
                placeholder="Target weight (kg)"
                className="rounded-lg bg-white/5 border border-hairline px-2 py-2 text-xs text-white outline-none"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-amber hover:bg-amber/90 disabled:opacity-50 text-void text-xs font-semibold px-4 py-2"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-mist">Loading programs...</p>
        ) : programs.length === 0 ? (
          <p className="text-sm text-mist">No saved programs yet — your current goal is the only one in play.</p>
        ) : (
          <div className="space-y-2">
            {programs.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 border border-hairline p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {p.is_active && <Star className="h-3 w-3 text-amber fill-amber shrink-0" />}
                    <p className="text-sm text-white truncate">{p.name}</p>
                  </div>
                  <p className="text-[10px] text-mist-dim">
                    {GOAL_LABELS[p.goal]} {p.target_weight_kg ? `· ${p.target_weight_kg}kg target` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!p.is_active && (
                    <button
                      onClick={() => handleActivate(p)}
                      disabled={activating === p.id}
                      className="flex items-center gap-1 text-[10px] text-indigo-glow border border-indigo-glow/40 rounded-full px-2.5 py-1 hover:bg-indigo/10"
                    >
                      {activating === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Activate
                    </button>
                  )}
                  <button onClick={() => handleDelete(p.id)} aria-label={`Delete ${p.name}`} className="text-mist-dim hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TierGate>
  );
}
