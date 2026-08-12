-- SECURITY FIX: the "profiles: update own" policy (from the original schema.sql)
-- lets a user update their OWN row, but has no column-level restriction — so any
-- authenticated user can currently PATCH their own tier to 'pro' directly via the
-- REST API, bypassing Stripe entirely. Confirmed exploitable.
--
-- Fix: a BEFORE UPDATE trigger that silently reverts tier/stripe_* fields back to
-- their existing values unless the write comes from the service_role (i.e. the
-- Stripe webhook, via lib/supabaseAdmin.ts). RLS still allows the update to
-- proceed (so legitimate profile edits — age, weight, goal, etc. — are untouched);
-- this trigger only neutralizes the four billing-sensitive columns.
--
-- Run this in Supabase SQL Editor immediately.

create or replace function public.protect_billing_fields()
returns trigger as $$
begin
  if auth.role() <> 'service_role' then
    new.tier := old.tier;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.stripe_subscription_status := old.stripe_subscription_status;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_billing_fields_trigger on public.profiles;
create trigger protect_billing_fields_trigger
  before update on public.profiles
  for each row execute function public.protect_billing_fields();
