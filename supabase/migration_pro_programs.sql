-- Pro tier: "Multiple goals/programs" (spec update).
-- Profiles carry exactly one goal/target_weight_kg/target_date today, which every
-- deterministic calculation (BMR/TDEE, blueprint, decision engine) already reads.
-- fitness_programs lets a Pro user save several named goal snapshots and switch which
-- one is "active" — activating a program just writes its fields back onto profiles, so
-- every existing calculation keeps working unmodified. Only one program is ever active
-- per user; that's enforced in the app layer (two writes: deactivate the rest, activate
-- the chosen one), not a DB trigger, to keep this migration simple.
-- Run once in Supabase SQL Editor.

create table if not exists public.fitness_programs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  goal text not null check (goal in ('lose_fat', 'maintain', 'build_muscle', 'recomposition')),
  target_weight_kg numeric,
  target_date date,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists fitness_programs_user_idx on public.fitness_programs (user_id, created_at desc);

alter table public.fitness_programs enable row level security;

create policy "programs: crud own" on public.fitness_programs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
