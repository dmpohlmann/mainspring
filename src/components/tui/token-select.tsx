"use client";

import type { TokenOption } from "@/lib/tui/types";

// TUI-style inline selector: all options visible as tokens, active one filled.
export function TokenSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: TokenOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 text-sm">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={
              active
                ? "bg-secondary px-1.5 py-0.5 text-secondary-foreground"
                : "px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          >
            {active ? `[${o.code}]` : o.code}
          </button>
        );
      })}
    </div>
  );
}
