export function formatFlexMinutes(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "\u2212";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatWorkedMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatHoursTodays(hours: number): string {
  const days = hours / 7.5;
  return `${hours.toFixed(1)}h (${days.toFixed(1)}d)`;
}

export function formatDateAU(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(time: string | null): string {
  if (!time) return "\u2014";
  return time.slice(0, 5);
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short" });
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function entryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    work: "Work",
    annual_leave: "Annual Leave",
    personal_leave: "Personal Leave",
    public_holiday: "Public Holiday",
    flex_day: "Flex Day",
    other: "Other",
  };
  return labels[type] || type;
}
