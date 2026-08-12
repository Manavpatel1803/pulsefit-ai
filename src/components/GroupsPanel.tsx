"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import TierGate from "@/components/TierGate";
import CommunityFeed from "@/components/CommunityFeed";
import { supabase } from "@/lib/supabase";
import type { FitnessGroup, GroupCategory } from "@/lib/types";

const CATEGORY_LABEL: Record<GroupCategory, string> = {
  weight_loss: "Weight loss",
  muscle_building: "Muscle building",
  running: "Running",
  strength: "Strength",
  beginners: "Beginners",
  home_workouts: "Home workouts",
};

export default function GroupsPanel() {
  const { user, profile } = useApp();
  const toast = useToast();
  const [groups, setGroups] = useState<FitnessGroup[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<FitnessGroup | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GroupCategory>("beginners");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: groupRows } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    const rows = (groupRows as FitnessGroup[]) ?? [];

    const { data: memberRows } = await supabase.from("group_members").select("group_id,user_id");
    const members = (memberRows as { group_id: string; user_id: string }[]) ?? [];
    const counts = new Map<string, number>();
    for (const m of members) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
    setGroups(rows.map((g) => ({ ...g, member_count: counts.get(g.id) ?? 0 })));
    setMyGroupIds(new Set(user ? members.filter((m) => m.user_id === user.id).map((m) => m.group_id) : []));
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

  async function handleJoin(group: FitnessGroup) {
    if (!user) return;
    setJoining(group.id);
    try {
      const { error } = await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id });
      if (error) throw error;
      toast.success(`Joined ${group.name}`);
      await load();
    } catch (err) {
      toast.error("Could not join", err instanceof Error ? err.message : undefined);
    } finally {
      setJoining(null);
    }
  }

  async function handleCreate() {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("groups").insert({
        creator_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        category,
      });
      if (error) throw error;
      toast.success("Group created");
      setShowCreate(false);
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      toast.error("Could not create group", err instanceof Error ? err.message : undefined);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteGroup(id: string) {
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete group", error.message);
      return;
    }
    toast.success("Group deleted");
    await load();
  }

  if (!profile) return null;

  if (activeGroup) {
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveGroup(null)} className="flex items-center gap-1.5 text-xs text-mist hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> All groups
        </button>
        <div>
          <h3 className="text-lg font-display font-semibold text-white">{activeGroup.name}</h3>
          <p className="text-xs text-mist">{CATEGORY_LABEL[activeGroup.category]}</p>
        </div>
        <CommunityFeed groupId={activeGroup.id} />
      </div>
    );
  }

  if (loading) return <p className="text-sm text-mist text-center py-6">Loading groups...</p>;

  return (
    <div className="space-y-5">
      <TierGate requiredTier="pro" currentTier={profile.tier} featureName="creating groups">
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-amber border border-amber/40 rounded-full px-3.5 py-1.5 hover:bg-amber/10"
        >
          <Plus className="h-3.5 w-3.5" /> New group
        </button>
        {showCreate && (
          <div className="glass-pro glass p-4 mt-3 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GroupCategory)}
              className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none"
            >
              {(Object.keys(CATEGORY_LABEL) as GroupCategory[]).map((c) => (
                <option key={c} value={c} className="bg-surface">
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-amber hover:bg-amber/90 disabled:opacity-50 text-void text-xs font-semibold px-4 py-2"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create
            </button>
          </div>
        )}
      </TierGate>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="glass p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setActiveGroup(group)} className="text-left flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white hover:text-indigo-glow transition-colors">{group.name}</h3>
                <p className="text-[10px] text-mist-dim uppercase tracking-wide">{CATEGORY_LABEL[group.category]}</p>
                {group.description && <p className="text-xs text-mist mt-1">{group.description}</p>}
              </button>
              {group.creator_id === user?.id && (
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  aria-label={`Delete ${group.name}`}
                  className="text-mist-dim hover:text-red-400 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-1 text-[10px] text-mist-dim">
                <Users className="h-3 w-3" /> {group.member_count ?? 0} members
              </span>
              {myGroupIds.has(group.id) ? (
                <span className="text-[10px] text-emerald">Joined</span>
              ) : (
                <TierGate requiredTier="plus" currentTier={profile.tier} featureName="joining groups">
                  <button
                    onClick={() => handleJoin(group)}
                    disabled={joining === group.id}
                    className="text-[10px] text-indigo-glow border border-indigo-glow/40 rounded-full px-2.5 py-1 hover:bg-indigo/10"
                  >
                    {joining === group.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Join"}
                  </button>
                </TierGate>
              )}
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && <p className="text-sm text-mist text-center py-10">No groups yet.</p>}
    </div>
  );
}
