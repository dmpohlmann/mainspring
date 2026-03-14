const MS_PER_DAY = 86400000;

export interface PayFortnight {
  start: Date;
  end: Date;
}

/**
 * Determines which APS pay fortnight a given date falls in.
 * Pay fortnights run Thursday–Wednesday (14 days).
 * Works forwards and backwards from the anchor date.
 */
export function getPayFortnight(
  targetDate: Date,
  anchorDate: Date
): PayFortnight {
  // Normalise to midnight UTC to avoid timezone issues
  const target = new Date(
    Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  );
  const anchor = new Date(
    Date.UTC(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate())
  );

  const daysDiff = Math.floor((target.getTime() - anchor.getTime()) / MS_PER_DAY);
  const fortnightOffset = Math.floor(daysDiff / 14);
  const start = new Date(anchor.getTime() + fortnightOffset * 14 * MS_PER_DAY);
  const end = new Date(start.getTime() + 13 * MS_PER_DAY);

  return { start, end };
}

/**
 * Navigate to the next or previous pay fortnight.
 */
export function navigatePayFortnight(
  currentStart: Date,
  direction: "next" | "prev"
): Date {
  const offset = direction === "next" ? 14 : -14;
  return new Date(
    Date.UTC(
      currentStart.getUTCFullYear(),
      currentStart.getUTCMonth(),
      currentStart.getUTCDate() + offset
    )
  );
}

/**
 * Format a pay period label, e.g. "PP: 15 Jan – 28 Jan 2026"
 */
export function formatPayPeriodLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const startStr = fmt(start);
  const endStr = end.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return `PP: ${startStr} – ${endStr}`;
}

/**
 * Convert a Date to YYYY-MM-DD string (UTC).
 */
export function toUTCDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse a YYYY-MM-DD string into a UTC Date.
 */
export function parseAnchorDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Default anchor: 15 January 2026 (a known APS pay period start).
 */
export const DEFAULT_ANCHOR_DATE = new Date(Date.UTC(2026, 0, 15));
