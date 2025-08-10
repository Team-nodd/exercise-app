# FitTracker Pro – Exercise & Coaching Platform

A production-ready coaching and athlete platform built with Next.js, Supabase, and TypeScript.

## 🚀 Highlights

- Coach and Athlete roles with secure Supabase Auth (RLS enabled)
- Programs with calendar view (drag/drop via shared calendar)
- Workouts (Gym and Cardio) with immediate UI updates on duplication/reschedule
- Exercise Library with tabs: Gym Exercises and Cardio Templates
- Cardio Templates (name, intensity_type, duration_minutes, target_tss, target_ftp)
- Optimistic “Send Workout Email” from workout detail with success/failure toasts
- Coach notified when an athlete successfully sends a workout email

## 🛠 Tech Stack

- Next.js 15, React 19, TypeScript
- Tailwind CSS, shadcn/ui
- Supabase (PostgreSQL, Auth, RLS)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

## 🚀 Getting Started

### 1. Clone

```bash
git clone <repository-url>
cd exercise-app
```

### 2. Install

```bash
npm install
```

### 3. Environment

Create `.env.local` with the following keys (fill with your values):

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Service role (required for server-created notifications)
# Used by API route: /api/notifications/create
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# SMTP (required for all email features)
# Common ports: 587 (STARTTLS), 465 (SMTPS)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_inbox_username
SMTP_PASS=your_inbox_password_or_app_password
SMTP_FROM=no-reply@yourdomain.com
SMTP_FROM_NAME=FitTracker Pro
```

You can find Supabase values in Supabase → Settings → API. If `SUPABASE_SERVICE_ROLE_KEY` is missing, creating notifications from the server route will fail with a 500 (server misconfiguration).

### 4. Database

Migrations live in `supabase/migrations/` and are idempotent. Core schema is defined in `20241202030000_core_schema.sql` and includes: tables, FKs, indexes, `updated_at` triggers, and RLS policies matching `src/types/database.ts`.

```bash
# Link once
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push

# Generate local TS types from live schema (keep types in sync)
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```

### 5. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000.

## 👥 Roles

- Coach: manages programs, workouts, exercises, cardio templates
- Athlete: views programs, completes workouts, sends summaries

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Athlete dashboard
│   ├── coach/            # Coach dashboard
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── coach/           # Coach-specific components
│   ├── exercises/       # Exercise-related components
│   ├── layout/          # Layout components
│   ├── providers/       # Context providers
│   └── ui/              # Reusable UI components
├── lib/                  # Utility libraries
│   └── supabase/        # Supabase client configuration
├── types/               # TypeScript type definitions
└── styles/              # Global styles
```

## 🔧 Key Features

- Users: profiles with role
- Exercises: library with instructions and images
- Cardio Templates: reusable cardio definitions
- Programs: owned by a coach, assigned to an athlete
- Workouts: gym or cardio; gym has nested workout_exercises
- Notifications: in-app notifications with RLS

## 🧪 Testing (quick manual)

- Login as coach → create program → create workouts → verify calendar
- Use Exercise in Program (Gym) → choose program and workout → verify items
- Use Cardio in Program → choose program and workout → apply template
- Workout Detail → Send Email → check optimistic toast and coach notification

## 🔒 Security

- Supabase RLS on all user data
- Notifications and cardio templates have scoped policies
- Server route uses `SUPABASE_SERVICE_ROLE_KEY` to insert notifications after authenticating the caller

## 🧩 Supabase Client

- Auth: signup, login, session
- DB: CRUD via `supabase.from(...).select/insert/update/delete`

## 🐛 Troubleshooting

- Ensure `.env.local` Supabase vars are set and correct
- Run `npx supabase db push` if DB schema changes
- Re-generate `src/types/database.ts` after schema changes
- If notification creation fails: verify `SUPABASE_SERVICE_ROLE_KEY` exists and is correct
- If SMTP send fails: verify `SMTP_*` envs, try `SMTP_PORT=587` (STARTTLS), and check provider/app password settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
