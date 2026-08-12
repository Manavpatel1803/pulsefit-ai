-- Community & Accountability (Phase 7). Run once in Supabase SQL Editor.
-- Tier gating is enforced HERE, at the database, not just in the frontend/API —
-- an insert that doesn't meet the tier check is rejected regardless of client.

-- ---------------------------------------------------------------------------
-- Posts (feed). Optional group_id scopes a post to a group's feed instead of
-- the main feed. Optional milestone_type turns a post into an explicit,
-- opt-in "progress share" — never auto-populated from private health data.
-- ---------------------------------------------------------------------------
create table if not exists public.community_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid, -- references groups(id), added after groups table exists
  post_type text not null check (
    post_type in ('progress_update', 'workout_achievement', 'question', 'nutrition_experience', 'milestone', 'tip')
  ),
  milestone_type text check (milestone_type in ('workout', 'strength', 'consistency', 'goal')),
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx on public.community_posts (created_at desc);
create index if not exists community_posts_group_idx on public.community_posts (group_id, created_at desc);

create table if not exists public.community_reactions (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);

create table if not exists public.community_reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.community_blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

-- ---------------------------------------------------------------------------
-- Challenges. progress_value is always a "healthy" metric (steps, sessions) —
-- never a body metric — enforced by convention in the app layer since the
-- column is intentionally generic.
-- ---------------------------------------------------------------------------
create table if not exists public.challenges (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  challenge_type text not null check (challenge_type in ('steps', 'workout_count')),
  goal_value numeric not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_participants (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_value numeric not null default 0,
  completed boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index if not exists challenge_participants_challenge_idx on public.challenge_participants (challenge_id);

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  category text not null check (
    category in ('weight_loss', 'muscle_building', 'running', 'strength', 'beginners', 'home_workouts')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table public.community_posts
  add constraint community_posts_group_id_fkey foreign key (group_id) references public.groups(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.community_posts enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_blocks enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Posts: readable by anyone NOT in a mutual block with the author; only Plus+ can create.
create policy "posts: read unblocked" on public.community_posts for select
  using (
    not exists (
      select 1 from public.community_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = user_id)
         or (b.blocker_id = user_id and b.blocked_id = auth.uid())
    )
  );

create policy "posts: plus+ create own" on public.community_posts for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and tier in ('plus', 'pro'))
  );

create policy "posts: delete own" on public.community_posts for delete
  using (auth.uid() = user_id);

-- Reactions: free tier can react/unreact on anything visible.
create policy "reactions: read all" on public.community_reactions for select using (true);
create policy "reactions: create own" on public.community_reactions for insert with check (auth.uid() = user_id);
create policy "reactions: delete own" on public.community_reactions for delete using (auth.uid() = user_id);

-- Comments: free tier can comment; visibility respects the same block pairing as posts.
create policy "comments: read unblocked" on public.community_comments for select
  using (
    not exists (
      select 1 from public.community_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = user_id)
         or (b.blocker_id = user_id and b.blocked_id = auth.uid())
    )
  );
create policy "comments: create own" on public.community_comments for insert with check (auth.uid() = user_id);
create policy "comments: delete own" on public.community_comments for delete using (auth.uid() = user_id);

-- Reports: anyone can file; only the reporter can see their own report.
create policy "reports: create own" on public.community_reports for insert with check (auth.uid() = reporter_id);
create policy "reports: read own" on public.community_reports for select using (auth.uid() = reporter_id);

-- Blocks: fully self-managed.
create policy "blocks: crud own" on public.community_blocks for all
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- Challenges: readable by all; only Pro can create; creator can delete their own.
create policy "challenges: read all" on public.challenges for select using (true);
create policy "challenges: pro create" on public.challenges for insert
  with check (
    auth.uid() = creator_id
    and exists (select 1 from public.profiles where id = auth.uid() and tier = 'pro')
  );
create policy "challenges: delete own" on public.challenges for delete using (auth.uid() = creator_id);

-- Challenge participation: free tier can join any challenge; progress is self-reported
-- from the user's own logged data (computed client-side from data RLS already scopes to them).
create policy "participants: read all" on public.challenge_participants for select using (true);
create policy "participants: join own" on public.challenge_participants for insert with check (auth.uid() = user_id);
create policy "participants: update own progress" on public.challenge_participants for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "participants: leave own" on public.challenge_participants for delete using (auth.uid() = user_id);

-- Groups: readable by all; only Pro can create; creator can delete their own.
create policy "groups: read all" on public.groups for select using (true);
create policy "groups: pro create" on public.groups for insert
  with check (
    auth.uid() = creator_id
    and exists (select 1 from public.profiles where id = auth.uid() and tier = 'pro')
  );
create policy "groups: delete own" on public.groups for delete using (auth.uid() = creator_id);

-- Group membership: joining a group is a Plus+ feature.
create policy "group_members: read all" on public.group_members for select using (true);
create policy "group_members: plus+ join own" on public.group_members for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and tier in ('plus', 'pro'))
  );
create policy "group_members: leave own" on public.group_members for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Safe public display names. profiles RLS only allows reading your OWN row
-- (by design — it holds goal/weight/Stripe fields), so the feed can't join
-- against it directly. This function exposes only name + avatar for a batch
-- of user ids, nothing else, bypassing RLS via SECURITY DEFINER intentionally
-- and narrowly for that purpose only.
-- ---------------------------------------------------------------------------
create or replace function public.get_display_names(uids uuid[])
returns table (id uuid, full_name text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select id, full_name, avatar_url from public.profiles where id = any(uids);
$$;

grant execute on function public.get_display_names(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Starter challenges (system-seeded, creator_id null, joinable by everyone)
-- ---------------------------------------------------------------------------
insert into public.challenges (title, description, challenge_type, goal_value, start_date, end_date)
select '10K Steps Challenge', 'Average 10,000 steps a day this month.', 'steps', 300000, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date
where not exists (select 1 from public.challenges where title = '10K Steps Challenge');

insert into public.challenges (title, description, challenge_type, goal_value, start_date, end_date)
select '30-Day Consistency', 'Log a workout on 20 of the next 30 days.', 'workout_count', 20, current_date, (current_date + interval '30 days')::date
where not exists (select 1 from public.challenges where title = '30-Day Consistency');
