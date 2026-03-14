# Mainspring

*The mechanism behind your working hours*

Personal APS timesheet and leave management app. Tracks daily work hours, calculates flex time, and manages leave balances.

## Stack

- Next.js (App Router) + TypeScript
- shadcn/ui (Tailwind CSS)
- Supabase (PostgreSQL + Auth)
- Vercel

## Getting Started

```bash
cp .env.example .env.local  # Fill in Supabase and GitHub OAuth credentials
npm install
npm run dev
```

## Database

Run migrations in order from `supabase/migrations/` against your Supabase project.
