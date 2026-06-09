"use client";

import { Fragment } from "react";
import { TerminalFrame } from "@/components/tui/terminal-frame";
import { useShell } from "@/components/shell/shell-context";
import { fmtFlex, fmtHM, flexClass } from "@/lib/tui/format";
import { typeCode, typeLabel } from "@/lib/tui/types";

// Leave/PH rows shown in the totals pivot (DB segment_type values).
const LEAVE_ROWS = ["annual_leave", "personal_leave", "public_holiday"];

export type TotalsColumn = {
  key: string; // WK1 / WK2 / PP
  worked: number;
  flex: number;
  leave: Record<string, number>; // minutes per segment type
};

// Fortnight totals — pivoted: weeks (and the pay period) are columns, the
// metrics (worked, flex, each leave type, running balance) are rows.
export function TotalsPanel({
  panelId,
  title,
  opening,
  columns,
}: {
  panelId: string;
  title: string;
  opening: number; // flex balance at the start of the fortnight
  columns: TotalsColumn[];
}) {
  const { activePanel } = useShell();

  // Running flex balance at the end of each column: weeks accumulate; the PP
  // column is opening + its own (whole-fortnight) flex.
  const bals: number[] = [];
  let run = opening;
  for (const c of columns) {
    if (c.key === "PP") bals.push(opening + c.flex);
    else bals.push((run += c.flex));
  }

  const num = "text-right tabular-nums";
  return (
    <TerminalFrame panelId={panelId} active={activePanel === panelId} title={title}>
      <p className="mb-2 text-muted-foreground">
        opening flex <span className={flexClass(opening)}>{fmtFlex(opening)}</span>
      </p>
      <div className="grid grid-cols-[1fr_repeat(3,5rem)] gap-x-3 gap-y-1">
        {/* header */}
        <span />
        {columns.map((c) => (
          <span key={c.key} className={`${num} font-bold`}>
            {c.key}
          </span>
        ))}

        {/* worked */}
        <span className="text-muted-foreground">worked</span>
        {columns.map((c) => (
          <span key={c.key} className={num}>
            {fmtHM(c.worked)}
          </span>
        ))}

        {/* flex */}
        <span className="text-muted-foreground">flex</span>
        {columns.map((c) => (
          <span key={c.key} className={`${num} ${flexClass(c.flex)}`}>
            {fmtFlex(c.flex)}
          </span>
        ))}

        {/* leave taken, one row per type */}
        {LEAVE_ROWS.map((t) => (
          <Fragment key={t}>
            <span className="text-muted-foreground" title={typeLabel(t)}>
              {typeCode(t)}
            </span>
            {columns.map((c) => {
              const m = c.leave[t] ?? 0;
              return (
                <span
                  key={c.key}
                  className={`${num} ${m ? "" : "text-muted-foreground/40"}`}
                >
                  {fmtHM(m)}
                </span>
              );
            })}
          </Fragment>
        ))}

        {/* running balance */}
        <span className="border-t border-border pt-1 font-bold">bal →</span>
        {bals.map((b, i) => (
          <span
            key={columns[i].key}
            className={`${num} border-t border-border pt-1 font-bold ${flexClass(b)}`}
          >
            {fmtFlex(b)}
          </span>
        ))}
      </div>
    </TerminalFrame>
  );
}
