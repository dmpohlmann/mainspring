"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTimeTyping } from "@/lib/tui/format";

// Typed HH:MM text field (no native time picker — keeps the TUI feel).
export function TimeInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="HH:MM"
      maxLength={5}
      value={value}
      onChange={(e) => onChange(formatTimeTyping(e.target.value))}
      className={className}
    />
  );
}

// Labelled TimeInput used by the edit modal's start/finish fields.
export function TimeField({
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
      <Label className="uppercase text-muted-foreground">{label}</Label>
      <TimeInput value={value} onChange={onChange} />
    </div>
  );
}
