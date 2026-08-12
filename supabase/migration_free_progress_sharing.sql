-- Free tier: "Optional progress sharing" (spec update).
-- community_posts.post_type already distinguishes structured, opt-in progress
-- shares (progress_update, milestone) from general community authorship
-- (workout_achievement, question, nutrition_experience, tip) — see the column
-- comment in migration_community.sql. That distinction was never wired into
-- the insert policy, which required Plus+ for every post type. This migration
-- lets Free post progress_update/milestone only; everything else stays Plus+.
-- Run once in Supabase SQL Editor.

drop policy if exists "posts: plus+ create own" on public.community_posts;

create policy "posts: create own" on public.community_posts for insert
  with check (
    auth.uid() = user_id
    and (
      post_type in ('progress_update', 'milestone')
      or exists (select 1 from public.profiles where id = auth.uid() and tier in ('plus', 'pro'))
    )
  );
