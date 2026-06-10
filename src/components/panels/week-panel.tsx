"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { TerminalFrame } from "@/components/tui/terminal-frame";
import { TypeTag } from "@/components/tui/type-tag";
import { Readout } from "@/components/tui/readout";
import { useShell } from "@/components/shell/shell-context";
import { fmtFlex, fmtHM, flexClass, dayDateLabel } from "@/lib/tui/format";
import { getDayName, isWeekend } from "@/lib/utils/format";
import type { DayEntry, TimesheetSegment } from "@/lib/types/database";

// Lean per-day shape the panel actually renders (cached fields + segments for
// the day summary).
export type WeekDay = Pick<
  DayEntry,
  "date" | "entry_type" | "flex_minutes" | "worked_minutes" | "status" | "segments"
>;

// Compact start · lunch · end summary from a day's segments. Work bookends the
// span; the break segment (if any) is the lunch. No split-day detail (no room).
function daySummary(segments: TimesheetSegment[] | undefined) {
  if (!segments?.length) return null;
  const work = segments.filter((s) => s.type === "work");
  const span = work.length ? work : segments;
  const br = segments.find((s) => s.type === "break");
  return {
    start: span[0].start_time.slice(0, 5),
    end: span[span.length - 1].end_time.slice(0, 5),
    lunch: br ? `${br.start_time.slice(0, 5)}–${br.end_time.slice(0, 5)}` : null,
  };
}

// A week of day rows + a weekly running-balance readout. Shared by the dashboard
// "thisweek" panel and the two timesheet pay-week panels.
export function WeekPanel({
  panelId,
  title,
  dates,
  entries,
  opening,
  today,
}: {
  panelId: string;
  title: string;
  dates: string[];
  entries: WeekDay[];
  opening: number; // flex balance at the start of this week
  today: string;
}) {
  const { selectedDate, activePanel, openEdit, registerPanelDates } = useShell();
  const byDate = new Map(entries.map((e) => [e.date, e]));

  // Register the dates this panel drives so shell arrow keys can move the day.
  const dateKey = dates.join(",");
  useEffect(
    () => registerPanelDates(panelId, dates),
    // dates is stable per render-set; key on its content to avoid re-registering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panelId, dateKey, registerPanelDates]
  );

  // Sum only the days this panel shows, so callers can pass a wider entry set.
  const shown = dates.map((d) => byDate.get(d)).filter(Boolean) as WeekDay[];
  const worked = shown.reduce((a, e) => a + e.worked_minutes, 0);
  const flex = shown.reduce((a, e) => a + e.flex_minutes, 0);

  return (
    <TerminalFrame
      panelId={panelId}
      active={activePanel === panelId}
      title={title}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-0.5">
          {dates.map((date) => {
            const isToday = date === today;
            const isSelected = date === selectedDate;
            const weekend = isWeekend(date);
            const entry = byDate.get(date);
            const missing = !entry && !weekend && date < today;
            const f = entry?.flex_minutes ?? 0;
            const summary = entry ? daySummary(entry.segments) : null;
            return (
              <button
                type="button"
                key={date}
                disabled={weekend}
                onClick={() => openEdit(date)}
                className={`flex w-full flex-col gap-0.5 px-2 py-1 text-left text-sm transition-colors ${
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
                <span className="flex w-full items-center gap-3">
                  <span className="w-[4ch] font-medium">{getDayName(date)}</span>
                  <span className="w-[8ch] text-muted-foreground">
                    {dayDateLabel(date)}
                  </span>
                  <span className="flex flex-1 items-center gap-3">
                    {entry ? (
                      <>
                        <TypeTag type={entry.entry_type} />
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
                        className="w-16 justify-center border-[var(--c-miss)] text-[var(--c-miss)]"
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
                </span>
                {summary && (
                  <span className="flex w-full items-center gap-3 text-xs tabular-nums text-muted-foreground/70">
                    <span className="w-[4ch]" />
                    <span className="w-[8ch]" />
                    <span>
                      {summary.start}–{summary.end}
                      {summary.lunch && (
                        <span className="text-muted-foreground/50">
                          {" "}
                          · lunch {summary.lunch}
                        </span>
                      )}
                    </span>
                  </span>
                )}
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
