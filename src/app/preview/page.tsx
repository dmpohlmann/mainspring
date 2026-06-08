"use client";

/**
 * TEMPORARY preview page — no auth, mock data only.
 * Exists to eyeball the terminal-aesthetic reskin before rolling it across
 * the real screens. Delete this folder once the look is approved.
 */

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getPayFortnight, DEFAULT_ANCHOR_DATE } from "@/lib/utils/pay-fortnight";
import { getDayName } from "@/lib/utils/format";
import { toast } from "sonner";

// UTC-safe date helpers for deterministic preview math (the real app utils use
// local time, which mismatches the fixed-UTC reference date below).
function addDaysUTC(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function sundayStartUTC(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // back to Sunday (0 = Sun)
  return d.toISOString().slice(0, 10);
}

// Reference "today" for the mock, and the REAL pay period it falls in.
const TODAY = new Date(Date.UTC(2026, 5, 7)); // 2026-06-07 (a Sunday)
const PP = getPayFortnight(TODAY, DEFAULT_ANCHOR_DATE);

// Current week, Sunday-start (Sun 07 Jun – Sat 13 Jun; today is the Sunday).
const TODAY_STR = TODAY.toISOString().slice(0, 10);
const WEEK_START_STR = sundayStartUTC(TODAY_STR);
const THIS_WEEK = Array.from({ length: 7 }, (_, i) => addDaysUTC(WEEK_START_STR, i));

function dayDateLabel(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function prettyDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const WEEKDAY_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// 42-cell (6-week) month grid, Sunday-start, as ISO date strings.
function getMonthGrid(year: number, month: number) {
  const firstStr = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const startDow = new Date(firstStr + "T00:00:00Z").getUTCDay();
  const gridStart = addDaysUTC(firstStr, -startDow);
  return Array.from({ length: 42 }, (_, i) => addDaysUTC(gridStart, i));
}

/* ── helpers ───────────────────────────────────────────────────────────── */

function toMin(t: string) {
  const [h, m] = (t ?? "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0; // tolerate partial typing
  return h * 60 + m;
}

// Normalise digits as you type into HH:MM (e.g. "0830" → "08:30").
function formatTimeTyping(raw: string) {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}
function fmtFlex(min: number) {
  const sign = min < 0 ? "−" : "+";
  const a = Math.abs(min);
  return `${sign}${Math.floor(a / 60)}h ${String(a % 60).padStart(2, "0")}m`;
}
function flexClass(min: number) {
  if (min > 0) return "text-green-600 dark:text-green-400";
  if (min < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

/* Box-drawing window chrome to sell the "terminal" feel.
   A panel is a TerminalFrame with a panelId — navigable + highlightable. */
function TerminalFrame({
  title,
  children,
  panelId,
  active,
}: {
  title: string;
  children: React.ReactNode;
  panelId?: string;
  active?: boolean;
}) {
  return (
    <div
      id={panelId ? `panel-${panelId}` : undefined}
      className={`border bg-card ${
        active ? "border-secondary ring-1 ring-secondary/50" : "border-border"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b px-3 py-1.5 ${
          active
            ? "border-secondary/50 bg-secondary/10 text-foreground"
            : "border-border bg-muted text-muted-foreground"
        }`}
      >
        <span className="text-red-500">●</span>
        <span className="text-yellow-500">●</span>
        <span className="text-green-500">●</span>
        <span className="ml-2 truncate">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">mainspring@aps</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-primary">~</span>
      <span className="text-secondary"> $ </span>
      {children}
      <span className="ml-0.5 inline-block w-2 animate-pulse bg-secondary align-middle">
        &nbsp;
      </span>
    </p>
  );
}

/* ── mock data ─────────────────────────────────────────────────────────── */

// Full pay fortnight, all 14 days (Thu 04 Jun – Wed 17 Jun 2026).
const PP_START_STR = PP.start.toISOString().slice(0, 10);
const FORTNIGHT_DATES = Array.from({ length: 14 }, (_, i) => addDaysUTC(PP_START_STR, i));

type MockEntry = {
  type: string;
  start: string;
  lstart: string;
  lend: string;
  end: string;
  status?: string; // leave approval state: planned | pending | approved
};

// Mock entries keyed by ISO date. Days NOT listed are blank (or "missing" if a
// past weekday). 05 Jun left empty on purpose to show the "missing" state.
const FORTNIGHT_ENTRIES: Record<string, MockEntry> = {
  "2026-06-04": { type: "work", start: "08:00", lstart: "12:00", lend: "12:30", end: "16:35" },
  "2026-06-09": { type: "annual", start: "—", lstart: "—", lend: "—", end: "—", status: "approved" },
  "2026-06-11": { type: "flex", start: "—", lstart: "—", lend: "—", end: "—", status: "planned" },
};

function entryFlex(e: MockEntry) {
  if (e.type === "flex") return -450; // flex day off debits a full standard day
  if (e.type !== "work") return 0; // leave / public holiday — no flex impact
  return toMin(e.end) - toMin(e.start) - (toMin(e.lend) - toMin(e.lstart)) - 450;
}

function isWeekendDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z").getUTCDay();
  return d === 0 || d === 6;
}

function entryWorked(e: MockEntry) {
  if (e.type !== "work") return 0;
  return toMin(e.end) - toMin(e.start) - (toMin(e.lend) - toMin(e.lstart));
}

const sumWorked = (dates: string[]) =>
  dates.reduce(
    (a, d) => a + (FORTNIGHT_ENTRIES[d] ? entryWorked(FORTNIGHT_ENTRIES[d]) : 0),
    0
  );
const sumFlex = (dates: string[]) =>
  dates.reduce(
    (a, d) => a + (FORTNIGHT_ENTRIES[d] ? entryFlex(FORTNIGHT_ENTRIES[d]) : 0),
    0
  );

// Opening flex balance at the start of the period.
const OPENING_FLEX = 765; // +12h 45m

// Pay fortnight split into week 1 (Thu–Wed) and week 2 (Thu–Wed).
const WK1_DATES = FORTNIGHT_DATES.slice(0, 7);
const WK2_DATES = FORTNIGHT_DATES.slice(7, 14);
const WK1_WORKED = sumWorked(WK1_DATES);
const WK1_FLEX = sumFlex(WK1_DATES);
const WK2_WORKED = sumWorked(WK2_DATES);
const WK2_FLEX = sumFlex(WK2_DATES);
const PP_WORKED = WK1_WORKED + WK2_WORKED;
const PP_FLEX = WK1_FLEX + WK2_FLEX;

// Which date-set each week-style panel drives (for arrow-key day selection).
const PANEL_WEEK_DATES: Record<string, string[]> = {
  thisweek: THIS_WEEK,
  week1: WK1_DATES,
  week2: WK2_DATES,
};

// Leave taken over a date range, in minutes per type (full days = 450m).
// Leave drawn from a balance (REC/PRS) or a public holiday — NOT flex days,
// which are captured in the flex row.
const leaveMinsByType = (dates: string[]): Record<string, number> =>
  dates.reduce(
    (acc, d) => {
      const e = FORTNIGHT_ENTRIES[d];
      if (e && e.type !== "work" && e.type !== "flex")
        acc[e.type] = (acc[e.type] ?? 0) + 450;
      return acc;
    },
    {} as Record<string, number>
  );
const WK1_LEAVE = leaveMinsByType(WK1_DATES);
const WK2_LEAVE = leaveMinsByType(WK2_DATES);
const PP_LEAVE_BY_TYPE = leaveMinsByType(FORTNIGHT_DATES);

const TYPE_BADGE: Record<string, string> = {
  work: "outline",
  annual: "default",
  personal: "default",
  flex: "secondary",
  public_holiday: "outline",
};

// Calendar cell colour per entry type.
const TYPE_COLOR: Record<string, string> = {
  work: "text-foreground",
  annual: "text-blue-500 dark:text-blue-400",
  personal: "text-orange-500 dark:text-orange-400",
  flex: "text-purple-500 dark:text-purple-400",
  public_holiday: "text-green-600 dark:text-green-400",
};

const TABS = ["dashboard", "timesheet", "calendar", "leave", "settings"];
const TAB_CODES: Record<string, string> = {
  dashboard: "DSH",
  timesheet: "TSH",
  calendar: "CAL",
  leave: "LVE",
  settings: "SET",
};

// Panels per tab. `code` is the 2-letter command alias (e.g. d.ne, d.dt, t.ft).
type Panel = { id: string; code: string; label: string };
const PANELS: Record<string, Panel[]> = {
  dashboard: [
    { id: "balances", code: "ba", label: "balances" },
    { id: "thisweek", code: "dt", label: "thisweek" },
  ],
  timesheet: [
    { id: "week1", code: "w1", label: "week1" },
    { id: "week2", code: "w2", label: "week2" },
    { id: "totals", code: "tt", label: "totals" },
  ],
  calendar: [{ id: "month", code: "mo", label: "month" }],
  leave: [
    { id: "balances", code: "ba", label: "balances" },
    { id: "transactions", code: "tx", label: "transactions" },
    { id: "adjust", code: "aj", label: "adjust" },
  ],
  settings: [],
};

// Resolve a command fragment to a tab / panel (accepts code, id, name, letter).
function resolveTab(part: string) {
  return (
    TABS.find(
      (t) => t === part || TAB_CODES[t].toLowerCase() === part || t[0] === part
    ) ?? null
  );
}
function resolvePanel(tabId: string, part: string) {
  return (
    (PANELS[tabId] ?? []).find(
      (p) =>
        p.code === part ||
        p.id === part ||
        p.label.replace(/\s/g, "") === part ||
        p.id[0] === part
    ) ?? null
  );
}

// Classic TUI function-key bar (only F1/F10 wired in this preview).
const FKEYS: [string, string][] = [
  ["F1", "Help"],
  ["F2", "Save"],
  ["F3", "New"],
  ["F5", "Refresh"],
  ["F8", "Delete"],
  ["F10", "Quit"],
];

// A day is a contiguous timeline of blocks. Each block stores its own `end`;
// its start is derived from the previous block's end (the last block always
// ends at the day finish). This guarantees no overlaps and no gaps.
type DayBlock = { id: number; type: string; end: string };

const BLOCK_TYPES = [
  { value: "work", code: "WRK", label: "work" },
  { value: "personal", code: "PRS", label: "personal leave" },
  { value: "annual", code: "REC", label: "recreation (annual) leave" },
  { value: "flex", code: "FLEX", label: "flex day (TOIL)" },
  { value: "public_holiday", code: "PHOL", label: "public holiday" },
];

// Leave approval status (for scheduling ahead). Code doubles as the token label.
const STATUS_TYPES = [
  { value: "planned", code: "planned", label: "planned — not yet submitted" },
  { value: "pending", code: "pending", label: "pending approval" },
  { value: "approved", code: "approved", label: "approved" },
];

const CODE_BY_VALUE: Record<string, string> = Object.fromEntries(
  BLOCK_TYPES.map((t) => [t.value, t.code])
);
const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  BLOCK_TYPES.map((t) => [t.value, t.label])
);

// Calendar view modes and the type filter (all + each entry type).
const CAL_VIEWS = [
  { value: "month", code: "month", label: "month grid" },
  { value: "week", code: "week", label: "week (Sun–Sat)" },
  { value: "pp", code: "fortnight", label: "pay fortnight (Thu–Wed)" },
  { value: "list", code: "list", label: "list" },
];
const CAL_FILTERS = [
  { value: "all", code: "all", label: "all entries" },
  ...BLOCK_TYPES.map((t) => ({ value: t.value, code: t.code, label: t.label })),
];

/* ── leave management mock data ─────────────────────────────────────────── */

// Australian financial year ends 30 June; project accruals to then.
const FY_END = "2026-06-30";
const FORTNIGHTS_TO_FY_END = Math.max(
  0,
  Math.floor(
    (Date.parse(FY_END + "T00:00:00Z") - Date.parse(TODAY_STR + "T00:00:00Z")) /
      (14 * 86400000)
  )
);

// Per-type leave balance (hours) and fortnightly accrual rate.
const LEAVE_BALANCES = [
  { type: "annual", balanceH: 112.5, accrualFn: 5.77 },
  { type: "personal", balanceH: 48.0, accrualFn: 2.88 },
  { type: "flex", balanceH: 12.75, accrualFn: 0 }, // flex accrues from worked hours
];

// Transaction history (newest first).
const LEAVE_TRANSACTIONS = [
  { date: "2026-06-09", type: "annual", hours: -7.5, desc: "Annual leave taken" },
  { date: "2026-06-05", type: "annual", hours: 5.77, desc: "Fortnightly accrual" },
  { date: "2026-06-05", type: "personal", hours: 2.88, desc: "Fortnightly accrual" },
  { date: "2026-05-22", type: "annual", hours: 5.77, desc: "Fortnightly accrual" },
  { date: "2026-05-22", type: "personal", hours: 2.88, desc: "Fortnightly accrual" },
  { date: "2026-04-15", type: "personal", hours: -7.5, desc: "Personal leave taken" },
  { date: "2025-07-01", type: "annual", hours: 105.0, desc: "Opening balance" },
  { date: "2025-07-01", type: "personal", hours: 45.0, desc: "Opening balance" },
];

const LEAVE_FILTERS = [
  { value: "all", code: "all", label: "all types" },
  { value: "annual", code: "REC", label: "recreation (annual) leave" },
  { value: "personal", code: "PRS", label: "personal leave" },
  { value: "flex", code: "FLEX", label: "flex" },
];

function hoursLabel(h: number) {
  return `${h >= 0 ? "+" : "−"}${Math.abs(h).toFixed(2)}h`;
}

type BlockRange = { id: number; type: string; start: string; end: string };

// Resolve stored blocks into concrete start/end ranges tiling dayStart→dayFinish.
function blockRanges(
  blocks: DayBlock[],
  dayStart: string,
  dayFinish: string
): BlockRange[] {
  let prev = dayStart;
  return blocks.map((b, i) => {
    const end = i === blocks.length - 1 ? dayFinish : b.end;
    const range = { id: b.id, type: b.type, start: prev, end };
    prev = end;
    return range;
  });
}

function fmtHM(min: number) {
  const a = Math.abs(min);
  return `${Math.floor(a / 60)}h ${String(a % 60).padStart(2, "0")}m`;
}

function minutesToTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ── page ──────────────────────────────────────────────────────────────── */

export default function PreviewPage() {
  const { theme, setTheme } = useTheme();

  const [tab, setTab] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(TODAY_STR); // entry defaults to today
  const [showHelp, setShowHelp] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdValue, setCmdValue] = useState("");
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false); // edit-day modal
  const [status, setStatus] = useState("planned"); // leave approval status
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(5); // June (0-indexed)
  const [calView, setCalView] = useState("month");
  const [calFilter, setCalFilter] = useState("all");

  // Select a day and open the edit modal (from a row click or "e"/Enter).
  const editDay = (d: string) => {
    setSelectedDate(d);
    setEditOpen(true);
  };

  const shiftMonth = (delta: number) => {
    const total = calYear * 12 + calMonth + delta;
    setCalYear(Math.floor(total / 12));
    setCalMonth(((total % 12) + 12) % 12);
  };
  // Keep the calendar month in sync when the selected day crosses a boundary.
  const syncCalMonth = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00Z");
    setCalYear(d.getUTCFullYear());
    setCalMonth(d.getUTCMonth());
  };
  // Prev/next steps by the active view's unit (month / week / fortnight).
  const calStep = (dir: number) => {
    if (calView === "month") {
      shiftMonth(dir);
      return;
    }
    const d = addDaysUTC(selectedDate, dir * (calView === "pp" ? 14 : 7));
    setSelectedDate(d);
    syncCalMonth(d);
  };

  // Entry form defaults: 08:00–17:00, lunch 13:00–14:00.
  const [start, setStart] = useState("08:00");
  const [lstart, setLstart] = useState("13:00");
  const [lend, setLend] = useState("14:00");
  const [end, setEnd] = useState("17:00");

  // Day timeline: contiguous blocks tiling start→finish. Default = one work block.
  const [blocks, setBlocks] = useState<DayBlock[]>([{ id: 1, type: "work", end: "17:00" }]);
  const nextBlockId = useRef(2);

  const ranges = useMemo(
    () => blockRanges(blocks, start, end),
    [blocks, start, end]
  );

  // Split the last block in two: it ends at the midpoint, a new leave block
  // fills the rest. Keeps the timeline contiguous with no overlap.
  const addBlock = () => {
    setBlocks((bs) => {
      const resolved = blockRanges(bs, start, end);
      const last = resolved[resolved.length - 1];
      const mid = minutesToTime(
        Math.round((toMin(last.start) + toMin(last.end)) / 2)
      );
      const head = bs.slice(0, -1);
      return [
        ...head,
        { ...bs[bs.length - 1], end: mid },
        { id: nextBlockId.current++, type: "annual", end },
      ];
    });
  };
  const updateBlock = (id: number, patch: Partial<DayBlock>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id: number) =>
    setBlocks((bs) => (bs.length > 1 ? bs.filter((b) => b.id !== id) : bs));

  const lunchMin = Math.max(0, toMin(lend) - toMin(lstart));

  // Worked = sum of work-block minutes, less lunch (an unpaid break in work).
  const worked = useMemo(() => {
    const workMin = ranges
      .filter((r) => r.type === "work")
      .reduce((a, r) => a + Math.max(0, toMin(r.end) - toMin(r.start)), 0);
    return Math.max(0, workMin - lunchMin);
  }, [ranges, lunchMin]);

  // Leave fills the standard day, so flex = worked − 450 + leaveTaken.
  const leaveByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of ranges) {
      // flex days spend the flex balance — they don't "fill" the standard day.
      if (r.type === "work" || r.type === "flex") continue;
      m[r.type] = (m[r.type] ?? 0) + Math.max(0, toMin(r.end) - toMin(r.start));
    }
    return m;
  }, [ranges]);
  const totalLeave = Object.values(leaveByType).reduce((a, m) => a + m, 0);

  const dayFlex = worked - 450 + totalLeave;
  const runningFlex = 765 + dayFlex; // 765 = +12h45 current balance

  const resetForm = () => {
    setStart("08:00");
    setLstart("13:00");
    setLend("14:00");
    setEnd("17:00");
    setBlocks([{ id: nextBlockId.current++, type: "work", end: "17:00" }]);
  };

  // Function-key actions. No backend yet, so toasts stand in for persistence.
  const runFkey = (key: string) => {
    switch (key) {
      case "F1":
        setShowHelp(true);
        break;
      case "F2":
        toast.success(`Saved — ${prettyDate(selectedDate)}`);
        break;
      case "F3":
        setSelectedDate(TODAY_STR);
        resetForm();
        setEditOpen(true);
        toast(`New entry — ${prettyDate(TODAY_STR)}`);
        break;
      case "F5":
        toast("Refreshed");
        break;
      case "F8":
        toast.error(`Deleted — ${prettyDate(selectedDate)}`);
        break;
      case "F10":
        toast("Signing out…");
        break;
    }
  };

  const goTab = (t: string) => {
    setTab(t);
    // Single-panel tabs (e.g. calendar) auto-focus their only panel.
    const ps = PANELS[t] ?? [];
    setActivePanel(ps.length === 1 ? ps[0].id : null);
  };
  // Scrolling/focus happens in an effect (below) so the target panel's tab has
  // already committed to the DOM — important when jumping across tabs (/t.w1).
  const focusPanel = (panelId: string) => setActivePanel(panelId);

  // The `/` command line: tab.panel (d.ne), tab (t), panel (ne), or an action.
  const runCommand = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    setCmdOpen(false);
    setCmdValue("");
    if (!cmd) return;

    // Absolute "tab.panel" — jump to the tab, then drop into the panel.
    if (cmd.includes(".")) {
      const [tp, pp] = cmd.split(".");
      const t = resolveTab(tp);
      if (t) {
        goTab(t);
        const p = pp ? resolvePanel(t, pp) : null;
        if (p) focusPanel(p.id);
        return;
      }
    }
    // Bare tab.
    const t = resolveTab(cmd);
    if (t) {
      goTab(t);
      return;
    }
    // Bare panel on the current tab.
    const p = resolvePanel(tab, cmd);
    if (p) {
      focusPanel(p.id);
      return;
    }
    switch (cmd) {
      case "edit":
      case "e":
        return setEditOpen(true);
      case "new":
      case "ne":
        return runFkey("F3");
      case "save":
        return runFkey("F2");
      case "delete":
      case "del":
        return runFkey("F8");
      case "refresh":
        return runFkey("F5");
      case "help":
      case "?":
        return runFkey("F1");
      case "quit":
      case "q":
        return runFkey("F10");
      case "light":
      case "dark":
        return setTheme(cmd);
      default:
        toast(`unknown command: ${cmd}`);
    }
  };

  // Old-school keyboard nav: function keys, "/" command line, letter tab-jumps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const typing =
        !!ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.tagName === "SELECT" ||
          ae.isContentEditable);

      if (e.key === "Escape") {
        setShowHelp(false);
        setCmdOpen(false);
        setEditOpen(false);
        ae?.blur();
        return;
      }
      // Function keys work even while typing in a field.
      if (FKEYS.some(([k]) => k === e.key)) {
        e.preventDefault();
        runFkey(e.key);
        return;
      }
      // Everything below only when NOT typing, no command line, no modal open.
      if (typing || cmdOpen || editOpen) return;

      // Contextual keys on any week-style panel (thisweek / week1 / week2):
      // arrows change the selected day, e/Enter open the edit modal for it.
      const weekDates = activePanel ? PANEL_WEEK_DATES[activePanel] : undefined;
      if (weekDates) {
        if (
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight"
        ) {
          e.preventDefault();
          const sel = weekDates.filter((d) => !isWeekendDate(d));
          const fwd = e.key === "ArrowDown" || e.key === "ArrowRight";
          const i = sel.indexOf(selectedDate);
          const next =
            i === -1
              ? fwd
                ? 0
                : sel.length - 1
              : fwd
                ? (i + 1) % sel.length
                : (i - 1 + sel.length) % sel.length;
          setSelectedDate(sel[next]);
          return;
        }
        if (e.key === "e" || e.key === "Enter") {
          e.preventDefault();
          setEditOpen(true);
          return;
        }
      }

      // Contextual keys on the calendar: arrows move the day (±1 / ±7, skipping
      // weekends), e/Enter edit. Crossing a month boundary follows the grid.
      if (activePanel === "month") {
        const arrows: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -7,
          ArrowDown: 7,
        };
        if (e.key in arrows) {
          e.preventDefault();
          const step = arrows[e.key];
          let nd = addDaysUTC(selectedDate || TODAY_STR, step);
          while (isWeekendDate(nd)) nd = addDaysUTC(nd, step > 0 ? 1 : -1);
          setSelectedDate(nd);
          syncCalMonth(nd);
          return;
        }
        if (e.key === "e" || e.key === "Enter") {
          e.preventDefault();
          setEditOpen(true);
          return;
        }
      }

      if (e.key === "/") {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }
      // Bare first-letter tab jump (d/t/c/l/s).
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = resolveTab(e.key.toLowerCase());
        if (t) goTab(t);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, cmdOpen, tab, activePanel, editOpen, calYear, calMonth]);

  // Scroll the active panel into view after the tab + panel have rendered.
  // Runs cross-tab, unlike a same-tick rAF.
  useEffect(() => {
    if (!activePanel) return;
    document
      .getElementById(`panel-${activePanel}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activePanel, tab]);

  // Focus the first field when the edit modal opens.
  useEffect(() => {
    if (!editOpen) return;
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("#edit-modal input")?.focus()
    );
  }, [editOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl space-y-3 p-4 text-sm sm:p-6">
        {/* top bar */}
        <header className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-secondary">▰▰</span>
            <span className="font-bold tracking-tight">mainspring</span>
            <span className="hidden text-muted-foreground sm:inline">
              the mechanism behind your working hours
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "[ light ]" : "[ dark ]"}
          </Button>
        </header>

        {/* nav strip */}
        <nav className="flex flex-wrap gap-2 text-sm">
          {TABS.map((n) => {
            const active = tab === n;
            return (
              <button
                key={n}
                title={n}
                onClick={() => goTab(n)}
                className={
                  active
                    ? "bg-primary px-2 py-0.5 text-primary-foreground"
                    : "px-2 py-0.5 text-muted-foreground hover:text-foreground"
                }
              >
                {active ? `> ${TAB_CODES[n]}` : TAB_CODES[n]}
              </button>
            );
          })}
        </nav>

        {tab === "dashboard" && (
          <>
        <Prompt>log today&apos;s hours</Prompt>

        {/* balances panel */}
        <TerminalFrame
          panelId="balances"
          active={activePanel === "balances"}
          title="mainspring — ~/dashboard/balances"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <div>
              <div
                title="flex / TOIL balance"
                className="uppercase text-muted-foreground"
              >
                flex
              </div>
              <div className={`font-bold ${flexClass(765)}`}>{fmtFlex(765)}</div>
            </div>
            {[
              { k: "annual", v: "112.5h", d: "15.0d" },
              { k: "personal", v: "48.0h", d: "6.4d" },
            ].map((b) => (
              <div key={b.k}>
                <div
                  title={LABEL_BY_VALUE[b.k]}
                  className="uppercase text-muted-foreground"
                >
                  {CODE_BY_VALUE[b.k] ?? b.k}
                </div>
                <div className="font-bold">
                  {b.v}{" "}
                  <span className="font-normal text-muted-foreground">
                    / {b.d}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TerminalFrame>

        <WeekPanel
          panelId="thisweek"
          active={activePanel === "thisweek"}
          title={`mainspring — ~/dashboard/thisweek [${dayDateLabel(
            WEEK_START_STR
          )} – ${dayDateLabel(THIS_WEEK[6])}]`}
          dates={THIS_WEEK}
          opening={OPENING_FLEX}
          selectedDate={selectedDate}
          onEditDay={editDay}
        />

          </>
        )}

        {tab === "timesheet" && (
          <>
            <WeekPanel
              panelId="week1"
              active={activePanel === "week1"}
              title={`mainspring — ~/timesheet/week1 [${dayDateLabel(
                WK1_DATES[0]
              )} – ${dayDateLabel(WK1_DATES[6])}]`}
              dates={WK1_DATES}
              opening={OPENING_FLEX}
              selectedDate={selectedDate}
              onEditDay={editDay}
            />
            <WeekPanel
              panelId="week2"
              active={activePanel === "week2"}
              title={`mainspring — ~/timesheet/week2 [${dayDateLabel(
                WK2_DATES[0]
              )} – ${dayDateLabel(WK2_DATES[6])}]`}
              dates={WK2_DATES}
              opening={OPENING_FLEX + WK1_FLEX}
              selectedDate={selectedDate}
              onEditDay={editDay}
            />
            <TotalsPanel active={activePanel === "totals"} />
          </>
        )}

        {tab === "calendar" && (
          <CalendarPanel
            active={activePanel === "month"}
            year={calYear}
            month={calMonth}
            view={calView}
            onView={setCalView}
            filter={calFilter}
            onFilter={setCalFilter}
            onPrev={() => calStep(-1)}
            onNext={() => calStep(1)}
            selectedDate={selectedDate}
            onEditDay={editDay}
          />
        )}

        {tab === "leave" && (
          <>
            <LeaveBalancesPanel active={activePanel === "balances"} />
            <LeaveTransactionsPanel active={activePanel === "transactions"} />
            <LeaveAdjustPanel active={activePanel === "adjust"} />
          </>
        )}

        {tab === "settings" && (
          <TerminalFrame title="mainspring — ~/settings">
            <p className="text-sm text-muted-foreground">
              <span className="text-secondary">$</span> settings view — not built
              in this preview yet.
            </p>
          </TerminalFrame>
        )}

        {/* function-key bar */}
        <div className="sticky bottom-0 -mx-4 mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border bg-background px-4 py-1.5 sm:-mx-6 sm:px-6">
          {FKEYS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => runFkey(k)}
              className="flex items-center gap-1"
            >
              <span className="bg-secondary px-1 text-secondary-foreground">
                {k}
              </span>
              <span className="text-muted-foreground hover:text-foreground">
                {label}
              </span>
            </button>
          ))}
          <span className="ml-auto text-muted-foreground/50">
            <span className="text-secondary">/</span>tab.panel · d t c l s tabs
          </span>
        </div>
      </div>

      {/* "/" command line — drops in over the status bar, vi-style */}
      {cmdOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-secondary bg-card">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-1.5 text-sm sm:px-6">
            <span className="text-secondary">/</span>
            <input
              autoFocus
              value={cmdValue}
              onChange={(e) => setCmdValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runCommand(cmdValue);
                else if (e.key === "Escape") {
                  setCmdOpen(false);
                  setCmdValue("");
                }
              }}
              placeholder="edit · new · d.dt · t.w1 · t.tt · dsh tsh cal lve set · save · light dark"
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/40"
            />
            <span className="text-muted-foreground/60">⏎ run · esc cancel</span>
          </div>
        </div>
      )}

      {/* edit-day modal — opened by clicking a row, "e"/Enter, or F3 */}
      {editOpen && (
        <div
          id="edit-modal"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 sm:py-10"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <TerminalFrame title={`mainspring — ~/entry/edit [${selectedDate}]`}>
              <div className="mb-3 flex flex-wrap items-baseline gap-3 border-b border-border pb-3">
                <span className="uppercase text-muted-foreground">entry for</span>
                <span className="font-bold text-secondary">
                  {prettyDate(selectedDate)}
                </span>
                {selectedDate === TODAY_STR && (
                  <Badge variant="secondary">today</Badge>
                )}
                {selectedDate > TODAY_STR && (
                  <Badge variant="outline">scheduled</Badge>
                )}
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="uppercase text-muted-foreground">status</span>
                <TokenSelect
                  value={status}
                  options={STATUS_TYPES}
                  onChange={setStatus}
                />
              </div>
              <div className="grid gap-6 md:grid-cols-[1fr_auto]">
                <div className="space-y-4">
                  {/* work block */}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="start" value={start} onChange={setStart} />
                    <Field label="finish" value={end} onChange={setEnd} />
                    <Field label="lunch start" value={lstart} onChange={setLstart} />
                    <Field label="lunch end" value={lend} onChange={setLend} />
                  </div>

                  {/* split day — contiguous timeline of typed blocks */}
                  <div className="space-y-2 border-t border-dashed border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="uppercase text-muted-foreground">
                        day timeline
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addBlock}
                      >
                        + split
                      </Button>
                    </div>

                    {ranges.map((r, i) => {
                      const isLast = i === ranges.length - 1;
                      const mins = Math.max(0, toMin(r.end) - toMin(r.start));
                      return (
                        <div
                          key={r.id}
                          className="space-y-1.5 border border-border/60 p-2"
                        >
                          <TokenSelect
                            value={r.type}
                            options={BLOCK_TYPES}
                            onChange={(v) => updateBlock(r.id, { type: v })}
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{r.start}</span>
                            <span className="text-muted-foreground/50">→</span>
                            {isLast ? (
                              <span className="text-muted-foreground">{r.end}</span>
                            ) : (
                              <TimeInput
                                value={r.end}
                                onChange={(v) => updateBlock(r.id, { end: v })}
                                className="h-7 w-20"
                              />
                            )}
                            <span className="text-muted-foreground/60">
                              ({fmtHM(mins)})
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={ranges.length === 1}
                              onClick={() => removeBlock(r.id)}
                              aria-label="remove block"
                              className="ml-auto"
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-muted-foreground/60">
                      blocks tile {start}–{end} with no gaps. “+ split” carves the
                      last block into a leave / flex block.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="note" className="uppercase text-muted-foreground">
                      note
                    </Label>
                    <Input id="note" placeholder="WFH, meeting notes…" />
                  </div>
                </div>

                {/* live calc readout */}
                <div className="min-w-56 space-y-2 border-l border-border pl-6 text-sm">
                  <p className="uppercase text-muted-foreground">live calc</p>
                  <Readout k="worked" v={fmtHM(worked)} />
                  <Readout k="standard" v="7h 30m" />
                  {Object.entries(leaveByType).map(([t, m]) => (
                    <Readout
                      key={t}
                      k={CODE_BY_VALUE[t] ?? t}
                      v={`−${fmtHM(m)}`}
                      cls="text-red-600 dark:text-red-400"
                    />
                  ))}
                  <div className="my-2 border-t border-dashed border-border" />
                  <Readout
                    k="flex today"
                    v={fmtFlex(dayFlex)}
                    cls={flexClass(dayFlex)}
                  />
                  <Readout
                    k="balance →"
                    v={fmtFlex(runningFlex)}
                    cls={flexClass(runningFlex)}
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3 text-muted-foreground">
                <Button size="sm" onClick={() => runFkey("F2")}>
                  save [F2]
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(false)}
                >
                  close [Esc]
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    runFkey("F8");
                    setEditOpen(false);
                  }}
                >
                  delete [F8]
                </Button>
              </div>
            </TerminalFrame>
          </div>
        </div>
      )}

      {/* F1 help overlay */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <TerminalFrame title="mainspring — help [F1]">
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  <span className="text-secondary">$</span> keyboard &amp; codes
                </p>
                <div className="space-y-1">
                  <HelpRow k="/tab.panel" v="jump to panel (e.g. /d.dt, /t.w1)" />
                  <HelpRow k="/tab" v="jump to tab (e.g. /t, /timesheet)" />
                  <HelpRow k="d t c l s" v="quick tab jump (first letter)" />
                  <HelpRow k="on a week: ↑ ↓" v="change selected day" />
                  <HelpRow k="on a week: e / ⏎" v="edit selected day (modal)" />
                  <HelpRow k="click a day" v="edit that day (modal)" />
                  <HelpRow k="in modal: Tab" v="next / prev field" />
                  <HelpRow k="F1..F10" v="function-key actions (see bar)" />
                  <HelpRow k="Esc" v="close / cancel" />
                </div>
                <div className="border-t border-dashed border-border pt-2">
                  <p className="mb-1 uppercase text-muted-foreground">
                    entry type codes
                  </p>
                  {BLOCK_TYPES.map((t) => (
                    <HelpRow key={t.value} k={t.code} v={t.label} />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowHelp(false)}>
                  close [Esc]
                </Button>
              </div>
            </TerminalFrame>
          </div>
        </div>
      )}
    </div>
  );
}

// Typed HH:MM text field (no native time picker — keeps the TUI feel).
function TimeInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="HH:MM"
      maxLength={5}
      value={value}
      onChange={(e) => onChange(formatTimeTyping(e.target.value))}
      className={className}
    />
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="uppercase text-muted-foreground">
        {label}
      </Label>
      <TimeInput value={value} onChange={onChange} />
    </div>
  );
}

// TUI-style inline selector: all options visible as tokens, active one filled.
function TokenSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; code: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 text-sm">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={
              active
                ? "bg-secondary px-1.5 py-0.5 text-secondary-foreground"
                : "px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          >
            {active ? `[${o.code}]` : o.code}
          </button>
        );
      })}
    </div>
  );
}

// A week of day rows + a weekly running-balance readout. Shared by the
// dashboard thisweek panel and the two timesheet pay-week panels.
function WeekPanel({
  panelId,
  active,
  title,
  dates,
  opening,
  selectedDate,
  onEditDay,
}: {
  panelId: string;
  active: boolean;
  title: string;
  dates: string[];
  opening: number;
  selectedDate: string;
  onEditDay: (d: string) => void;
}) {
  const worked = sumWorked(dates);
  const flex = sumFlex(dates);
  return (
    <TerminalFrame panelId={panelId} active={active} title={title}>
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-0.5">
          {dates.map((date) => {
            const isToday = date === TODAY_STR;
            const isSelected = date === selectedDate;
            const weekend = isWeekendDate(date);
            const entry = FORTNIGHT_ENTRIES[date];
            const missing = !entry && !weekend && date < TODAY_STR;
            const f = entry ? entryFlex(entry) : 0;
            return (
              <button
                type="button"
                key={date}
                disabled={weekend}
                onClick={() => onEditDay(date)}
                className={`flex w-full items-center gap-3 px-2 py-1 text-left text-sm transition-colors ${
                  weekend
                    ? "cursor-default text-muted-foreground/50"
                    : "hover:bg-muted"
                } ${
                  isSelected
                    ? "bg-secondary/20 ring-1 ring-secondary/60"
                    : isToday
                      ? "bg-secondary/10"
                      : ""
                }`}
              >
                <span className="w-[4ch] font-medium">{getDayName(date)}</span>
                <span className="w-[8ch] text-muted-foreground">
                  {dayDateLabel(date)}
                </span>
                <span className="flex flex-1 items-center gap-3">
                  {entry ? (
                    <>
                      <Badge
                        variant={(TYPE_BADGE[entry.type] ?? "outline") as never}
                        title={LABEL_BY_VALUE[entry.type] ?? entry.type}
                        className="w-16 justify-center"
                      >
                        {CODE_BY_VALUE[entry.type] ?? entry.type}
                      </Badge>
                      <span className={flexClass(f)}>{fmtFlex(f)}</span>
                      {entry.status && entry.status !== "approved" && (
                        <span
                          className="text-muted-foreground"
                          title={`status: ${entry.status}`}
                        >
                          ({entry.status})
                        </span>
                      )}
                    </>
                  ) : missing ? (
                    <Badge
                      variant="outline"
                      title="no entry logged"
                      className="w-16 justify-center border-amber-500/50 text-amber-600 dark:text-amber-400"
                    >
                      MISS
                    </Badge>
                  ) : (
                    <span className="inline-block w-16 text-center text-muted-foreground/40">
                      —
                    </span>
                  )}
                </span>
                {isToday ? (
                  <span className="text-secondary">← today</span>
                ) : isSelected ? (
                  <span className="text-secondary">▸ editing</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="min-w-56 space-y-2 border-l border-border pl-6">
          <p className="uppercase text-muted-foreground">week running</p>
          <Readout k="worked" v={fmtHM(worked)} />
          <Readout k="flex (week)" v={fmtFlex(flex)} cls={flexClass(flex)} />
          <div className="my-2 border-t border-dashed border-border" />
          <Readout k="opening" v={fmtFlex(opening)} cls={flexClass(opening)} />
          <Readout
            k="balance →"
            v={fmtFlex(opening + flex)}
            cls={flexClass(opening + flex)}
          />
        </div>
      </div>
    </TerminalFrame>
  );
}

// Fortnight totals — pivoted: weeks (and the pay period) are columns, the
// metrics (worked, flex, each leave type, running balance) are rows.
function TotalsPanel({ active }: { active: boolean }) {
  const cols = [
    { key: "WK1", worked: WK1_WORKED, flex: WK1_FLEX, leave: WK1_LEAVE },
    { key: "WK2", worked: WK2_WORKED, flex: WK2_FLEX, leave: WK2_LEAVE },
    { key: "PP", worked: PP_WORKED, flex: PP_FLEX, leave: PP_LEAVE_BY_TYPE },
  ];
  // Running flex balance at the end of each column.
  const bals = [
    OPENING_FLEX + WK1_FLEX,
    OPENING_FLEX + WK1_FLEX + WK2_FLEX,
    OPENING_FLEX + PP_FLEX,
  ];
  const leaveTypes = BLOCK_TYPES.filter(
    (t) => t.value !== "work" && t.value !== "flex"
  );
  const num = "text-right tabular-nums";
  return (
    <TerminalFrame
      panelId="totals"
      active={active}
      title={`mainspring — ~/timesheet/totals [${dayDateLabel(
        WK1_DATES[0]
      )} – ${dayDateLabel(WK2_DATES[6])}]`}
    >
      <p className="mb-2 text-muted-foreground">
        opening flex{" "}
        <span className={flexClass(OPENING_FLEX)}>{fmtFlex(OPENING_FLEX)}</span>
      </p>
      <div className="grid grid-cols-[1fr_repeat(3,5rem)] gap-x-3 gap-y-1">
        {/* header */}
        <span />
        {cols.map((c) => (
          <span key={c.key} className={`${num} font-bold`}>
            {c.key}
          </span>
        ))}

        {/* worked */}
        <span className="text-muted-foreground">worked</span>
        {cols.map((c) => (
          <span key={c.key} className={num}>
            {fmtHM(c.worked)}
          </span>
        ))}

        {/* flex */}
        <span className="text-muted-foreground">flex</span>
        {cols.map((c) => (
          <span key={c.key} className={`${num} ${flexClass(c.flex)}`}>
            {fmtFlex(c.flex)}
          </span>
        ))}

        {/* leave taken, one row per type */}
        {leaveTypes.map((t) => (
          <Fragment key={t.value}>
            <span className="text-muted-foreground" title={t.label}>
              {t.code}
            </span>
            {cols.map((c) => {
              const m = c.leave[t.value] ?? 0;
              return (
                <span
                  key={c.key}
                  className={`${num} ${m ? "" : "text-muted-foreground/40"}`}
                >
                  {fmtHM(m)}
                </span>
              );
            })}
          </Fragment>
        ))}

        {/* running balance */}
        <span className="border-t border-border pt-1 font-bold">bal →</span>
        {bals.map((b, i) => (
          <span
            key={i}
            className={`${num} border-t border-border pt-1 font-bold ${flexClass(
              b
            )}`}
          >
            {fmtFlex(b)}
          </span>
        ))}
      </div>
    </TerminalFrame>
  );
}

// Calendar — month / week / pay-fortnight grids + a list view, with a type
// filter. Colour-coded, today highlighted, click (or arrows + e) to edit.
function CalendarPanel({
  active,
  year,
  month,
  view,
  onView,
  filter,
  onFilter,
  onPrev,
  onNext,
  selectedDate,
  onEditDay,
}: {
  active: boolean;
  year: number;
  month: number;
  view: string;
  onView: (v: string) => void;
  filter: string;
  onFilter: (v: string) => void;
  onPrev: () => void;
  onNext: () => void;
  selectedDate: string;
  onEditDay: (d: string) => void;
}) {
  const matches = (e: MockEntry) => filter === "all" || e.type === filter;

  // Derive the cells, column headers, range-dimming, and label per view.
  let cells: string[] = [];
  let headers = WEEKDAY_HEADERS;
  let dimMonth: number | null = null;
  let label = "";
  if (view === "month") {
    cells = getMonthGrid(year, month);
    dimMonth = month;
    label = monthLabel(year, month);
  } else if (view === "week") {
    const s = sundayStartUTC(selectedDate);
    cells = Array.from({ length: 7 }, (_, i) => addDaysUTC(s, i));
    label = `${dayDateLabel(cells[0])} – ${dayDateLabel(cells[6])}`;
  } else if (view === "pp") {
    const { start } = getPayFortnight(
      new Date(selectedDate + "T00:00:00Z"),
      DEFAULT_ANCHOR_DATE
    );
    const s = start.toISOString().slice(0, 10);
    cells = Array.from({ length: 14 }, (_, i) => addDaysUTC(s, i));
    headers = ["THU", "FRI", "SAT", "SUN", "MON", "TUE", "WED"];
    label = `PP ${dayDateLabel(cells[0])} – ${dayDateLabel(cells[13])}`;
  }

  const legend = BLOCK_TYPES.filter((t) => t.value !== "work");

  return (
    <TerminalFrame
      panelId="month"
      active={active}
      title={`mainspring — ~/calendar/${view}${
        view === "list" ? "" : ` [${label}]`
      }`}
    >
      {/* view + filter controls */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="uppercase text-muted-foreground">view</span>
          <TokenSelect value={view} options={CAL_VIEWS} onChange={onView} />
        </div>
        <div className="flex items-center gap-2">
          <span className="uppercase text-muted-foreground">filter</span>
          <TokenSelect value={filter} options={CAL_FILTERS} onChange={onFilter} />
        </div>
      </div>

      {view !== "list" && (
        <div className="mb-2 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onPrev}>
            ‹ prev
          </Button>
          <span className="font-bold">{label}</span>
          <Button variant="outline" size="sm" onClick={onNext}>
            next ›
          </Button>
        </div>
      )}

      {view === "list" ? (
        <CalList
          filter={filter}
          selectedDate={selectedDate}
          onEditDay={onEditDay}
        />
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {headers.map((h) => (
            <div
              key={h}
              className="px-1 py-0.5 text-center uppercase text-muted-foreground"
            >
              {h}
            </div>
          ))}
          {cells.map((date) => {
            const d = new Date(date + "T00:00:00Z");
            const inRange = dimMonth === null || d.getUTCMonth() === dimMonth;
            const weekend = isWeekendDate(date);
            const isToday = date === TODAY_STR;
            const isSelected = date === selectedDate && inRange;
            const entry = inRange ? FORTNIGHT_ENTRIES[date] : undefined;
            const showEntry = entry && matches(entry);
            return (
              <button
                key={date}
                type="button"
                disabled={!inRange || weekend}
                onClick={() => onEditDay(date)}
                className={`flex h-14 flex-col items-start gap-0.5 border p-1 text-left text-sm transition-colors ${
                  !inRange
                    ? "border-transparent text-muted-foreground/25"
                    : weekend
                      ? "border-border/40 text-muted-foreground/50"
                      : "border-border hover:bg-muted"
                } ${
                  isSelected
                    ? "bg-secondary/20 ring-1 ring-secondary/60"
                    : isToday
                      ? "bg-secondary/10"
                      : ""
                }`}
              >
                <span className={isToday ? "font-bold text-secondary" : ""}>
                  {d.getUTCDate()}
                </span>
                {showEntry && (
                  <span
                    className={`mt-auto ${TYPE_COLOR[entry.type] ?? "text-foreground"}`}
                    title={`${LABEL_BY_VALUE[entry.type] ?? entry.type}${
                      entry.status ? ` (${entry.status})` : ""
                    }`}
                  >
                    {CODE_BY_VALUE[entry.type] ?? entry.type}
                    {entry.status && entry.status !== "approved" && (
                      <span className="text-muted-foreground">*</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* legend */}
      {view !== "list" && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-border pt-2 text-muted-foreground">
          {legend.map((t) => (
            <span key={t.value} className="flex items-center gap-1">
              <span className={TYPE_COLOR[t.value] ?? ""}>{t.code}</span>
              <span>{t.label}</span>
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span>*</span>
            <span>not yet approved</span>
          </span>
        </div>
      )}
    </TerminalFrame>
  );
}

// Chronological list of entries, filtered by type.
function CalList({
  filter,
  selectedDate,
  onEditDay,
}: {
  filter: string;
  selectedDate: string;
  onEditDay: (d: string) => void;
}) {
  const rows = Object.keys(FORTNIGHT_ENTRIES)
    .sort()
    .map((date) => ({ date, e: FORTNIGHT_ENTRIES[date] }))
    .filter(({ e }) => filter === "all" || e.type === filter);

  if (!rows.length) {
    return (
      <p className="text-muted-foreground">
        <span className="text-secondary">$</span> no entries match this filter.
      </p>
    );
  }
  return (
    <div className="space-y-0.5">
      {rows.map(({ date, e }) => {
        const f = entryFlex(e);
        const isSelected = date === selectedDate;
        const weekend = isWeekendDate(date);
        return (
          <button
            key={date}
            type="button"
            disabled={weekend}
            onClick={() => onEditDay(date)}
            className={`flex w-full items-center gap-3 px-2 py-1 text-left text-sm transition-colors ${
              weekend ? "cursor-default" : "hover:bg-muted"
            } ${isSelected ? "bg-secondary/20 ring-1 ring-secondary/60" : ""}`}
          >
            <span className="w-[7ch] text-muted-foreground">
              {dayDateLabel(date)}
            </span>
            <span className="w-[4ch] font-medium">{getDayName(date)}</span>
            <Badge
              variant={(TYPE_BADGE[e.type] ?? "outline") as never}
              title={LABEL_BY_VALUE[e.type] ?? e.type}
              className="w-16 justify-center"
            >
              {CODE_BY_VALUE[e.type] ?? e.type}
            </Badge>
            <span className={`w-20 ${flexClass(f)}`}>{fmtFlex(f)}</span>
            {e.status && (
              <span
                className={
                  e.status === "approved"
                    ? "text-muted-foreground"
                    : "text-amber-600 dark:text-amber-400"
                }
              >
                {e.status}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Leave balances: current balance (h/days), accrual rate, projected EOFY.
function LeaveBalancesPanel({ active }: { active: boolean }) {
  const num = "text-right tabular-nums";
  const head = `${num} uppercase text-muted-foreground`;
  return (
    <TerminalFrame
      panelId="balances"
      active={active}
      title="mainspring — ~/leave/balances"
    >
      <div className="grid grid-cols-[1fr_repeat(4,4.5rem)] gap-x-3 gap-y-1">
        <span />
        <span className={head}>bal h</span>
        <span className={head}>days</span>
        <span className={head}>accr/fn</span>
        <span className={head}>EOFY</span>
        {LEAVE_BALANCES.map((b) => {
          const proj = b.accrualFn
            ? b.balanceH + b.accrualFn * FORTNIGHTS_TO_FY_END
            : null;
          return (
            <Fragment key={b.type}>
              <span
                className={TYPE_COLOR[b.type] ?? ""}
                title={LABEL_BY_VALUE[b.type] ?? b.type}
              >
                {CODE_BY_VALUE[b.type] ?? b.type}
              </span>
              <span className={`${num} font-bold`}>{b.balanceH.toFixed(1)}</span>
              <span className={num}>{(b.balanceH / 7.5).toFixed(1)}</span>
              <span className={num}>
                {b.accrualFn ? `+${b.accrualFn.toFixed(2)}` : "—"}
              </span>
              <span className={num}>{proj !== null ? proj.toFixed(1) : "—"}</span>
            </Fragment>
          );
        })}
      </div>
      <p className="mt-3 border-t border-dashed border-border pt-2 text-muted-foreground">
        EOFY = projected balance at 30 Jun 2026 ({FORTNIGHTS_TO_FY_END} fortnight
        {FORTNIGHTS_TO_FY_END === 1 ? "" : "s"} of accrual left). FLEX accrues
        from worked hours, not fortnightly.
      </p>
    </TerminalFrame>
  );
}

// Leave transaction history, filterable by type.
function LeaveTransactionsPanel({ active }: { active: boolean }) {
  const [filter, setFilter] = useState("all");
  const rows = LEAVE_TRANSACTIONS.filter(
    (t) => filter === "all" || t.type === filter
  );
  return (
    <TerminalFrame
      panelId="transactions"
      active={active}
      title="mainspring — ~/leave/transactions"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="uppercase text-muted-foreground">filter</span>
        <TokenSelect value={filter} options={LEAVE_FILTERS} onChange={setFilter} />
      </div>
      <div className="space-y-0.5">
        {rows.map((t, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-1 text-sm">
            <span className="w-[10ch] text-muted-foreground">
              {new Date(t.date + "T00:00:00Z").toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
                timeZone: "UTC",
              })}
            </span>
            <Badge
              variant={(TYPE_BADGE[t.type] ?? "outline") as never}
              title={LABEL_BY_VALUE[t.type] ?? t.type}
              className="w-16 justify-center"
            >
              {CODE_BY_VALUE[t.type] ?? t.type}
            </Badge>
            <span
              className={`w-20 text-right tabular-nums ${
                t.hours >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {hoursLabel(t.hours)}
            </span>
            <span className="flex-1 truncate text-muted-foreground">
              {t.desc}
            </span>
          </div>
        ))}
        {!rows.length && (
          <p className="text-muted-foreground">
            <span className="text-secondary">$</span> no transactions match.
          </p>
        )}
      </div>
    </TerminalFrame>
  );
}

// Manual leave adjustment (credit/debit hours with a reason).
function LeaveAdjustPanel({ active }: { active: boolean }) {
  const [type, setType] = useState("annual");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const apply = () => {
    const h = parseFloat(hours);
    if (!Number.isFinite(h) || !reason.trim()) {
      toast.error("enter hours (e.g. +5 or -7.5) and a reason");
      return;
    }
    toast.success(
      `${hoursLabel(h)} ${CODE_BY_VALUE[type] ?? type} — ${reason.trim()}`
    );
    setHours("");
    setReason("");
  };
  return (
    <TerminalFrame
      panelId="adjust"
      active={active}
      title="mainspring — ~/leave/adjust"
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="w-16 uppercase text-muted-foreground">type</span>
          <TokenSelect
            value={type}
            options={LEAVE_FILTERS.slice(1)}
            onChange={setType}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 uppercase text-muted-foreground">hours</span>
          <Input
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="+5.0 or -7.5"
            inputMode="decimal"
            className="w-28"
          />
          <span className="text-muted-foreground">+ credit · − debit</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 uppercase text-muted-foreground">reason</span>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="initial balance, correction, cash-out…"
            className="flex-1"
          />
        </div>
        <Button size="sm" onClick={apply}>
          apply adjustment
        </Button>
      </div>
    </TerminalFrame>
  );
}

function HelpRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-32 shrink-0 text-secondary">{k}</span>
      <span className="text-muted-foreground">{v}</span>
    </div>
  );
}

function Readout({ k, v, cls }: { k: string; v: string; cls?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-bold ${cls ?? ""}`}>{v}</span>
    </div>
  );
}
