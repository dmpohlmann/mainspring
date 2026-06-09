// Calendar grid maths for the CAL panel. All date strings are "YYYY-MM-DD" in
// UTC; helpers compose the UTC-safe utils in utils/format.

import { addDays, getDayOfWeek, toDateString, weekStart } from "@/lib/utils/format";
import {
  getPayFortnight,
  localDate,
  toUTCDateString,
} from "@/lib/utils/pay-fortnight";
import { dayDateLabel } from "@/lib/tui/format";

export const WEEKDAY_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const PP_HEADERS = ["THU", "FRI", "SAT", "SUN", "MON", "TUE", "WED"];

export const CAL_VIEWS = [
  { value: "month", code: "month", label: "month grid" },
  { value: "week", code: "week", label: "week (Sun–Sat)" },
  { value: "pp", code: "fortnight", label: "pay fortnight (Thu–Wed)" },
  { value: "list", code: "list", label: "list" },
];

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// 42-cell (6-week) month grid, Sunday-start, as ISO date strings.
export function getMonthGrid(year: number, month: number): string[] {
  const first = toDateString(new Date(Date.UTC(year, month, 1)));
  const startDow = getDayOfWeek(first);
  const gridStart = addDays(first, -startDow);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export interface CalendarView {
  cells: string[] | null; // null for the list view
  headers: string[];
  label: string;
  dimMonth: number | null; // grey cells outside this month (month view only)
  rangeStart: string;
  rangeEnd: string;
}

// Resolve a view + focal date (+ pay anchor) into the cells to render and the
// date range to fetch entries for.
export function calendarView(
  view: string,
  cursor: string,
  anchor: Date
): CalendarView {
  if (view === "week") {
    const s = weekStart(cursor);
    const cells = Array.from({ length: 7 }, (_, i) => addDays(s, i));
    return {
      cells,
      headers: WEEKDAY_HEADERS,
      label: `${dayDateLabel(cells[0])} – ${dayDateLabel(cells[6])}`,
      dimMonth: null,
      rangeStart: cells[0],
      rangeEnd: cells[6],
    };
  }
  if (view === "pp") {
    const { start } = getPayFortnight(localDate(cursor), anchor);
    const s = toUTCDateString(start);
    const cells = Array.from({ length: 14 }, (_, i) => addDays(s, i));
    return {
      cells,
      headers: PP_HEADERS,
      label: `PP ${dayDateLabel(cells[0])} – ${dayDateLabel(cells[13])}`,
      dimMonth: null,
      rangeStart: cells[0],
      rangeEnd: cells[13],
    };
  }
  if (view === "list") {
    return {
      cells: null,
      headers: [],
      label: "",
      dimMonth: null,
      rangeStart: addDays(cursor, -365),
      rangeEnd: addDays(cursor, 90),
    };
  }
  // month (default)
  const [y, m] = cursor.split("-").map(Number);
  const month = m - 1;
  const cells = getMonthGrid(y, month);
  return {
    cells,
    headers: WEEKDAY_HEADERS,
    label: monthLabel(y, month),
    dimMonth: month,
    rangeStart: cells[0],
    rangeEnd: cells[41],
  };
}

// Step the focal date by one view-unit (month / week / fortnight). List is fixed.
export function stepCursor(view: string, cursor: string, dir: number): string {
  if (view === "week") return addDays(cursor, dir * 7);
  if (view === "pp") return addDays(cursor, dir * 14);
  if (view === "list") return cursor;
  // month → first of the prev/next month
  const [y, m] = cursor.split("-").map(Number);
  const total = y * 12 + (m - 1) + dir;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, "0")}-01`;
}
