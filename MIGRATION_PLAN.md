# Mainspring — Migration Plan: prototype → MVP

Goal: make the terminal-UI (`/preview`) the **real app** — port it onto the
authenticated routes, persist to Supabase, and deploy.

Status: **Phase 1 done** (schema + types). The `/preview` is a complete
mock-only prototype; the existing authenticated app + DB encode an **older
model** and are being replaced phase by phase.

Progress:
- [x] **Phase 1 — Data model & migrations.** Clean migration set
  (`001_enums`…`004_triggers`), new `timesheet_segments` table, leave `status`,
  TOIL dropped, `public_holidays` table + `state` setting, RLS, regenerated
  `src/lib/types/database.ts`. Old feature components now mismatch the new types
  (expected — rewritten in Phases 2–4).
- [ ] Phase 2 — Data layer (utils tz fix, queries, server actions)
- [ ] Phase 3 — App shell & routing
- [ ] Phase 4 — Port panels to real data (retire old screens)
- [ ] Phase 5 — Auth & config
- [ ] Phase 6 — Provision & host
- [ ] Phase 7 — Verify

---

## The model shift (what changed during the prototype)

| Concept | Old (current DB/app) | New (prototype) |
|---|---|---|
| Running balance | **TOIL** (`007` renamed flex→toil) | **FLEX** (TOIL folded in; one balance) |
| A day | one row, single `entry_type`, fixed time fields | one entry + **N contiguous segments** (typed blocks) |
| Part-day leave | not really supported | day timeline tiles work/leave/flex with no gaps |
| Leave approval | none | entry **status**: planned / pending / approved |
| Leave types | annual, personal, **toil** | annual (REC), personal (PRS) — flex derived |
| Type codes | full words | WRK / REC / PRS / FLEX / PHOL |
| Navigation | sidebar + bottom nav (routes) | tab codes + `/`-command line + panels + keyboard |

---

## Phase 0 — Decisions to lock first

- **D1. Migrations:** rewrite a clean ordered set (greenfield — nothing deployed)
  rather than patch the old ones. *Recommend: clean rewrite.*
- **D2. Where flex/worked is computed:** app-side (TS, port the prototype calc)
  vs DB triggers. *Recommend: app-side for MVP; revisit DB-enforced later.*
- **D3. Cache derived totals:** store `worked_minutes`/`flex_minutes` on
  `timesheet_entries` (recomputed on save from segments) for fast aggregation,
  segments remain source of truth. *Recommend: yes, cache.*
- **D4. Public holidays:** ✅ **DECIDED — auto-populate AU + state.** Add a
  `public_holidays` reference table + a `state` setting; seed from a verified
  source (data.gov.au / Nager.Date) — done in Phase 6 to avoid hardcoding wrong
  dates. App treats matching dates as PHOL.
- **D5. Mobile:** ✅ **DECIDED — desktop-first, degrade gracefully.**
- **D7. Type model:** day = segments (source of truth). `timesheet_entries`
  caches a primary `entry_type` for fast calendar/list display + filtering;
  lunch is a `break` segment (timeline tiles with no gaps).
- **D6. Routing:** tabs = real Next routes (`/dashboard`…); a persistent client
  **shell** (nav, F-key bar, command line, edit modal, help) lives in the
  authenticated layout and survives route changes. `/t.w1` navigates + focuses a
  panel. *Recommend: real routes + shell.*

---

## Phase 1 — Data model & migrations

New schema (clean set):
- **enums**: `entry_type`/`segment_type` = work, annual_leave, personal_leave,
  public_holiday, flex_day, other; `leave_status` = planned, pending, approved;
  `leave_type` = annual, personal (drop toil).
- **timesheet_entries**: id, user_id, `date` (unique per user), `note`,
  `status` (leave_status, nullable), cached `worked_minutes`/`flex_minutes`,
  timestamps. UNIQUE(user_id, date).
- **timesheet_segments** (NEW): id, entry_id (FK cascade), user_id (RLS), `seq`,
  `type` (segment_type), `start_time`, `end_time`.
- **leave_balances**: annual, personal only.
- **leave_transactions**: annual/personal (accruals, debits, adjustments).
- **settings**: keep (already has pay-fortnight anchor); drop toil references.
- **RLS**: every table scoped to `auth.uid()`, incl. segments.
- Regenerate `src/lib/types/database.ts` for the new schema.

Retire: `007_rename_flex_to_toil.sql`, toil enum members, flex-cashout RPC.

## Phase 2 — Data layer

- **Fix timezone bugs** in `src/lib/utils/format.ts` (getWeekStart, getDayName,
  isWeekend, addDays, formatDate* — all use local time). Use UTC like the
  prototype's helpers. `pay-fortnight.ts` is already UTC-safe — keep.
- **Derivations** (port from prototype): per-entry worked/flex/leave from
  segments; week/fortnight totals; running flex balance = Σ entry flex_minutes.
- **Queries**: getEntry(date)+segments, getEntriesRange(start,end)+segments,
  getLeaveBalances, getLeaveTransactions, getSettings.
- **Mutations (server actions)**: upsertEntry(date, segments[], note, status)
  — writes entry + replaces segments in a tx, recomputes cached totals;
  deleteEntry; adjustLeaveBalance; processAccruals (UTC-safe); upsertSettings;
  initializeBalances.

## Phase 3 — App shell & routing

- Authenticated `layout.tsx` → TUI **shell** (client): top bar, tab nav (codes),
  function-key bar, command line, edit-modal host, help overlay. Holds
  selectedDate / activePanel / modal / command state in a context.
- Keyboard model (from prototype): `/tab.panel`, letter tab-jumps, contextual
  arrows + `e`, F-keys. Persists across route navigations.
- Tabs map to routes; data fetched server-side per route, panels are client
  components fed that data.

## Phase 4 — Port panels to real data (retire old screens)

- Dashboard: balances (derived flex + leave) + thisweek.
- Timesheet: week1 / week2 / pivoted totals from fortnight entries.
- Calendar: month / week / fortnight / list + filter from range queries.
- Leave: balances / transactions / adjust → queries + actions.
- Settings: form → settings actions.
- Edit modal: load entry+segments for the date, save via upsertEntry.
- CSV export: update columns (FLEX not TOIL; segment-aware).
- **Delete** old `components/{dashboard,timesheet,calendar,leave,settings}` +
  `layout/{sidebar,bottom-nav,header,app-shell}` + the old client wrappers.

## Phase 5 — Auth & config

- Real Supabase project + GitHub OAuth provider; keep `AUTHORISED_GITHUB_ID`
  gate (middleware already does this).
- Remove `/preview` from middleware public paths + delete the preview folder +
  dummy `.env.local` once ported; real env in place.

## Phase 6 — Provision & host

- Supabase (via MCP): create project, apply migrations, enable GitHub OAuth,
  seed settings + opening balances. Capture URL / anon / service-role keys.
- GitHub OAuth app (your account): callback URLs for localhost + prod.
- Vercel: connect repo, set env vars, configure Supabase auth redirect URLs,
  merge branch → `main` to auto-deploy.

## Phase 7 — Verify

- E2E: log in → log a day (incl. a split) → flex updates → schedule leave with
  status → run accruals → export CSV. Confirm timezone fix. Mobile sanity pass.

---

## Reuse vs retire

**Reuse:** `pay-fortnight.ts`, `csv.ts`, `cn`, the Supabase clients +
middleware/auth flow, `components/ui/*` (shadcn primitives the TUI builds on),
the prototype's calc + component logic.

**Rewrite:** `format.ts` (tz bugs), `types/database.ts` (new schema), all
queries/actions (segment + FLEX model), CSV columns.

**Retire:** old feature components & client wrappers, sidebar/bottom-nav layout,
toil-specific code, migration `007` + flex-cashout RPC, the `/preview` scaffold
(after porting).
