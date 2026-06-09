// All date helpers operate on "YYYY-MM-DD" strings in UTC, to avoid the
// local-timezone day-shift bugs that the old (local-time) helpers had.

export function formatFlexMinutes(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "−"; // U+2212 minus
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}h ${(abs % 60).toString().padStart(2, "0")}m`;
}

export function formatWorkedMinutes(minutes: number): string {
  const abs = Math.abs(minutes);
  return `${Math.floor(abs / 60)}h ${(abs % 60).toString().padStart(2, "0")}m`;
}

export function formatHoursToDays(hours: number, standardDayHours = 7.5): string {
  return `${hours.toFixed(1)}h (${(hours / standardDayHours).toFixed(1)}d)`;
}

function parse(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = parse(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

export function getDayOfWeek(dateStr: string): number {
  return parse(dateStr).getUTCDay(); // 0 = Sun … 6 = Sat
}

export function getDayName(dateStr: string): string {
  return parse(dateStr).toLocaleDateString("en-AU", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function isWeekend(dateStr: string): boolean {
  const d = getDayOfWeek(dateStr);
  return d === 0 || d === 6;
}

// Sunday-start week (matches the dashboard "this week" view).
export function weekStart(dateStr: string): string {
  const d = parse(dateStr);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return toDateString(d);
}

export function formatDateAU(dateStr: string): string {
  return parse(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateLong(dateStr: string): string {
  return parse(dateStr).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(time: string | null): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

export const ENTRY_TYPE_LABEL: Record<string, string> = {
  work: "Work",
  annual_leave: "Annual leave",
  personal_leave: "Personal leave",
  public_holiday: "Public holiday",
  flex_day: "Flex day",
  other: "Other",
};

export function entryTypeLabel(type: string): string {
  return ENTRY_TYPE_LABEL[type] ?? type;
}
