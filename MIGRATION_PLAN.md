# Mainspring — Migration Plan: prototype → MVP

Goal: make the terminal-UI (`/preview`) the **real app** — port it onto the
authenticated routes, persist to Supabase, and deploy.

Status: **Phases 1–3 done.** Branch `terminal-aesthetic-reskin` builds & deploys
(Vercel green). The `/preview` is the **design reference** (still mock); the
authenticated routes now use the new TUI shell with stub panels awaiting data.

---

## ▶ RESUME HERE — Phase 6 (next session)

**Phase 4a–4f + Phase 5 done** (build + typecheck green). All five tabs render
real data-backed panels; `panel-stub.tsx` deleted.

**Phase 5 — auth & config done:**
- Renamed `src/middleware.ts` → `src/proxy.ts` (Next 16 `proxy` convention;
  function `middleware`→`proxy`). `src/lib/supabase/middleware.ts` (Supabase's own
  helper) kept as-is.
- Deleted `src/app/preview/` and removed `/preview` from `publicPaths` in
  `src/lib/supabase/middleware.ts`. `AUTHORISED_GITHUB_ID` gate already lives
  there (checks `user_metadata.provider_id`/`sub`).
- Reskinned `login` + `not-authorized` to the TUI (TerminalFrame); login shows
  `?error` on failed callback. GitHub OAuth server action unchanged.
- Added `.env.example` (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY + AUTHORISED_GITHUB_ID).
  `.env.local` still holds PLACEHOLDER creds so it builds locally — **Phase 6
  swaps in the real project's creds.**

**Phase 6 is provisioning (mostly outside the code) — needs the user / live
services. Do with the user, not solo:**
- Supabase (via the connected Supabase MCP): create project, apply the
  `supabase/migrations` set, enable GitHub OAuth, seed `settings` + opening
  balances (`initializeBalances`). Capture URL / anon / service-role keys.
- GitHub OAuth app (user's account): callback URLs for localhost + prod; set
  `AUTHORISED_GITHUB_ID` to the user's numeric GitHub id.
- Vercel: connect repo, set env vars, configure Supabase auth redirect URLs,
  merge `terminal-aesthetic-reskin` → `main` to deploy.
- Then **4g CSV export** (parked) + **Phase 7** E2E verify.

**4g CSV export is PARKED** — picked up in a later phase, not now. Notes for then:
`src/lib/utils/csv.ts` is a **generic serializer** (`toCSV(headers, rows)`) with
no TOIL/FLEX framing, so no rewrite is needed — just build rows from segment data
and add an entry point (a `/export` command and/or button; none exists yet).

**FLEX/TOIL framing — resolved (commit 0217d06):** plain **FLEX** everywhere, with
ONE explanatory hint kept in the dashboard balances tooltip (`"flex / TOIL
balance"`). Dropped the `flex day (TOIL)` label parenthetical; removed the dead
pre-segment helpers (`calculateToilMinutes`/`calculateWorkedMinutes`/
`calculateLunchDuration`) from `time-calculations.ts`. The model is FLEX-only
(see `001_enums.sql`); don't reintroduce TOIL as a balance/type name.

4a — shared TUI primitives + real edit modal:
- `src/lib/tui/types.ts` — `TYPE_META` / `SEGMENT_TYPES` / `STATUS_TYPES` /
  `LEAVE_TYPE_SEGMENT` + `typeCode/typeLabel/typeColor/typeBorder`, all keyed on
  **DB enum values**. `src/lib/tui/format.ts` — `flexClass/toMinutes/
  isCompleteTime/formatTimeTyping/dayDateLabel/prettyDate` + re-exports
  `fmtFlex/fmtHM`.
- `src/components/tui/{token-select,type-tag,readout,time-input}.tsx` (TimeField
  alongside TimeInput).
- `src/components/shell/edit-modal.tsx` — segment-timeline editor (contiguous
  blocks, lunch = `break` segment, default 08:00–17:00 + settings-sized lunch),
  live calc via `entry-calc`, save→`upsertEntry`, delete→`deleteEntry`. Loads via
  new `loadDayForEdit(date)` action (`src/lib/actions/entries.ts`). Shell wires
  F2=save / F8=delete through a `registerActions` ref; stub modal removed.

4b — dashboard wired to real data:
- `src/lib/utils/today.ts` (`appToday()`, used by layout + pages).
- `src/components/panels/week-panel.tsx` — **reusable** client `WeekPanel`
  (reads `useShell()` for selectedDate/activePanel/openEdit; renders day rows
  with `TypeTag`/flex/status/MISS + week-running readout). Takes `WeekDay[]`
  (Pick of `DayEntry`), `opening` flex, `today`.
- `src/components/panels/balances-panel.tsx` — flex + leave balances (h/days).
- `src/app/(authenticated)/dashboard/page.tsx` — server component fetching
  flex balance + leave balances + settings + this-week entries.

4c — timesheet wired + contextual arrows re-added:
- `src/components/panels/totals-panel.tsx` — pivoted WK1/WK2/PP totals (worked/
  flex/leave-by-type/running-balance); takes precomputed `TotalsColumn[]`.
- `src/app/(authenticated)/timesheet/page.tsx` — server component: pay fortnight
  via `getPayFortnight` (anchor from settings, `localDate()` avoids tz drift),
  two `WeekPanel`s + `TotalsPanel`. `WeekPanel` now sums only its own `dates`
  (callers may pass a wider entry set).
- **Contextual arrow keys** done: `ShellState.registerPanelDates(panelId,dates)`
  (ref-backed Map in the shell); `WeekPanel` registers its dates; shell keydown
  moves `selectedDate` among the active panel's non-weekend dates (wraps). Deps
  now include `activePanel`/`selectedDate`. Reuse the same registration for the
  calendar grid in 4d.

4d — calendar wired (**URL-driven**, so edits reflect via `router.refresh()`):
- `src/lib/tui/calendar.ts` — `getMonthGrid`/`monthLabel`/`WEEKDAY_HEADERS`/
  `PP_HEADERS`/`CAL_VIEWS`, `calendarView(view,cursor,anchor)→{cells,headers,
  label,dimMonth,rangeStart,rangeEnd}`, `stepCursor(view,cursor,dir)`. Also
  centralized `localDate()` in `pay-fortnight.ts` (timesheet now imports it).
- `src/components/panels/calendar-panel.tsx` — month/week/pp grids + list + type
  filter (filter is client-only/visual; view+cursor live in the **URL**). Cell
  click → `openEdit`; registers visible non-weekend dates for arrows. Renders
  straight from the `entries` prop — no client cache.
- `src/app/(authenticated)/calendar/page.tsx` — server component reads
  `searchParams {view, cursor}`, computes the view, fetches the visible range.

4e — leave tab wired (3 panels):
- `src/components/panels/leave-balances-panel.tsx` — annual/personal/flex rows
  (bal h, days, accr/fn, EOFY); takes precomputed `BalanceRow[]`.
- `src/components/panels/leave-transactions-panel.tsx` — history + client type
  filter (all/annual/personal); `getLeaveTransactions`.
- `src/components/panels/leave-adjust-panel.tsx` — form → `adjustLeaveBalance`
  (already a `"use server"` action, **no wrapper needed**) + `router.refresh()`.
- `leave/page.tsx` — fetches balances/transactions/flex/settings; computes FY-end
  (last day of month before `financial_year_start_month`) + fortnights-to-FY-end.

4f — settings form wired:
- `src/components/panels/settings-panel.tsx` — client form for all 8 `Settings`
  fields (standard day as hours→×60, lunch mins, annual/personal days, FY start
  month, pay anchor date, pay start day via weekday `TokenSelect`, state via
  `TokenSelect`) → `upsertSettings` + `router.refresh()`. The preview never built
  this, so it's a from-scratch TUI form.
- `settings/page.tsx` — server component fetching `getSettings`.

**Goal of 4g:** finish Phase 4.
- **4g CSV export** — wire export using `src/lib/utils/csv.ts` (FLEX not TOIL,
  segment-aware columns); likely a server action returning CSV + a client
  download (Blob), or a route handler. **Check `csv.ts`'s current columns FIRST**
  — it may still be TOIL/old-schema-shaped and need rewriting for the segment
  model. No CSV entry point exists in the shell yet — add a command (e.g.
  `/export`) and/or an F-key or settings button.

**What exists now (use these):**
- Shell: `src/components/shell/app-shell.tsx` (chrome, keyboard, command, **stub
  edit modal**), `shell-context.tsx` (`useShell()` → selectedDate, activePanel,
  editOpen, openEdit/closeEdit), `src/lib/shell/nav.ts` (TABS/PANELS/resolvers).
- TUI: `src/components/tui/{terminal-frame,panel-stub}.tsx`.
- Data layer (ready to call): `src/lib/queries/{entries,leave,settings}.ts`,
  `src/lib/actions/{entries,leave,settings}.ts`, `src/lib/utils/{entry-calc,
  format}.ts`.
- **Design reference with all the panel code to port:** `src/app/preview/page.tsx`
  (WeekPanel, TotalsPanel, CalendarPanel/CalList, leave panels, edit modal,
  TokenSelect, TypeTag, Readout, helpers toMin/fmtFlex/flexClass/fmtHM/
  dayDateLabel/prettyDate, STATUS_TYPES). Lift these into `src/components/tui/`
  and `src/components/panels/` as data-driven components.

**Phase 4a steps:**
1. Move shared helpers + `TokenSelect`/`TypeTag`/`Readout` + the
   CODE/COLOR/LABEL/BLOCK_TYPES/STATUS_TYPES maps out of the preview into
   `src/components/tui/` + a `src/lib/tui/` (or similar). **One gotcha:** the
   preview uses short type values (`work/annual/personal/flex/public_holiday`);
   the **DB enum** uses `work/annual_leave/personal_leave/flex_day/public_holiday`
   and segments add `break` (lunch). Key the maps on the **DB enum values**.
2. Real edit modal (replace the stub in `app-shell.tsx`): on open, load the day
   via a **server action wrapping `getDayEntry(date)`** (client can't call the
   query directly); render the segment-timeline editor (default a single work
   block 08:00–17:00 + lunch as a `break` 13:00–14:00 from settings when no
   entry); status selector; live calc via `entry-calc`; save → `upsertEntry`,
   delete → `deleteEntry`. Wire F2=save / F8=delete to the modal.

**Then:** 4b dashboard · 4c timesheet · 4d calendar · 4e leave · 4f settings ·
4g CSV export. Re-add the **contextual arrow keys** (change selected day on a
week panel) when week panels have data — deferred from Phase 3.

---

Progress:
- [x] **Phase 1 — Data model & migrations.** Clean migration set
  (`001_enums`…`004_triggers`), new `timesheet_segments` table, leave `status`,
  TOIL dropped, `public_holidays` table + `state` setting, RLS, regenerated
  `src/lib/types/database.ts`. Old feature components now mismatch the new types
  (expected — rewritten in Phases 2–4).
- [x] **Phase 2 — Data layer.** `format.ts` UTC-safe; `entry-calc.ts` segment
  engine (flex math verified); queries (`entries`/`leave`/`settings`) with
  nested segments; server actions in `src/lib/actions/` (`upsertEntry` writes
  entry+segments and reconciles leave-balance debits, `deleteEntry`,
  `adjustLeaveBalance`, `processAccruals`, `upsertSettings`, `initializeBalances`).
- [x] **Phase 3 — App shell & routing.** New TUI `AppShell` (top bar, tab-code
  nav → routes, F-key bar, `/` command line, help, theme toggle, signout) as a
  persistent client shell; `ShellContext` for cross-route selectedDate /
  activePanel / editOpen; keyboard model (tab letters, `/tab.panel`, F-keys,
  e/Enter) works across routes. Pages are stub panels; old screens / layout /
  queries / actions / export routes **deleted**. **`next build` passes** — the
  branch is deployable again. (Edit-modal real editor + contextual arrows →
  Phase 4.)
- [~] Phase 4 — Port panels to real data (retire old screens). **4a–4f done**
  (all five tabs on real data, edit modal, contextual arrows, stubs deleted,
  FLEX/TOIL framing resolved). **4g CSV export parked** for a later phase.
- [x] **Phase 5 — Auth & config.** middleware→proxy (Next 16); `/preview`
  deleted + dropped from public paths; login/not-authorized reskinned to TUI;
  `.env.example` added; `AUTHORISED_GITHUB_ID` gate in place. Real creds = Phase 6.
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
