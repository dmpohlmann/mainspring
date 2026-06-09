// TUI display helpers shared by the panels and the edit modal. The flex/worked
// formatters are the canonical ones from utils/format; the rest are TUI-specific.

export { formatFlexMinutes as fmtFlex, formatWorkedMinutes as fmtHM } from "@/lib/utils/format";

// Tailwind text colour for a flex value: green +, red −, muted zero.
export function flexClass(min: number): string {
  if (min > 0) return "text-[var(--c-pos)]";
  if (min < 0) return "text-[var(--c-neg)]";
  return "text-muted-foreground";
}

// Minutes from "HH:MM", tolerant of partial typing (returns 0 for incomplete).
export function toMinutes(t: string): number {
  const [h, m] = (t ?? "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

// True only for a fully-formed "HH:MM" string.
export function isCompleteTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}

// Normalise digits as you type into HH:MM (e.g. "0830" → "08:30").
export function formatTimeTyping(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

// "08 Jun" — compact day/month label for week rows and calendar headers.
export function dayDateLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

// "Mon, 08 June 2026" — full date for the edit-modal header.
export function prettyDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
