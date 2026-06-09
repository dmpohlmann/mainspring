// Single source of truth for entry/segment/leave display metadata — codes,
// labels, and ANSI-style colours used by every TUI panel and the edit modal.
//
// IMPORTANT: keyed on the DB enum values (work / annual_leave / personal_leave /
// flex_day / public_holiday / break / other), NOT the prototype's short names.
// Red is reserved for −flex and amber for MISS, so neither appears here.

import type { LeaveType } from "@/lib/types/database";

export type TokenOption = { value: string; code: string; label: string };

type TypeMeta = { code: string; label: string; color: string; border: string };

export const TYPE_META: Record<string, TypeMeta> = {
  work: {
    code: "WRK",
    label: "work",
    color: "text-foreground",
    border: "border-border",
  },
  break: {
    code: "LUN",
    label: "lunch / break",
    color: "text-muted-foreground",
    border: "border-border",
  },
  annual_leave: {
    code: "REC",
    label: "recreation (annual) leave",
    color: "text-[var(--type-rec)]",
    border: "border-[var(--type-rec)]",
  },
  personal_leave: {
    code: "PRS",
    label: "personal leave",
    color: "text-[var(--type-prs)]",
    border: "border-[var(--type-prs)]",
  },
  flex_day: {
    code: "FLEX",
    label: "flex day",
    color: "text-[var(--type-flex)]",
    border: "border-[var(--type-flex)]",
  },
  public_holiday: {
    code: "PHOL",
    label: "public holiday",
    color: "text-[var(--type-phol)]",
    border: "border-[var(--type-phol)]",
  },
  other: {
    code: "OTH",
    label: "other",
    color: "text-foreground",
    border: "border-border",
  },
};

export const typeCode = (t: string) => TYPE_META[t]?.code ?? t;
export const typeLabel = (t: string) => TYPE_META[t]?.label ?? t;
export const typeColor = (t: string) => TYPE_META[t]?.color ?? "text-foreground";
export const typeBorder = (t: string) => TYPE_META[t]?.border ?? "border-border";

const toOption = (value: string): TokenOption => ({
  value,
  code: typeCode(value),
  label: typeLabel(value),
});

// Selectable block types in the day-timeline editor (DB segment_type values).
export const SEGMENT_TYPES: TokenOption[] = [
  "work",
  "break",
  "annual_leave",
  "personal_leave",
  "flex_day",
  "public_holiday",
].map(toOption);

// Leave approval status (for scheduling ahead). Code doubles as the token label.
export const STATUS_TYPES: TokenOption[] = [
  { value: "planned", code: "planned", label: "planned — not yet submitted" },
  { value: "pending", code: "pending", label: "pending approval" },
  { value: "approved", code: "approved", label: "approved" },
];

// Leave-balance types (leave_type enum) → the matching segment type's metadata.
export const LEAVE_TYPE_SEGMENT: Record<LeaveType, string> = {
  annual: "annual_leave",
  personal: "personal_leave",
};
