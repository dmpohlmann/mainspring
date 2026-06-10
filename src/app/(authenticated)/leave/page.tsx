import {
  LeaveBalancesPanel,
  type BalanceRow,
} from "@/components/panels/leave-balances-panel";
import { LeaveTransactionsPanel } from "@/components/panels/leave-transactions-panel";
import { LeaveAdjustPanel } from "@/components/panels/leave-adjust-panel";
import { getFlexBalance } from "@/lib/queries/entries";
import { getLeaveBalances, getLeaveTransactions } from "@/lib/queries/leave";
import { getSettings } from "@/lib/queries/settings";
import { appToday } from "@/lib/utils/today";
import { LEAVE_TYPE_SEGMENT } from "@/lib/tui/types";
import type { LeaveType } from "@/lib/types/database";

const MS_PER_DAY = 86400000;

export default async function LeavePage() {
  const today = appToday();
  const [balances, transactions, flexMinutes, settings] = await Promise.all([
    getLeaveBalances(),
    getLeaveTransactions(),
    getFlexBalance(),
    getSettings(),
  ]);

  const standardDayHours = (settings?.standard_day_minutes ?? 450) / 60;
  const fyStartMonth = settings?.financial_year_start_month ?? 7; // 1-indexed

  // Financial-year end = last day of the month before the FY start month.
  const [ty, tm] = today.split("-").map(Number);
  const fyEndYear = tm >= fyStartMonth ? ty + 1 : ty;
  const fyEnd = new Date(Date.UTC(fyEndYear, fyStartMonth - 1, 0));
  const fyEndStr = fyEnd.toISOString().slice(0, 10);
  // Days remaining this FY — accrual is daily, so project on days, not whole
  // fortnights (the fortnightly floor under-counts near EOFY).
  const daysToFYEnd = Math.max(
    0,
    Math.round(
      (Date.parse(fyEndStr + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) /
        MS_PER_DAY
    )
  );
  const fyEndLabel = fyEnd.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const byType = new Map(balances.map((b) => [b.leave_type, b]));
  const rows: BalanceRow[] = (["annual", "personal"] as LeaveType[]).map((lt) => {
    const b = byType.get(lt);
    const balanceH = b ? Number(b.balance_hours) : 0;
    const accrualFn = b ? Number(b.accrual_rate_hours_per_fortnight) : 0;
    return {
      seg: LEAVE_TYPE_SEGMENT[lt],
      balanceH,
      accrualFn,
      eofy: balanceH + (accrualFn / 14) * daysToFYEnd, // daily accrual
    };
  });
  rows.push({ seg: "flex_day", balanceH: flexMinutes / 60, accrualFn: null, eofy: null });

  return (
    <>
      <LeaveBalancesPanel
        panelId="balances"
        rows={rows}
        standardDayHours={standardDayHours}
        fyEndLabel={fyEndLabel}
        daysToFYEnd={daysToFYEnd}
      />
      <LeaveTransactionsPanel panelId="transactions" transactions={transactions} />
      <LeaveAdjustPanel panelId="adjust" />
    </>
  );
}
