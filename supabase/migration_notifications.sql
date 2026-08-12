-- Notifications & retention (Phase 8). Run once in Supabase SQL Editor.

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('weekly_review_ready', 'plan_adjusted', 'challenge_progress')),
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications: crud own" on public.notifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_review_ready boolean not null default true,
  plan_adjusted boolean not null default true,
  challenge_progress boolean not null default true
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences: crud own" on public.notification_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
