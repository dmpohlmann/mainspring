"use client";

import { useState } from "react";
import { TerminalFrame } from "@/components/tui/terminal-frame";
import { TokenSelect } from "@/components/tui/token-select";
import { TypeTag } from "@/components/tui/type-tag";
import { useShell } from "@/components/shell/shell-context";
import { LEAVE_TYPE_SEGMENT } from "@/lib/tui/types";
import type { LeaveTransaction } from "@/lib/types/database";

const TX_FILTERS = [
  { value: "all", code: "all", label: "all types" },
  { value: "annual", code: "REC", label: "recreation (annual) leave" },
  { value: "personal", code: "PRS", label: "personal leave" },
  { value: "flex", code: "FLEX", label: "flex" },
];

function hoursLabel(h: number) {
  return `${h >= 0 ? "+" : "−"}${Math.abs(h).toFixed(2)}h`;
}

export function LeaveTransactionsPanel({
  panelId,
  transactions,
}: {
  panelId: string;
  transactions: LeaveTransaction[];
}) {
  const { activePanel } = useShell();
  const [filter, setFilter] = useState("all");
  const rows = transactions.filter(
    (t) => filter === "all" || t.leave_type === filter
  );
  return (
    <TerminalFrame
      panelId={panelId}
      active={activePanel === panelId}
      title="mainspring — ~/leave/transactions"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="uppercase text-muted-foreground">filter</span>
        <TokenSelect value={filter} options={TX_FILTERS} onChange={setFilter} />
      </div>
      <div className="space-y-0.5">
        {rows.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-2 py-1 text-sm">
            <span className="w-[10ch] text-muted-foreground">
              {new Date(t.date + "T00:00:00Z").toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
                timeZone: "UTC",
              })}
            </span>
            <TypeTag type={LEAVE_TYPE_SEGMENT[t.leave_type]} />
            <span
              className={`w-20 text-right tabular-nums ${
                Number(t.hours) >= 0 ? "text-[var(--c-pos)]" : "text-[var(--c-neg)]"
              }`}
            >
              {hoursLabel(Number(t.hours))}
            </span>
            <span className="flex-1 truncate text-muted-foreground">
              {t.description}
            </span>
          </div>
        ))}
        {!rows.length && (
          <p className="text-muted-foreground">
            <span className="text-secondary">$</span> no transactions match.
          </p>
        )}
      </div>
    </TerminalFrame>
  );
}
