-- Plus tier: "More challenges" (spec update).
-- Every challenge today is joinable by any authenticated tier — there's no way to
-- offer a Plus-exclusive challenge. Adds a min_tier column (default 'free', so all
-- existing/starter challenges are unaffected) and enforces it in the join policy at
-- the database, not just the UI. Seeds one Plus-exclusive starter challenge.
-- Run once in Supabase SQL Editor.

alter table public.challenges
  add column if not exists min_tier text not null default 'free' check (min_tier in ('free', 'plus', 'pro'));

drop policy if exists "participants: join own" on public.challenge_participants;

create policy "participants: join own" on public.challenge_participants for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.challenges c
      join public.profiles p on p.id = auth.uid()
      where c.id = challenge_id
        and (
          c.min_tier = 'free'
          or (c.min_tier = 'plus' and p.tier in ('plus', 'pro'))
          or (c.min_tier = 'pro' and p.tier = 'pro')
        )
    )
  );

insert into public.challenges (title, description, challenge_type, goal_value, start_date, end_date, min_tier)
select 'Plus 60-Day Volume Push', 'Log 45 training sessions in 60 days — for members serious about consistency.', 'workout_count', 45, current_date, (current_date + interval '60 days')::date, 'plus'
where not exists (select 1 from public.challenges where title = 'Plus 60-Day Volume Push');
