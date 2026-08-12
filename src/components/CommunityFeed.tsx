"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, Heart, Loader2, Lock, MessageCircle, Send, Sparkles, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { fetchDisplayNames, type DisplayName } from "@/lib/community";
import type { CommunityComment, CommunityPost, MilestoneType, PostType } from "@/lib/types";

const POST_TYPE_LABEL: Record<PostType, string> = {
  progress_update: "Progress update",
  workout_achievement: "Workout achievement",
  question: "Question",
  nutrition_experience: "Nutrition experience",
  milestone: "Milestone",
  tip: "Tip",
};

/** Free can share a structured progress snapshot; the rest of the composer is Plus+. */
const FREE_POST_TYPES: PostType[] = ["progress_update", "milestone"];

const MILESTONE_LABEL: Record<MilestoneType, string> = {
  workout: "Workout milestone",
  strength: "Strength milestone",
  consistency: "Consistency milestone",
  goal: "Goal achieved",
};

interface EnrichedPost extends CommunityPost {
  reaction_count: number;
  comment_count: number;
  reacted_by_me: boolean;
}

export default function CommunityFeed({ groupId = null }: { groupId?: string | null }) {
  const { user, profile } = useApp();
  const toast = useToast();
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [names, setNames] = useState<Map<string, DisplayName>>(new Map());
  const [loading, setLoading] = useState(true);

  const [postType, setPostType] = useState<PostType>("progress_update");
  const [milestoneType, setMilestoneType] = useState<MilestoneType>("consistency");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Map<string, CommunityComment[]>>(new Map());
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  const loadFeed = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(30);
    query = groupId ? query.eq("group_id", groupId) : query.is("group_id", null);
    const { data: postRows } = await query;
    const rows = (postRows as CommunityPost[]) ?? [];

    const ids = rows.map((p) => p.id);
    const [{ data: reactions }, { data: allComments }] = await Promise.all([
      ids.length ? supabase.from("community_reactions").select("post_id,user_id").in("post_id", ids) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from("community_comments").select("*").in("post_id", ids).order("created_at") : Promise.resolve({ data: [] }),
    ]);

    const reactionRows = (reactions as { post_id: string; user_id: string }[]) ?? [];
    const commentRows = (allComments as CommunityComment[]) ?? [];
    const commentsByPost = new Map<string, CommunityComment[]>();
    for (const c of commentRows) {
      commentsByPost.set(c.post_id, [...(commentsByPost.get(c.post_id) ?? []), c]);
    }
    setComments(commentsByPost);

    const enriched: EnrichedPost[] = rows.map((p) => ({
      ...p,
      reaction_count: reactionRows.filter((r) => r.post_id === p.id).length,
      comment_count: commentsByPost.get(p.id)?.length ?? 0,
      reacted_by_me: !!user && reactionRows.some((r) => r.post_id === p.id && r.user_id === user.id),
    }));
    setPosts(enriched);

    const allAuthorIds = [...rows.map((p) => p.user_id), ...commentRows.map((c) => c.user_id)];
    setNames(await fetchDisplayNames(allAuthorIds));
    setLoading(false);
  }, [groupId, user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await loadFeed();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFeed]);

  async function handlePost() {
    if (!user || !content.trim()) return;
    if (profile?.tier === "free" && !FREE_POST_TYPES.includes(postType)) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        group_id: groupId,
        post_type: postType,
        milestone_type: postType === "milestone" ? milestoneType : null,
        content: content.trim(),
      });
      if (error) throw error;
      setContent("");
      toast.success("Posted");
      await loadFeed();
    } catch (err) {
      toast.error("Could not post", err instanceof Error ? err.message : undefined);
    } finally {
      setPosting(false);
    }
  }

  async function toggleReaction(post: EnrichedPost) {
    if (!user) return;
    if (post.reacted_by_me) {
      await supabase.from("community_reactions").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("community_reactions").insert({ post_id: post.id, user_id: user.id });
    }
    await loadFeed();
  }

  async function handleComment(postId: string) {
    if (!user) return;
    const text = commentDraft[postId]?.trim();
    if (!text) return;
    const { error } = await supabase.from("community_comments").insert({ post_id: postId, user_id: user.id, content: text });
    if (error) {
      toast.error("Could not comment", error.message);
      return;
    }
    setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
    await loadFeed();
  }

  async function handleDeletePost(id: string) {
    await supabase.from("community_posts").delete().eq("id", id);
    toast.success("Post deleted");
    await loadFeed();
  }

  async function handleDeleteComment(id: string) {
    await supabase.from("community_comments").delete().eq("id", id);
    await loadFeed();
  }

  async function submitReport(targetType: "post" | "comment", targetId: string) {
    if (!user || !reportReason.trim()) return;
    const { error } = await supabase
      .from("community_reports")
      .insert({ reporter_id: user.id, target_type: targetType, target_id: targetId, reason: reportReason.trim() });
    if (error) {
      toast.error("Could not submit report", error.message);
      return;
    }
    setReportingId(null);
    setReportReason("");
    toast.success("Reported", "Thanks — we'll take a look.");
  }

  function toggleCommentsOpen(postId: string) {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }

  if (!profile) return null;

  return (
    <div className="space-y-5">
      <div className="glass p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(POST_TYPE_LABEL) as PostType[]).map((t) => {
            const locked = profile.tier === "free" && !FREE_POST_TYPES.includes(t);
            return (
              <button
                key={t}
                onClick={() => !locked && setPostType(t)}
                disabled={locked}
                title={locked ? "Upgrade to Plus to post this type" : undefined}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  locked
                    ? "bg-white/[0.02] border-hairline text-mist-dim cursor-not-allowed"
                    : postType === t
                      ? "bg-indigo/20 border-indigo-glow/50 text-indigo-glow"
                      : "bg-white/5 border-hairline text-mist"
                }`}
              >
                {locked && <Lock className="h-2.5 w-2.5" />}
                {POST_TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>
        {profile.tier === "free" && (
          <p className="text-[10px] text-mist-dim">
            Free shares your progress or milestones. Upgrade to Plus for achievements, questions, and tips.
          </p>
        )}
        {postType === "milestone" && (
          <select
            value={milestoneType}
            onChange={(e) => setMilestoneType(e.target.value as MilestoneType)}
            className="rounded-lg bg-white/5 border border-hairline px-3 py-1.5 text-xs text-white outline-none"
          >
            {(Object.keys(MILESTONE_LABEL) as MilestoneType[]).map((m) => (
              <option key={m} value={m} className="bg-surface">
                {MILESTONE_LABEL[m]}
              </option>
            ))}
          </select>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share something with the community..."
          rows={2}
          className="w-full rounded-lg bg-white/5 border border-hairline px-3 py-2 text-sm text-white placeholder:text-mist-dim outline-none focus:border-indigo-glow/50 resize-none"
        />
        <button
          onClick={handlePost}
          disabled={posting || !content.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-indigo hover:bg-indigo/90 disabled:opacity-50 text-[#fff] text-xs font-medium px-4 py-2 transition-colors"
        >
          {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Post
        </button>
      </div>

      {loading && <p className="text-sm text-mist text-center py-6">Loading feed...</p>}

      {!loading && posts.length === 0 && (
        <p className="text-sm text-mist text-center py-10">
          Nothing here yet — {profile.tier === "free" ? "check back soon." : "be the first to post."}
        </p>
      )}

      {posts.map((post) => {
        const author = names.get(post.user_id);
        const postComments = comments.get(post.id) ?? [];
        return (
          <div key={post.id} className="glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-indigo/20 flex items-center justify-center text-[10px] text-indigo-glow font-medium">
                  {(author?.full_name ?? "P")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{author?.full_name ?? "PulseFit member"}</p>
                  <p className="text-[10px] text-mist-dim">
                    {POST_TYPE_LABEL[post.post_type]}
                    {post.milestone_type && ` · ${MILESTONE_LABEL[post.milestone_type]}`}
                  </p>
                </div>
              </div>
              {post.user_id === user?.id && (
                <button onClick={() => handleDeletePost(post.id)} aria-label="Delete post" className="text-mist-dim hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>

            <div className="flex items-center gap-4 text-xs text-mist">
              <button
                onClick={() => toggleReaction(post)}
                className={`flex items-center gap-1 transition-colors ${post.reacted_by_me ? "text-red-400" : "hover:text-white"}`}
              >
                <Heart className={`h-3.5 w-3.5 ${post.reacted_by_me ? "fill-current" : ""}`} />
                {post.reaction_count}
              </button>
              <button onClick={() => toggleCommentsOpen(post.id)} className="flex items-center gap-1 hover:text-white">
                <MessageCircle className="h-3.5 w-3.5" />
                {post.comment_count}
              </button>
              <button onClick={() => setReportingId(reportingId === post.id ? null : post.id)} className="flex items-center gap-1 hover:text-amber ml-auto">
                <Flag className="h-3.5 w-3.5" />
              </button>
            </div>

            {reportingId === post.id && (
              <div className="flex items-center gap-2">
                <input
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Why are you reporting this?"
                  className="flex-1 rounded-lg bg-white/5 border border-hairline px-2 py-1.5 text-xs text-white outline-none"
                />
                <button
                  onClick={() => submitReport("post", post.id)}
                  className="text-xs text-amber px-2 py-1.5 rounded-lg border border-amber/40 hover:bg-amber/10"
                >
                  Submit
                </button>
              </div>
            )}

            {openComments.has(post.id) && (
              <div className="space-y-2 pt-1 border-t border-hairline">
                {postComments.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-2 text-xs pt-2">
                    <p className="text-slate-300">
                      <span className="text-white font-medium">{names.get(c.user_id)?.full_name ?? "Member"}</span>{" "}
                      {c.content}
                    </p>
                    {c.user_id === user?.id && (
                      <button onClick={() => handleDeleteComment(c.id)} className="text-mist-dim hover:text-red-400 shrink-0">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    value={commentDraft[post.id] ?? ""}
                    onChange={(e) => setCommentDraft((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleComment(post.id)}
                    placeholder="Add a comment..."
                    className="flex-1 rounded-lg bg-white/5 border border-hairline px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-glow/50"
                  />
                  <button onClick={() => handleComment(post.id)} aria-label="Send comment" className="text-indigo-glow">
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
