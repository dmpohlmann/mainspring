"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TerminalFrame } from "@/components/tui/terminal-frame";
import { TokenSelect } from "@/components/tui/token-select";
import { TypeTag } from "@/components/tui/type-tag";
import { Button } from "@/components/ui/button";
import { useShell } from "@/components/shell/shell-context";
import { fmtFlex, flexClass, dayDateLabel } from "@/lib/tui/format";
import { typeCode, typeColor, typeLabel } from "@/lib/tui/types";
import { CAL_VIEWS } from "@/lib/tui/calendar";
import { getDayName, isWeekend } from "@/lib/utils/format";
import type { DayEntry } from "@/lib/types/database";

const ENTRY_FILTER_TYPES = [
  "work",
  "annual_leave",
  "personal_leave",
  "flex_day",
  "public_holiday",
];
const CAL_FILTERS = [
  { value: "all", code: "all", label: "all entries" },
  ...ENTRY_FILTER_TYPES.map((v) => ({
    value: v,
    code: typeCode(v),
    label: typeLabel(v),
  })),
];

export function CalendarPanel({
  panelId,
  view,
  cursor,
  cells,
  headers,
  label,
  dimMonth,
  prevCursor,
  nextCursor,
  entries,
  holidays,
  today,
}: {
  panelId: string;
  view: string;
  cursor: string;
  cells: string[] | null;
  headers: string[];
  label: string;
  dimMonth: number | null;
  prevCursor: string;
  nextCursor: string;
  entries: DayEntry[];
  holidays: { date: string; name: string }[];
  today: string;
}) {
  const router = useRouter();
  const { selectedDate, activePanel, openEdit, registerPanelDates } = useShell();
  const [filter, setFilter] = useState("all");

  const byDate = new Map(entries.map((e) => [e.date, e]));
  const holidayByDate = new Map(holidays.map((h) => [h.date, h.name]));
  const matches = (e: DayEntry) => filter === "all" || e.entry_type === filter;

  const go = (v: string, c: string) =>
    router.push(`/calendar?view=${v}&cursor=${c}`);

  // Register the navigable (in-range, non-weekend) dates for shell arrow keys.
  const navigable =
    cells === null
      ? entries.map((e) => e.date).sort()
      : cells.filter(
          (d) =>
            (dimMonth === null || new Date(d + "T00:00:00Z").getUTCMonth() === dimMonth) &&
            !isWeekend(d)
        );
  const navKey = navigable.join(",");
  useEffect(
    () => registerPanelDates(panelId, navigable),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panelId, navKey, registerPanelDates]
  );

  const legend = ENTRY_FILTER_TYPES.filter((t) => t !== "work");

  return (
    <TerminalFrame
      panelId={panelId}
      active={activePanel === panelId}
      title={`mainspring — ~/calendar/${view}${
        view === "list" ? "" : ` [${label}]`
      }`}
    >
      {/* view + filter controls */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="uppercase text-muted-foreground">view</span>
          <TokenSelect
            value={view}
            options={CAL_VIEWS}
            onChange={(v) => go(v, cursor)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="uppercase text-muted-foreground">filter</span>
          <TokenSelect value={filter} options={CAL_FILTERS} onChange={setFilter} />
        </div>
      </div>

      {view !== "list" && (
        <div className="mb-2 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => go(view, prevCursor)}>
            ‹ prev
          </Button>
          <span className="font-bold">{label}</span>
          <Button variant="outline" size="sm" onClick={() => go(view, nextCursor)}>
            next ›
          </Button>
        </div>
      )}

      {view === "list" ? (
        <CalList
          entries={entries}
          filter={filter}
          selectedDate={selectedDate}
          onEditDay={openEdit}
        />
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {headers.map((h, i) => (
            <div
              key={`${h}-${i}`}
              className="px-1 py-0.5 text-center uppercase text-muted-foreground"
            >
              {h}
            </div>
          ))}
          {cells!.map((date) => {
            const d = new Date(date + "T00:00:00Z");
            const inRange = dimMonth === null || d.getUTCMonth() === dimMonth;
            const weekend = isWeekend(date);
            const isToday = date === today;
            const isSelected = date === selectedDate && inRange;
            const entry = inRange ? byDate.get(date) : undefined;
            const showEntry = entry && matches(entry);
            // Public holiday shown when there's no entry on that day and the
            // filter allows it (all / PHOL).
            const holiday = inRange ? holidayByDate.get(date) : undefined;
            const showHoliday =
              holiday && !showEntry && (filter === "all" || filter === "public_holiday");
            return (
              <button
                key={date}
                type="button"
                disabled={!inRange || weekend}
                onClick={() => openEdit(date)}
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
                    className={`mt-auto ${typeColor(entry.entry_type)}`}
                    title={`${typeLabel(entry.entry_type)}${
                      entry.status ? ` (${entry.status})` : ""
                    }`}
                  >
                    {typeCode(entry.entry_type)}
                    {entry.status && entry.status !== "approved" && (
                      <span className="text-muted-foreground">*</span>
                    )}
                  </span>
                )}
                {showHoliday && (
                  <span
                    className={`mt-auto ${typeColor("public_holiday")}`}
                    title={holiday}
                  >
                    {typeCode("public_holiday")}
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
            <span key={t} className="flex items-center gap-1">
              <span className={typeColor(t)}>{typeCode(t)}</span>
              <span>{typeLabel(t)}</span>
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

// Chronological list of entries in range, filtered by type.
function CalList({
  entries,
  filter,
  selectedDate,
  onEditDay,
}: {
  entries: DayEntry[];
  filter: string;
  selectedDate: string;
  onEditDay: (d: string) => void;
}) {
  const rows = entries
    .filter((e) => filter === "all" || e.entry_type === filter)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!rows.length) {
    return (
      <p className="text-muted-foreground">
        <span className="text-secondary">$</span> no entries match this filter.
      </p>
    );
  }
  return (
    <div className="space-y-0.5">
      {rows.map((e) => {
        const isSelected = e.date === selectedDate;
        const weekend = isWeekend(e.date);
        return (
          <button
            key={e.date}
            type="button"
            disabled={weekend}
            onClick={() => onEditDay(e.date)}
            className={`flex w-full items-center gap-3 px-2 py-1 text-left text-sm transition-colors ${
              weekend ? "cursor-default" : "hover:bg-muted"
            } ${isSelected ? "bg-secondary/20 ring-1 ring-secondary/60" : ""}`}
          >
            <span className="w-[7ch] text-muted-foreground">
              {dayDateLabel(e.date)}
            </span>
            <span className="w-[4ch] font-medium">{getDayName(e.date)}</span>
            <TypeTag type={e.entry_type} />
            <span className={`w-20 ${flexClass(e.flex_minutes)}`}>
              {fmtFlex(e.flex_minutes)}
            </span>
            {e.status && (
              <span
                className={
                  e.status === "approved"
                    ? "text-muted-foreground"
                    : "text-[var(--c-miss)]"
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
