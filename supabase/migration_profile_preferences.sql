-- Expanded onboarding preferences + newsletter subscription state.
-- injury_flags reuses the exact same values AuraCoachAgent's InjuryFlag type already
-- uses, so onboarding answers can pre-fill that Pro feature directly.
-- Run once in Supabase SQL Editor.

alter table public.profiles
  add column if not exists dietary_preference text
    check (dietary_preference in ('none', 'vegetarian', 'vegan', 'pescatarian', 'keto')),
  add column if not exists injury_flags text[] not null default '{}',
  add column if not exists preferred_workout_time text
    check (preferred_workout_time in ('morning', 'afternoon', 'evening', 'flexible')),
  add column if not exists motivation_style text
    check (motivation_style in ('solo', 'community', 'reminders', 'competition')),
  add column if not exists newsletter_subscribed boolean not null default false,
  add column if not exists newsletter_subscribed_at timestamptz,
  add column if not exists newsletter_prompted boolean not null default false;
