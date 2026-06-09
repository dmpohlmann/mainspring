"use client";

import { Fragment } from "react";
import { TerminalFrame } from "@/components/tui/terminal-frame";
import { useShell } from "@/components/shell/shell-context";
import { typeCode, typeColor, typeLabel } from "@/lib/tui/types";

// One row per balance, precomputed by the page. `seg` is a DB segment/entry type
// used purely for the code + colour (annual_leave / personal_leave / flex_day).
export type BalanceRow = {
  seg: string;
  balanceH: number;
  accrualFn: number | null; // null = doesn't accrue fortnightly (flex)
  eofy: number | null; // projected EOFY balance, null when not projected
};

export function LeaveBalancesPanel({
  panelId,
  rows,
  standardDayHours,
  fyEndLabel,
  fortnightsToFYEnd,
}: {
  panelId: string;
  rows: BalanceRow[];
  standardDayHours: number;
  fyEndLabel: string;
  fortnightsToFYEnd: number;
}) {
  const { activePanel } = useShell();
  const num = "text-right tabular-nums";
  const head = `${num} uppercase text-muted-foreground`;
  return (
    <TerminalFrame
      panelId={panelId}
      active={activePanel === panelId}
      title="mainspring — ~/leave/balances"
    >
      <div className="grid grid-cols-[1fr_repeat(4,4.5rem)] gap-x-3 gap-y-1">
        <span />
        <span className={head}>bal h</span>
        <span className={head}>days</span>
        <span className={head}>accr/fn</span>
        <span className={head}>EOFY</span>
        {rows.map((b) => (
          <Fragment key={b.seg}>
            <span className={typeColor(b.seg)} title={typeLabel(b.seg)}>
              {typeCode(b.seg)}
            </span>
            <span className={`${num} font-bold`}>{b.balanceH.toFixed(1)}</span>
            <span className={num}>{(b.balanceH / standardDayHours).toFixed(1)}</span>
            <span className={num}>
              {b.accrualFn ? `+${b.accrualFn.toFixed(2)}` : "—"}
            </span>
            <span className={num}>{b.eofy !== null ? b.eofy.toFixed(1) : "—"}</span>
          </Fragment>
        ))}
      </div>
      <p className="mt-3 border-t border-dashed border-border pt-2 text-muted-foreground">
        EOFY = projected balance at {fyEndLabel} ({fortnightsToFYEnd} fortnight
        {fortnightsToFYEnd === 1 ? "" : "s"} of accrual left). FLEX accrues from
        worked hours, not fortnightly.
      </p>
    </TerminalFrame>
  );
}
