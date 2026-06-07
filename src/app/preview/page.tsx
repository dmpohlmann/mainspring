"use client";

/**
 * TEMPORARY preview page — no auth, mock data only.
 * Exists to eyeball the terminal-aesthetic reskin before rolling it across
 * the real screens. Delete this folder once the look is approved.
 */

import { useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getPayFortnight,
  formatPayPeriodLabel,
  DEFAULT_ANCHOR_DATE,
} from "@/lib/utils/pay-fortnight";
import { getDayName } from "@/lib/utils/format";

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
const PP_LABEL = formatPayPeriodLabel(PP.start, PP.end); // PP: 4 Jun – 17 Jun 2026

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

/* ── helpers ───────────────────────────────────────────────────────────── */

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
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

/* Box-drawing window chrome to sell the "terminal" feel */
function TerminalFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
        <span className="text-red-500">●</span>
        <span className="text-yellow-500">●</span>
        <span className="text-green-500">●</span>
        <span className="ml-2 truncate">{title}</span>
      </div>
      <div className="p-4">{children}</div>
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
};

// Mock entries keyed by ISO date. Days NOT listed are blank (or "missing" if a
// past weekday). 05 Jun left empty on purpose to show the "missing" state.
const FORTNIGHT_ENTRIES: Record<string, MockEntry> = {
  "2026-06-04": { type: "work", start: "08:00", lstart: "12:00", lend: "12:30", end: "16:35" },
  "2026-06-09": { type: "annual", start: "—", lstart: "—", lend: "—", end: "—" },
  "2026-06-11": { type: "flex", start: "—", lstart: "—", lend: "—", end: "—" },
};

function entryFlex(e: MockEntry) {
  if (e.type === "annual") return 0;
  if (e.type === "flex") return -450;
  return toMin(e.end) - toMin(e.start) - (toMin(e.lend) - toMin(e.lstart)) - 450;
}

function isWeekendDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z").getUTCDay();
  return d === 0 || d === 6;
}

const fortnightFlex = Object.values(FORTNIGHT_ENTRIES).reduce(
  (a, e) => a + entryFlex(e),
  0
);

const TYPE_BADGE: Record<string, string> = {
  work: "outline",
  annual: "default",
  flex: "secondary",
};

const TABS = ["dashboard", "timesheet", "calendar", "leave", "settings"];

// A day is a contiguous timeline of blocks. Each block stores its own `end`;
// its start is derived from the previous block's end (the last block always
// ends at the day finish). This guarantees no overlaps and no gaps.
type DayBlock = { id: number; type: string; end: string };

const BLOCK_TYPES = [
  { value: "work", label: "work" },
  { value: "annual", label: "annual leave" },
  { value: "personal", label: "personal leave" },
  { value: "toil", label: "TOIL" },
  { value: "public_holiday", label: "public holiday" },
];

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
      if (r.type === "work") continue;
      m[r.type] = (m[r.type] ?? 0) + Math.max(0, toMin(r.end) - toMin(r.start));
    }
    return m;
  }, [ranges]);
  const totalLeave = Object.values(leaveByType).reduce((a, m) => a + m, 0);

  const dayFlex = worked - 450 + totalLeave;
  const runningFlex = 765 + dayFlex; // 765 = +12h45 current balance

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {/* top bar */}
        <header className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-secondary">▰▰</span>
            <span className="font-bold tracking-tight">mainspring</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
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
                onClick={() => setTab(n)}
                className={
                  active
                    ? "bg-primary px-2 py-0.5 text-primary-foreground"
                    : "px-2 py-0.5 text-muted-foreground hover:text-foreground"
                }
              >
                {active ? `> ${n}` : n}
              </button>
            );
          })}
        </nav>

        {tab === "dashboard" && (
          <>
        <Prompt>log today&apos;s hours</Prompt>

        {/* dashboard summary cards */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                flex balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${flexClass(765)}`}>{fmtFlex(765)}</p>
            </CardContent>
          </Card>
          {[
            { k: "annual", v: "112.5h", d: "15.0 days" },
            { k: "personal", v: "48.0h", d: "6.4 days" },
            { k: "toil", v: "8.0h", d: "1.1 days" },
          ].map((b) => (
            <Card key={b.k}>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  {b.k} leave
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{b.v}</p>
                <p className="text-xs text-muted-foreground">{b.d}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* this week — dashboard middle block (Mon-start, blank by default,
            past weekdays with no entry show "missing") */}
        <TerminalFrame
          title={`mainspring — ~/dashboard/this-week [${dayDateLabel(
            WEEK_START_STR
          )} – ${dayDateLabel(THIS_WEEK[6])}]`}
        >
          <div className="space-y-0.5">
            {THIS_WEEK.map((date) => {
              const isToday = date === TODAY_STR;
              const isSelected = date === selectedDate;
              const weekend = isWeekendDate(date);
              // no entries in this mock; a past weekday with no entry = missing
              const missing = !weekend && date < TODAY_STR;
              return (
                <button
                  type="button"
                  key={date}
                  disabled={weekend}
                  onClick={() => setSelectedDate(date)}
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
                  <span className="w-10 font-medium">{getDayName(date)}</span>
                  <span className="w-16 text-xs text-muted-foreground">
                    {dayDateLabel(date)}
                  </span>
                  <span className="flex-1">
                    {missing ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        missing
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </span>
                  {isToday ? (
                    <span className="text-xs text-secondary">← today</span>
                  ) : isSelected ? (
                    <span className="text-xs text-secondary">▸ editing</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </TerminalFrame>

        {/* entry form with live calc — on dashboard, below the week view */}
        <TerminalFrame title={`mainspring — ~/entry/new [${selectedDate}]`}>
          <div className="mb-4 flex flex-wrap items-baseline gap-3 border-b border-border pb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              entry for
            </span>
            <span className="text-xl font-bold text-secondary">
              {prettyDate(selectedDate)}
            </span>
            {selectedDate === TODAY_STR && (
              <Badge variant="secondary">today</Badge>
            )}
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
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
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
                  return (
                    <div key={r.id} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        {i === 0 && (
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            type
                          </Label>
                        )}
                        <select
                          value={r.type}
                          onChange={(e) =>
                            updateBlock(r.id, { type: e.target.value })
                          }
                          className="h-8 w-full border border-input bg-background px-2 text-sm"
                        >
                          {BLOCK_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        {i === 0 && (
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            from
                          </Label>
                        )}
                        {/* start is derived from the previous block — read-only */}
                        <div className="flex h-8 items-center px-1 text-sm text-muted-foreground">
                          {r.start}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {i === 0 && (
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            to
                          </Label>
                        )}
                        {isLast ? (
                          // last block always ends at the day finish (read-only)
                          <div className="flex h-8 items-center px-1 text-sm text-muted-foreground">
                            {r.end}
                          </div>
                        ) : (
                          <Input
                            type="time"
                            value={r.end}
                            onChange={(e) =>
                              updateBlock(r.id, { end: e.target.value })
                            }
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={ranges.length === 1}
                        onClick={() => removeBlock(r.id)}
                        aria-label="remove block"
                      >
                        ✕
                      </Button>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground/60">
                  blocks tile {start}–{end} with no gaps. “+ split” carves the
                  last block into a leave / TOIL block.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note" className="text-xs uppercase tracking-wider text-muted-foreground">
                  note
                </Label>
                <Input id="note" placeholder="WFH, meeting notes…" />
              </div>
            </div>

            {/* live calc readout */}
            <div className="min-w-56 space-y-2 border-l border-border pl-6 text-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                live calc
              </p>
              <Readout k="worked" v={fmtHM(worked)} />
              <Readout k="standard" v="7h 30m" />
              {Object.entries(leaveByType).map(([t, m]) => (
                <Readout
                  key={t}
                  k={`${t} leave`}
                  v={`−${fmtHM(m)}`}
                  cls="text-red-600 dark:text-red-400"
                />
              ))}
              <div className="my-2 border-t border-dashed border-border" />
              <Readout k="flex today" v={fmtFlex(dayFlex)} cls={flexClass(dayFlex)} />
              <Readout k="balance →" v={fmtFlex(runningFlex)} cls={flexClass(runningFlex)} />
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button>save entry</Button>
            <Button variant="outline">cancel</Button>
            <Button variant="destructive" className="ml-auto">
              delete
            </Button>
          </div>
        </TerminalFrame>
          </>
        )}

        {tab === "timesheet" && (
          <>
        {/* full fortnight timesheet — all 14 days, Thu → Wed */}
        <TerminalFrame title={`mainspring — ~/timesheet/fortnight [${PP_LABEL}]`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>day</TableHead>
                <TableHead>date</TableHead>
                <TableHead>type</TableHead>
                <TableHead>start</TableHead>
                <TableHead>lunch</TableHead>
                <TableHead>end</TableHead>
                <TableHead className="text-right">flex</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FORTNIGHT_DATES.map((date) => {
                const entry = FORTNIGHT_ENTRIES[date];
                const weekend = isWeekendDate(date);
                const isToday = date === TODAY_STR;
                const missing = !entry && !weekend && date < TODAY_STR;
                const f = entry ? entryFlex(entry) : 0;
                return (
                  <TableRow
                    key={date}
                    className={`${entry ? "cursor-pointer" : ""} ${
                      weekend ? "text-muted-foreground/50" : ""
                    } ${isToday ? "bg-secondary/10" : ""}`}
                  >
                    <TableCell className="font-medium">{getDayName(date)}</TableCell>
                    <TableCell>{dayDateLabel(date)}</TableCell>
                    <TableCell>
                      {entry ? (
                        <Badge
                          variant={(TYPE_BADGE[entry.type] ?? "outline") as never}
                        >
                          {entry.type}
                        </Badge>
                      ) : missing ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          missing
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell>{entry ? entry.start : ""}</TableCell>
                    <TableCell>
                      {entry && entry.lstart !== "—"
                        ? `${entry.lstart}–${entry.lend}`
                        : ""}
                    </TableCell>
                    <TableCell>{entry ? entry.end : ""}</TableCell>
                    <TableCell
                      className={`text-right ${entry ? flexClass(f) : ""}`}
                    >
                      {entry ? fmtFlex(f) : ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6}>net flex this fortnight</TableCell>
                <TableCell className={`text-right ${flexClass(fortnightFlex)}`}>
                  {fmtFlex(fortnightFlex)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TerminalFrame>
          </>
        )}

        {["calendar", "leave", "settings"].includes(tab) && (
          <TerminalFrame title={`mainspring — ~/${tab}`}>
            <p className="text-sm text-muted-foreground">
              <span className="text-secondary">$</span> {tab} view — not built in
              this preview yet.
            </p>
          </TerminalFrame>
        )}

        <p className="pb-6 text-center text-xs text-muted-foreground">
          /preview — terminal aesthetic, mock data. toggle light/dark above.
        </p>
      </div>
    </div>
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
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} />
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
