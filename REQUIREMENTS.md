# Mainspring — User Requirements

*"The mechanism behind your working hours"*

## 1. Overview

**Mainspring** is a personal timesheet and leave management web app for a single APS (Australian Public Service) user. The app tracks daily work hours, calculates flex time against a 7h 30m standard day, and manages leave balances for annual, personal/sick, and TOIL/flex cashout.

**Repository**: `mainspring`

### 1.1 Technical stack

- **Frontend**: Next.js (App Router) + TypeScript
- **UI**: shadcn/ui (Tailwind CSS + Radix primitives)
- **Backend / database**: Supabase (PostgreSQL + Auth)
- **Authentication**: GitHub OAuth via Supabase Auth (single user — restrict to one authorised GitHub account)
- **Hosting**: Vercel
- **Source control**: GitHub repository

### 1.2 Design principles

- Mobile-responsive — usable on phone for quick daily entry
- Minimal clicks for the most common action (logging a day's hours)
- All times in AEST/AEDT (Australia/Brisbane or Australia/Sydney as appropriate)
- All calculations server-side or in Supabase functions where practical, to maintain data integrity

---

## 2. Authentication & authorisation

1. GitHub OAuth login via Supabase Auth
2. On first login, the app should check the authenticated user's GitHub ID against an environment variable (`AUTHORISED_GITHUB_ID`). If it does not match, deny access and show a "not authorised" message.
3. All database tables should use Supabase Row Level Security (RLS) policies scoped to the authenticated user's `auth.uid()`.
4. Session persistence — remain logged in across browser sessions until explicit logout.

---

## 3. Data model

### 3.1 `timesheet_entries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Default `gen_random_uuid()` |
| `user_id` | uuid (FK → auth.users) | RLS-scoped |
| `date` | date | Unique per user — one entry per day |
| `start_time` | time | Work start (e.g. 08:00) |
| `end_time` | time | Work finish (e.g. 16:30) |
| `lunch_start` | time | Lunch break start |
| `lunch_end` | time | Lunch break end |
| `worked_minutes` | integer | Auto-calculated: (end − start) − (lunch_end − lunch_start) |
| `flex_minutes` | integer | Auto-calculated: worked_minutes − 450 (7h 30m = 450 min) |
| `note` | text | Optional — free text (e.g. "WFH", "RDO", meeting notes) |
| `entry_type` | enum | `work`, `annual_leave`, `personal_leave`, `public_holiday`, `flex_day`, `other` |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Auto-updated on change |

**Business rules:**

- When `entry_type` is `work`, all time fields are required. `worked_minutes` and `flex_minutes` are calculated automatically.
- When `entry_type` is a leave type or public holiday, time fields are optional/null. `worked_minutes` defaults to 450 (counts as a standard day — no flex impact). `flex_minutes` defaults to 0.
- When `entry_type` is `flex_day`, `worked_minutes` = 0 and `flex_minutes` = −450 (debits a full day from the flex balance).
- A partial flex day (e.g. leave at 2pm) should be handled by entering actual start/end times — the flex calculation handles it naturally.

### 3.2 `leave_balances`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | RLS-scoped |
| `leave_type` | enum | `annual`, `personal`, `toil` |
| `balance_hours` | decimal(8,2) | Current balance in hours |
| `accrual_rate_hours_per_fortnight` | decimal(6,2) | For annual leave: ~5.77h / fortnight (20 days ÷ 26.09 fortnights). For personal: ~2.88h / fortnight (10 days / year). TOIL: 0 (manual only). |
| `last_accrual_date` | date | Date of last accrual calculation |
| `updated_at` | timestamptz | |

**Business rules:**

- Annual leave: 20 days (150 hours) per year, accrued fortnightly.
- Personal/sick leave: 10 days (75 hours) per year, accrued fortnightly. No evidence/certificate tracking required.
- TOIL: manual adjustment only — added when flex is "cashed out".
- Balances can go negative (e.g. leave taken in advance).

### 3.3 `leave_transactions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | RLS-scoped |
| `leave_type` | enum | `annual`, `personal`, `toil` |
| `date` | date | The date the leave applies to |
| `hours` | decimal(6,2) | Positive = accrual/credit. Negative = taken/debit. |
| `description` | text | e.g. "Fortnightly accrual", "Annual leave taken", "Flex cashout — 8h to TOIL" |
| `linked_timesheet_entry_id` | uuid (FK, nullable) | Links to the timesheet entry if leave was recorded there |
| `created_at` | timestamptz | |

### 3.4 `settings`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | RLS-scoped |
| `standard_day_minutes` | integer | Default 450 (7h 30m) |
| `default_lunch_duration_minutes` | integer | Default 30 |
| `annual_leave_days_per_year` | decimal(5,2) | Default 20 |
| `personal_leave_days_per_year` | decimal(5,2) | Default 10 |
| `financial_year_start_month` | integer | Default 7 (July — Australian FY) |
| `pay_fortnight_anchor_date` | date | Default `2026-01-15`. A known pay period start date used to calculate all fortnights. |
| `pay_fortnight_start_day` | integer | Default 4 (Thursday). ISO day-of-week: 1 = Monday … 7 = Sunday. |

---

## 4. Features & views

### 4.1 Dashboard (home page)

The primary landing page after login. Displays at-a-glance status:

1. **Current flex balance** — running total in hours and minutes (e.g. "+12h 45m" or "−3h 15m"), colour-coded green/red.
2. **Leave balances** — card for each leave type showing current balance in days and hours.
3. **Today's entry status** — either a summary of today's logged hours or a prompt to enter them.
4. **This week summary** — total hours worked, total flex earned/spent, days with missing entries highlighted.
5. **Quick entry button** — prominent call to action to log today's hours.

### 4.2 Timesheet entry form

The core data entry interface:

1. **Date picker** — defaults to today. Prevents duplicate entries for the same date (edit mode if entry exists).
2. **Entry type selector** — `Work day`, `Annual leave`, `Personal leave`, `Public holiday`, `Flex day`, `Other`. Conditionally shows/hides time fields.
3. **Time inputs** (for work days):
   a. Start time — time picker, defaults to previous day's start time (or 08:00 if no history).
   b. Lunch start — time picker, defaults to 12:00.
   c. Lunch end — time picker, defaults to lunch start + 30 min.
   d. End time — time picker, no default (must be entered).
4. **Live calculation display** — as times are entered, show:
   a. Total worked time
   b. Lunch duration
   c. Flex for this day (+/−)
   d. Projected running flex balance (current balance + this day's flex)
5. **Notes field** — optional free text.
6. **Save / Update / Delete** buttons.
7. **Validation**:
   a. End time must be after start time.
   b. Lunch start must be between start and end times.
   c. Lunch end must be after lunch start and before end time.
   d. Warn (not block) if worked time exceeds 10 hours or is under 4 hours.

### 4.3 Weekly / fortnightly timesheet view

A tabular view showing a week or fortnight at a time:

1. **Navigation** — previous/next fortnight (or week) buttons, jump-to-date.
2. **Toggle** — switch between weekly (Mon–Fri) and fortnightly (APS pay period) views.
3. **Fortnightly view must align to APS pay periods**, not arbitrary calendar fortnights. See section 5.3 for calculation logic.
4. **Row per day** showing: date, day name, entry type, start, lunch start, lunch end, end, worked time, flex (+/−), notes.
5. **Missing days highlighted** — weekdays without entries shown in amber.
6. **Week/fortnight totals row** — total worked, total flex. In fortnightly view, also show the pay period label (e.g. "PP 15 Jan – 28 Jan 2026").
7. **Click any row** to open that day's entry for editing.
8. **Weekend rows** — shown in grey, collapsed by default. Expandable if weekend work was logged.

### 4.4 Calendar view (leave focus)

A monthly calendar showing leave at a glance:

1. **Colour-coded day cells**: work days (default), annual leave (blue), personal leave (orange), public holidays (green), flex days (purple), other (grey).
2. **Click a day** to open that day's entry or create one.
3. **Month navigation** — previous/next month, jump to month/year.
4. **Side panel or legend** showing leave balance summary.
5. **Highlight today**.

### 4.5 Leave management

A dedicated view for managing leave balances:

1. **Balance summary cards** — one per leave type. Shows: current balance (hours and days), accrual rate, projected balance at end of financial year.
2. **Transaction history** — filterable table showing all leave transactions (accruals, debits, adjustments) with date, type, hours, and description.
3. **Manual adjustment form** — ability to add/subtract hours with a reason (e.g. initial balance setup, corrections, flex-to-TOIL conversion).
4. **Flex-to-TOIL cashout** — dedicated action: enter hours to convert from flex balance to TOIL balance. This should:
   a. Debit the specified hours from the running flex total (by creating a timesheet adjustment or dedicated mechanism).
   b. Credit the same hours to the TOIL leave balance.
   c. Create transactions in `leave_transactions` for audit trail.
5. **Accrual automation** — a mechanism (Supabase cron / edge function, or manual trigger) to process fortnightly leave accruals.

### 4.6 Export to CSV

1. **Timesheet export** — select date range, export all timesheet entries to CSV.
2. **Leave transactions export** — select date range and/or leave type, export to CSV.
3. **Columns should match the table views** — human-readable, not raw database columns.
4. **Filename format**: `timesheet_YYYY-MM-DD_to_YYYY-MM-DD.csv` or `leave_transactions_YYYY-MM-DD_to_YYYY-MM-DD.csv`.

### 4.7 Settings page

1. **Standard day length** — editable, defaults to 7h 30m.
2. **Default lunch duration** — used as default in the entry form.
3. **Annual leave entitlement** — days per year.
4. **Personal leave entitlement** — days per year.
5. **Financial year start month** — defaults to July.
6. **Pay fortnight anchor date** — a known pay period start date (defaults to 15 January 2026). Used to calculate all pay period boundaries. Only needs changing if the APS pay cycle shifts.
7. **Initial balance setup** — fields to set starting balances for each leave type and flex (for when the app is first deployed mid-year).

---

## 5. Flex time calculation logic

### 5.1 Core formula

```
worked_minutes = (end_time − start_time) − (lunch_end − lunch_start)
flex_minutes = worked_minutes − standard_day_minutes
```

### 5.2 Running balance

The flex balance is the **sum of all `flex_minutes`** across all `timesheet_entries` for the user. It is not stored as a separate value — it is derived.

- Work day with 8h logged → flex = +30m
- Work day with 7h logged → flex = −30m
- Leave day → flex = 0 (no impact)
- Flex day off → flex = −450m (debits a full standard day)
- Flex-to-TOIL cashout → creates a synthetic entry or adjustment that debits the flex balance

### 5.3 APS pay fortnight alignment

The app must align fortnightly views and leave accruals to the actual APS pay cycle, not arbitrary calendar fortnights.

**Cycle definition:**

- Pay fortnights run **Thursday to Wednesday** (14 days).
- Anchor date: **15 January 2026** (a known pay period start — stored in `settings.pay_fortnight_anchor_date`).

**Calculation logic (determine which pay fortnight a given date falls in):**

```
function getPayFortnight(targetDate: Date, anchorDate: Date): { start: Date, end: Date } {
  const msPerDay = 86400000;
  const daysDiff = Math.floor((targetDate.getTime() - anchorDate.getTime()) / msPerDay);
  const fortnightOffset = Math.floor(daysDiff / 14);
  const start = new Date(anchorDate.getTime() + (fortnightOffset * 14 * msPerDay));
  const end = new Date(start.getTime() + (13 * msPerDay));
  return { start, end };
}
```

This works forwards and backwards from the anchor. For any date, it returns the Thursday start and Wednesday end of that pay period.

**Where this applies:**

1. **Fortnightly timesheet view** — navigation steps through pay periods, not calendar fortnights. The header shows the pay period label (e.g. "PP: 15 Jan – 28 Jan 2026").
2. **Leave accruals** — fortnightly accruals are triggered per pay period, not per calendar fortnight. The `last_accrual_date` in `leave_balances` should correspond to a pay period end date.
3. **Dashboard** — "this fortnight" summary should reference the current pay period.
4. **Flex summary per fortnight** — the fortnightly view totals row shows net flex for that pay period.

### 5.4 Display format

- Always show as hours and minutes: "+2h 15m", "−0h 45m"
- Positive = green, negative = red
- Zero = neutral/grey

---

## 6. Non-functional requirements

1. **Performance**: Page loads under 2 seconds. Dashboard data should load in a single query or minimal round trips.
2. **Responsive design**: Fully usable on mobile (375px width) through desktop. Entry form optimised for phone use.
3. **Accessibility**: Meet WCAG 2.1 AA. Keyboard navigable, appropriate ARIA labels, sufficient contrast.
4. **Data integrity**: All flex and leave calculations enforced at the database level where practical (triggers or computed columns). Frontend calculations are for display only — the database is the source of truth.
5. **Timezone**: All times stored and displayed in Australian Eastern time. Use `Australia/Brisbane` (AEST, no DST) unless the user configures otherwise.
6. **Error handling**: Clear error messages for validation failures. Graceful handling of network errors with retry options.
7. **Offline**: Not required for v1. If the user is offline, show a clear message.

---

## 7. Deployment & environment

### 7.1 Repository structure

```
/
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components (shadcn/ui based)
│   ├── lib/             # Utilities, Supabase client, types
│   └── styles/          # Global styles
├── supabase/
│   └── migrations/      # SQL migration files
├── public/
├── .env.local           # Local env vars (not committed)
├── .env.example         # Template for required env vars
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### 7.2 Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-side only
AUTHORISED_GITHUB_ID=             # GitHub user ID to restrict access
```

### 7.3 Supabase setup

1. Create a new Supabase project.
2. Enable GitHub OAuth provider in Supabase Auth settings.
3. Run migration files to create tables, enums, RLS policies, and any triggers/functions.
4. Migration files should be idempotent and ordered (e.g. `001_initial_schema.sql`, `002_rls_policies.sql`).

### 7.4 Vercel deployment

1. Connect GitHub repo to Vercel.
2. Set environment variables in Vercel project settings.
3. Auto-deploy on push to `main` branch.
4. Preview deployments on pull requests.

---

## 8. UI/UX notes

### 8.1 Typography

- **Primary font**: Inter (Google Fonts) — load via `next/font/google` for automatic optimisation.
- **Apply globally** as the base font across all UI elements and shadcn/ui components.
- **Weights to load**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold).
- **Configure in Tailwind** as the default sans-serif font: `fontFamily: { sans: ['Inter', ...defaultTheme.fontFamily.sans] }`.

### 8.2 Brand colours

Extend the shadcn/ui theme with these brand colours. Use them for primary actions, accents, and identity elements — not to replace the full shadcn palette.

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-navy` | `#1B3A5C` | Primary brand colour — sidebar background, primary buttons, headings, logo mark |
| `brand-gold` | `#C9964C` | Accent — active states, highlights, progress indicators, logo arbor |
| `brand-gold-light` | `#D4AA6A` | Hover/light accent variant |
| `brand-navy-light` | `#C8D4E2` | Dark mode primary — replaces navy in dark theme |
| `brand-gold-dark` | `#D4AA6A` | Dark mode accent — replaces gold in dark theme |

**Application:**

- **Primary button**: `brand-navy` background, white text. Hover: slightly lighter.
- **Accent/secondary button**: `brand-gold` background, navy text.
- **Sidebar / navigation**: `brand-navy` background (desktop), white text, `brand-gold` for active item indicator.
- **Flex positive**: green (keep shadcn default). **Flex negative**: red (keep shadcn default). Do not use brand colours for data semantics.
- **Cards and surfaces**: Use shadcn defaults. Brand colours for borders or subtle accents only.
- **Login page**: Mainspring logo lockup centred, `brand-navy` heading, `brand-gold` accent on the GitHub OAuth button.

### 8.3 Logo assets

Place the SVG logo files in `public/`:

- `public/logo-mark.svg` — coil mark only (for favicon, app icon)
- `public/logo-lockup.svg` — mark + wordmark (for login page, OG image)
- `public/logo-mark-dark.svg` — light variant for dark backgrounds

Generate `favicon.ico` and `apple-touch-icon.png` from the mark SVG during build or provide as static assets.

### 8.4 General UI

1. **Navigation**: Sidebar on desktop, bottom tab bar on mobile. Items: Dashboard, Timesheet, Calendar, Leave, Settings.
2. **Dark mode**: Support system preference toggle via shadcn/ui theming. Swap brand colours per the dark mode tokens above.
3. **Loading states**: Skeleton loaders for dashboard cards and tables.
4. **Confirmation dialogs**: Required for delete actions and flex-to-TOIL conversions.
5. **Toast notifications**: For save success, errors, and warnings.

---

## 9. Future considerations (out of scope for v1)

These are not required for the initial build but should not be precluded by architectural decisions:

1. Public holiday auto-population (Australian / state-specific).
2. Reporting — monthly/quarterly summary reports.
3. Multiple users (team lead view).
4. Integration with HR systems.
5. Push notifications for missing timesheet entries.
6. PWA / installable app.

---

## 10. Acceptance criteria summary

The app is complete when:

1. A user can log in via GitHub OAuth and be validated against the authorised account.
2. A user can create, read, update, and delete daily timesheet entries with time fields.
3. Flex time is automatically calculated per entry and a running balance is displayed.
4. Leave balances for annual, personal, and TOIL are visible and accurate.
5. Leave can be recorded, and balances update accordingly.
6. Flex-to-TOIL cashout works and creates an audit trail.
7. All four views (dashboard, weekly timesheet, calendar, leave management) are functional and responsive.
8. CSV export works for timesheet entries and leave transactions.
9. Settings are configurable and persist.
10. The app is deployed on Vercel and accessible via a public URL with GitHub OAuth protecting access.
