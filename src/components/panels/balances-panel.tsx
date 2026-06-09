"use client";

import { TerminalFrame } from "@/components/tui/terminal-frame";
import { useShell } from "@/components/shell/shell-context";
import { fmtFlex, flexClass } from "@/lib/tui/format";
import { LEAVE_TYPE_SEGMENT, typeCode, typeColor, typeLabel } from "@/lib/tui/types";
import type { LeaveBalance } from "@/lib/types/database";

// Dashboard balances: running FLEX balance + each leave balance (hours / days).
export function BalancesPanel({
  panelId,
  flexMinutes,
  balances,
  standardDayHours,
}: {
  panelId: string;
  flexMinutes: number;
  balances: LeaveBalance[];
  standardDayHours: number;
}) {
  const { activePanel } = useShell();
  return (
    <TerminalFrame
      panelId={panelId}
      active={activePanel === panelId}
      title="mainspring — ~/dashboard/balances"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        <div>
          <div title="flex / TOIL balance" className="uppercase text-muted-foreground">
            flex
          </div>
          <div className={`font-bold ${flexClass(flexMinutes)}`}>
            {fmtFlex(flexMinutes)}
          </div>
        </div>
        {balances.map((b) => {
          const seg = LEAVE_TYPE_SEGMENT[b.leave_type];
          const hours = Number(b.balance_hours);
          return (
            <div key={b.leave_type}>
              <div
                title={typeLabel(seg)}
                className={`uppercase ${typeColor(seg)}`}
              >
                {typeCode(seg)}
              </div>
              <div className="font-bold">
                {hours.toFixed(1)}h{" "}
                <span className="font-normal text-muted-foreground">
                  / {(hours / standardDayHours).toFixed(1)}d
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </TerminalFrame>
  );
}
