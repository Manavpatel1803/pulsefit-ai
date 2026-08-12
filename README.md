# PulseFit AI

AI-powered fitness and biometric intelligence. PulseFit tracks real training, recovery, and nutrition data — never guessed defaults — and layers AI-explained coaching, adaptive programs, and injury-aware load adjustments on top as you move up tiers.

Built with Next.js 16 (App Router, Turbopack), React 19, Supabase, Groq, Stripe, and Resend.

## Features by tier

**Free**
- Onboarding covering body stats, activity, goal, diet, injuries, experience, equipment, training time, and motivation style
- Today dashboard driven by your actual logged workouts, recovery, and nutrition
- BMR/TDEE calculators, workout library, gym streak tracker, sleep & recovery tracker
- Community feed, groups, and challenges
- Daily fitness/nutrition tip newsletter (opt-in, sent via Resend)

**Plus** — adds AI-explained daily priority, AI goal blueprint, AI-generated workout and diet plans, AuraCoach RPE-based load adjustments, and advanced challenge analytics.

**Pro** — adds a full biometric dashboard, recovery intelligence (HRV/RHR baseline deviation), nutrition auto-recalibration, workout plateau detection, long-term trend + predictive goal completion, multiple concurrent programs, and advanced data exports.

Billing (upgrade/downgrade/cancel) runs through Stripe Checkout and the Stripe Customer Portal.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Supabase (Postgres, Auth, Row Level Security, Edge Functions, pg_cron)
- **AI:** Groq (coaching, plan generation, decision engine)
- **Payments:** Stripe (Checkout, Customer Portal, webhooks)
- **Email:** Resend (transactional + daily tip newsletter)
- **Motion:** GSAP + `@gsap/react`
- **Testing:** Vitest

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GROQ_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PLUS_PRICE_ID=
STRIPE_PRO_PRICE_ID=

RESEND_API_KEY=
RESEND_FROM_EMAIL="PulseFit AI <onboarding@resend.dev>"
```

### 3. Set up the database

In the Supabase SQL Editor, run `supabase/schema.sql` first, then each `supabase/migration_*.sql` file. `supabase/functions/daily-tip` is a Deno Edge Function that sends the 9am daily tip email; deploy it with the Supabase CLI (`supabase functions deploy daily-tip`) if you want the newsletter to actually send — `migration_newsletter_cron.sql` wires up the `pg_cron` schedule that calls it.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest suite |

## Project structure

```
src/
  app/            # Routes, API handlers (app router), global styles
  components/      # UI components
  lib/             # Domain logic, engines, and integrations (Supabase, Stripe, Groq, Resend)
  context/         # App-wide React context (auth/profile/fitness state)
supabase/
  schema.sql              # Base schema — run first
  migration_*.sql         # Incremental migrations — run in any order after schema.sql
  functions/daily-tip/    # Edge Function for the daily newsletter
```

## Deployment

Deploys cleanly to [Vercel](https://vercel.com/new) or any Next.js-compatible host — set the environment variables above in your hosting provider, and point the Stripe webhook at `/api/stripe/webhook`.
