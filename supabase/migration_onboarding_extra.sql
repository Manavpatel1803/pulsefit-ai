-- Three additional onboarding questions (training frequency, sleep goal, biggest
-- challenge) for the 12-question onboarding wizard. Run once in Supabase SQL Editor.

alter table public.profiles
  add column if not exists training_days_per_week smallint
    check (training_days_per_week between 1 and 7),
  add column if not exists sleep_goal_hours numeric(3, 1)
    check (sleep_goal_hours between 4 and 12),
  add column if not exists biggest_challenge text
    check (biggest_challenge in ('time', 'motivation', 'knowledge', 'nutrition', 'injury')),
  -- Set once the user picks Free/Plus/Pro on the post-questionnaire plan screen.
  -- Distinct from onboarding_complete (answered the questionnaire) so a mid-flow
  -- reload resumes at the plan screen instead of re-asking all 12 questions.
  add column if not exists plan_selected boolean not null default false;
