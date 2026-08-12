-- PulseFit AI — core schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Uses auth.users (Supabase Auth) as the identity source; every table is
-- scoped to auth.uid() via Row Level Security so users can only touch their
-- own rows.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles: one row per user, holds onboarding answers + subscription tier
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  tier text not null default 'free' check (tier in ('free', 'plus', 'pro')),
  sex text check (sex in ('male', 'female')),
  age integer,
  height_cm numeric,
  weight_kg numeric,
  activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  goal text check (goal in ('lose_fat', 'maintain', 'build_muscle', 'recomposition')),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  equipment text[] default '{}',
  target_weight_kg numeric,
  target_date date,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- workout_logs: individual set/session entries, also powers the streak heatmap
-- ---------------------------------------------------------------------------
create table if not exists public.workout_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  exercise_name text not null,
  sets integer,
  reps integer,
  weight_kg numeric,
  rpe numeric check (rpe between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists workout_logs_user_date_idx on public.workout_logs (user_id, log_date desc);

-- ---------------------------------------------------------------------------
-- biometric_entries: daily wearable/manual biometric readings (Pro tier)
-- ---------------------------------------------------------------------------
create table if not exists public.biometric_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  resting_hr integer,
  hrv_ms integer,
  sleep_hours numeric,
  sleep_quality_pct numeric,
  steps integer,
  readiness_score numeric,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists biometric_entries_user_date_idx on public.biometric_entries (user_id, entry_date desc);

-- ---------------------------------------------------------------------------
-- ai_plans: generated diet / workout / goal-blueprint plans (Plus tier)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('diet', 'workout', 'goal_blueprint')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_plans_user_type_idx on public.ai_plans (user_id, plan_type, created_at desc);

-- ---------------------------------------------------------------------------
-- coach_messages: AuraCoach chat history (Pro tier)
-- ---------------------------------------------------------------------------
create table if not exists public.coach_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_user_idx on public.coach_messages (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workout_logs enable row level security;
alter table public.biometric_entries enable row level security;
alter table public.ai_plans enable row level security;
alter table public.coach_messages enable row level security;

create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

create policy "workout_logs: crud own" on public.workout_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "biometric_entries: crud own" on public.biometric_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_plans: crud own" on public.ai_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "coach_messages: crud own" on public.coach_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
