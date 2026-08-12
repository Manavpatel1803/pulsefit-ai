"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, Plus, Trash2, Trophy } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import TierGate from "@/components/TierGate";
import { supabase } from "@/lib/supabase";
import {
  challengeStatusLabel,
  computeAdvancedChallengeStats,
  computeChallengePace,
  computeChallengeProgress,
  computePersonalChallengeStats,
  fetchDisplayNames,
  isChallengeComplete,
  type DisplayName,
} from "@/lib/community";
import { notifyUser } from "@/lib/notifications";
import { localDateString } from "@/lib/date";
import { TIER_RANK } from "@/lib/types";
import type { Challenge, ChallengeParticipant, ChallengeType } from "@/lib/types";

export default function ChallengesPanel() {
  const { user, profile, workoutLogs, biometricEntries } = useApp();
  const toast = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participants, setParticipants] = useState<Map<string, ChallengeParticipant[]>>(new Map());
  const [names, setNames] = useState<Map<string, DisplayName>>(new Map());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [challengeType, setChallengeType] = useState<ChallengeType>("workout_count");
  const [goalValue, setGoalValue] = useState(20);
  const [days, setDays] = useState(30);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: challengeRows } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
    const rows = (challengeRows as Challenge[]) ?? [];
    setChallenges(rows);

    const ids = rows.map((c) => c.id);
    const { data: participantRows } = ids.length
      ? await supabase.from("challenge_participants").select("*").in("challenge_id", ids)
      : { data: [] };
    const rows2 = (participantRows as ChallengeParticipant[]) ?? [];
    const byChallenge = new Map<string, ChallengeParticipant[]>();
    for (const p of rows2) {
      byChallenge.set(p.challenge_id, [...(byChallenge.get(p.challenge_id) ?? []), p].sort((a, b) => b.progress_value - a.progress_value));
    }
    setParticipants(byChallenge);
    setNames(await fetchDisplayNames(rows2.map((p) => p.user_id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function notifyIfNearGoal(challenge: Challenge, progress: number) {
    if (!user) return;
    const pct = progress / challenge.goal_value;
    if (pct >= 0.8 && pct < 1) {
      await notifyUser(
        supabase,
        user.id,
        "challenge_progress",
        "Almost there",
        `You're ${Math.round(pct * 100)}% of the way through "${challenge.title}".`,
        24
      );
    }
  }

  async function handleJoin(challenge: Challenge) {
    if (!user) return;
    setJoining(challenge.id);
    try {
      const progress = computeChallengeProgress(challenge, workoutLogs, biometricEntries);
      const { error } = await supabase.from("challenge_participants").insert({
        challenge_id: challenge.id,
        user_id: user.id,
        progress_value: progress,
        completed: isChallengeComplete(challenge, progress),
      });
      if (error) throw error;
      toast.success("Joined challenge");
      await notifyIfNearGoal(challenge, progress);
      await load();
    } catch (err) {
      toast.error("Could not join", err instanceof Error ? err.message : undefined);
    } finally {
      setJoining(null);
    }
  }

  async function handleRefreshProgress(challenge: Challenge) {
    if (!user) return;
    const progress = computeChallengeProgress(challenge, workoutLogs, biometricEntries);
    await supabase
      .from("challenge_participants")
      .update({ progress_value: progress, completed: isChallengeComplete(challenge, progress) })
      .eq("challenge_id", challenge.id)
      .eq("user_id", user.id);
    await notifyIfNearGoal(challenge, progress);
    await load();
  }

  async function handleCreate() {
    if (!user || !title.trim()) return;
    setCreating(true);
    try {
      const start = localDateString();
      const end = localDateString(new Date(Date.now() + days * 86400000));
      const { error } = await supabase.from("challenges").insert({
        creator_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        challenge_type: challengeType,
        goal_value: goalValue,
        start_date: start,
        end_date: end,
      });
      if (error) throw error;
      toast.success("Challenge created");
      setShowCreate(false);
      setTitle("");
      setDescription("");
      await load();
    } catch (err) {
      toast.error("Could not create challenge", err instanceof Error ? err.message : undefined);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteChallenge(id: string) {
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete challenge", error.message);
      return;
    }
    toast.success("Challenge deleted");
    await load();
  }

  if (!profile) return null;
  if (loading) return <p className="text-sm text-mist text-center py-6">Loading challenges...</p>;

  return (
    <div className="space-y-5">
      <TierGate requiredTier="pro" currentTier={profile.tier} featureName="creating challenges">
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-amber border border-amber/40 rounded-full px-3.5 py-1.5 hover:bg-amber/10"
        >
          <Plus className="h-3.5 w-3.5" /> New challenge
        </button>
        {showCreate && (
          <div className="glass-pro glass p-4 mt-3 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Challenge title"
              className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white outline-none"
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                value={challengeType}
                onChange={(e) => setChallengeType(e.target.value as ChallengeType)}
                className="rounded-lg bg-white/5 border border-hairline px-2 py-2 text-xs text-white outline-none"
              >
                <option value="workout_count" className="bg-surface">Workout count</option>
                <option value="steps" className="bg-surface">Total steps</option>
              </select>
              <input
                type="number"
                value={goalValue}
                onChange={(e) => setGoalValue(Number(e.target.value))}
                placeholder="Goal"
                className="rounded-lg bg-white/5 border border-hairline px-2 py-2 text-xs text-white outline-none"
              />
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                placeholder="Days"
                className="rounded-lg bg-white/5 border border-hairline px-2 py-2 text-xs text-white outline-none"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-amber hover:bg-amber/90 disabled:opacity-50 text-ink text-xs font-semibold px-4 py-2"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create
            </button>
          </div>
        )}
      </TierGate>

      <TierGate requiredTier="plus" currentTier={profile.tier} featureName="personal challenge statistics">
        <PersonalStatsStrip userId={user?.id ?? ""} participants={Array.from(participants.values()).flat()} />
      </TierGate>

      <TierGate requiredTier="pro" currentTier={profile.tier} featureName="advanced challenge analytics">
        <AdvancedStatsPanel userId={user?.id ?? ""} participants={Array.from(participants.values()).flat()} challenges={challenges} />
      </TierGate>

      {challenges.map((challenge) => {
        const list = participants.get(challenge.id) ?? [];
        const mine = list.find((p) => p.user_id === user?.id);
        const status = challengeStatusLabel(challenge);
        const locked = TIER_RANK[profile.tier] < TIER_RANK[challenge.min_tier];
        const pace = mine ? computeChallengePace(challenge, mine.progress_value) : null;
        return (
          <div key={challenge.id} className="glass p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-white">{challenge.title}</h3>
                  {challenge.min_tier !== "free" && (
                    <span className="text-[9px] uppercase tracking-wide text-amber border border-amber/40 rounded-full px-2 py-0.5">
                      {challenge.min_tier}
                    </span>
                  )}
                  {challenge.creator_id === user?.id && (
                    <button
                      onClick={() => handleDeleteChallenge(challenge.id)}
                      aria-label={`Delete ${challenge.title}`}
                      className="text-mist-dim hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {challenge.description && <p className="text-xs text-mist mt-0.5">{challenge.description}</p>}
                <p className="text-[10px] text-mist-dim mt-1 uppercase tracking-wide">
                  {status} · goal {challenge.goal_value} {challenge.challenge_type === "steps" ? "steps" : "sessions"}
                </p>
              </div>
              {!mine ? (
                <button
                  onClick={() => !locked && handleJoin(challenge)}
                  disabled={joining === challenge.id || locked}
                  title={locked ? `Upgrade to ${challenge.min_tier} to join` : undefined}
                  className={`flex items-center gap-1 text-xs rounded-full px-3 py-1.5 shrink-0 ${
                    locked
                      ? "text-mist-dim border border-hairline cursor-not-allowed"
                      : "text-indigo-glow border border-indigo-glow/40 hover:bg-indigo/10"
                  }`}
                >
                  {joining === challenge.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : locked ? (
                    <>
                      <Lock className="h-2.5 w-2.5" /> Join
                    </>
                  ) : (
                    "Join"
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleRefreshProgress(challenge)}
                  className="text-xs text-mist border border-hairline rounded-full px-3 py-1.5 hover:text-white shrink-0"
                >
                  Refresh progress
                </button>
              )}
            </div>

            {mine && (
              <div className="space-y-1">
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${mine.completed ? "bg-emerald" : "bg-indigo"}`}
                    style={{ width: `${Math.min(100, (mine.progress_value / challenge.goal_value) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-mist">
                  Your progress: {mine.progress_value} / {challenge.goal_value} {mine.completed && "· Complete!"}
                </p>
                {profile.tier !== "free" && pace && !mine.completed && status === "active" && (
                  <p className={`text-[10px] ${pace.onPace ? "text-emerald" : "text-amber"}`}>
                    {pace.daysRemaining}d left · {pace.onPace ? "on pace" : "behind pace"}
                  </p>
                )}
              </div>
            )}

            {list.length > 0 && (
              <div className="pt-2 border-t border-hairline space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-mist-dim flex items-center gap-1">
                  <Trophy className="h-3 w-3" /> Leaderboard {profile.tier === "pro" && list.length > 5 ? `· all ${list.length}` : ""}
                </p>
                {(profile.tier === "pro" ? list : list.slice(0, 5)).map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-xs ${p.user_id === user?.id ? "text-white" : "text-slate-300"}`}
                  >
                    <span>
                      {i + 1}. {names.get(p.user_id)?.full_name ?? "Member"} {p.user_id === user?.id && "(you)"}
                    </span>
                    <span className="data-readout text-white">{p.progress_value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AdvancedStatsPanel({
  userId,
  participants,
  challenges,
}: {
  userId: string;
  participants: ChallengeParticipant[];
  challenges: Challenge[];
}) {
  const stats = computeAdvancedChallengeStats(userId, participants, challenges);
  return (
    <div className="glass-raised p-5 space-y-2">
      <h3 className="text-xs font-medium text-mist uppercase tracking-wide">Advanced challenge analytics</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <StatTile label="Active now" value={String(stats.activeCount)} />
        <StatTile label="Steps completed" value={`${stats.byType.steps.completed}/${stats.byType.steps.joined}`} />
        <StatTile label="Workout completed" value={`${stats.byType.workout_count.completed}/${stats.byType.workout_count.joined}`} />
      </div>
    </div>
  );
}

function PersonalStatsStrip({ userId, participants }: { userId: string; participants: ChallengeParticipant[] }) {
  const stats = computePersonalChallengeStats(userId, participants);
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatTile label="Joined" value={String(stats.joined)} />
      <StatTile label="Completed" value={String(stats.completed)} />
      <StatTile label="Completion rate" value={stats.completionRatePct !== null ? `${stats.completionRatePct}%` : "—"} />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-4 text-center">
      <p className="text-[10px] uppercase tracking-wide text-mist-dim mb-1">{label}</p>
      <p className="text-lg font-semibold data-readout text-white">{value}</p>
    </div>
  );
}
