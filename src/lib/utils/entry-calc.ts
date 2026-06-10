// Segment-based day calculations — the heart of the model.
//
// A day is a contiguous timeline of typed segments. From the segments we derive:
//   worked   = Σ work-segment minutes
//   fill     = Σ leave/public-holiday minutes (these count toward the std day)
//   flex     = worked + fill − standard day        (per logged day)
//   leave    = Σ annual/personal minutes           (debits the leave balance)
//
// break segments are unpaid gaps (lunch); flex_day segments contribute nothing
// to fill, so the unfilled remainder of the standard day becomes negative flex.

import type {
  EntryType,
  SegmentType,
  TimesheetSegment,
} from "@/lib/types/database";
import { timeToMinutes } from "@/lib/utils/time-calculations";

export const STANDARD_DAY_MINUTES = 450;

// Minutes that count toward fulfilling the standard day (besides worked time).
// 'other' is paid non-work leave (study, disaster, etc.) — it fills the day too.
const FILL_TYPES: SegmentType[] = [
  "annual_leave",
  "personal_leave",
  "public_holiday",
  "other",
];

type SegLike = Pick<TimesheetSegment, "type" | "start_time" | "end_time">;

export function segmentMinutes(seg: Pick<SegLike, "start_time" | "end_time">): number {
  return Math.max(0, timeToMinutes(seg.end_time) - timeToMinutes(seg.start_time));
}

export function workedMinutes(segments: SegLike[]): number {
  return segments
    .filter((s) => s.type === "work")
    .reduce((a, s) => a + segmentMinutes(s), 0);
}

function fillMinutes(segments: SegLike[]): number {
  return segments
    .filter((s) => FILL_TYPES.includes(s.type))
    .reduce((a, s) => a + segmentMinutes(s), 0);
}

// flex = worked + leave/PH fill − standard day. Only meaningful for a logged
// day; an empty timeline (no entry) contributes 0.
export function flexMinutes(
  segments: SegLike[],
  standardDayMinutes = STANDARD_DAY_MINUTES
): number {
  if (!segments.length) return 0;
  return workedMinutes(segments) + fillMinutes(segments) - standardDayMinutes;
}

// Leave drawn from a balance, in minutes per leave_type (annual/personal only —
// public holidays and flex days don't debit a leave balance).
export function leaveTakenByType(segments: SegLike[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of segments) {
    if (s.type === "annual_leave" || s.type === "personal_leave") {
      m[s.type] = (m[s.type] ?? 0) + segmentMinutes(s);
    }
  }
  return m;
}

// Cached "primary" type for calendar/list display + filtering: the largest
// non-work, non-break segment, else 'work'.
export function primaryType(segments: SegLike[]): EntryType {
  const nonWork = segments.filter((s) => s.type !== "work" && s.type !== "break");
  if (!nonWork.length) return "work";
  const largest = nonWork.reduce((a, b) =>
    segmentMinutes(b) > segmentMinutes(a) ? b : a
  );
  return largest.type as EntryType;
}
