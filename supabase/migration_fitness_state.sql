-- Data foundation for the Fitness State engine. Run once in Supabase SQL Editor.

-- Subjective recovery inputs (self-reported, alongside the wearable-sourced fields
-- biometric_entries already has: resting_hr, hrv_ms, sleep_hours, sleep_quality_pct).
alter table public.biometric_entries
  add column if not exists soreness smallint check (soreness between 1 and 5),
  add column if not exists energy smallint check (energy between 1 and 5),
  add column if not exists stress smallint check (stress between 1 and 5);

-- Actual daily nutrition intake (distinct from ai_plans, which stores *generated sample*
-- meal plans, not what the user actually ate).
create table if not exists public.nutrition_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists nutrition_logs_user_date_idx on public.nutrition_logs (user_id, log_date desc);

alter table public.nutrition_logs enable row level security;

create policy "nutrition_logs: crud own" on public.nutrition_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Weekly AI reviews (Plus+): stores the deterministic stats + AI interpretation together
-- so past reviews remain readable without recomputing.
create table if not exists public.weekly_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  stats jsonb not null,
  summary jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists weekly_reviews_user_week_idx on public.weekly_reviews (user_id, week_start desc);

alter table public.weekly_reviews enable row level security;

create policy "weekly_reviews: crud own" on public.weekly_reviews for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
