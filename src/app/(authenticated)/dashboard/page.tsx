import { getToilBalance, getLeaveBalances, getTodayEntry, getWeekEntries, getFortnightEntries } from "@/lib/queries/dashboard";
import { ToilBalanceCard } from "@/components/dashboard/toil-balance-card";
import { LeaveBalanceCards } from "@/components/dashboard/leave-balance-cards";
import { TodayStatus } from "@/components/dashboard/today-status";
import { WeekSummary } from "@/components/dashboard/week-summary";
import { FortnightSummary } from "@/components/dashboard/fortnight-summary";

export default async function DashboardPage() {
  const [toilBalance, leaveBalances, todayEntry, weekData, fortnightData] = await Promise.all([
    getToilBalance(),
    getLeaveBalances(),
    getTodayEntry(),
    getWeekEntries(),
    getFortnightEntries(),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ToilBalanceCard toilMinutes={toilBalance} />
        <LeaveBalanceCards balances={leaveBalances} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TodayStatus entry={todayEntry} />
        <WeekSummary entries={weekData.entries} weekStart={weekData.weekStart} />
      </div>
      <FortnightSummary
        entries={fortnightData.entries}
        start={fortnightData.fortnightStart}
        end={fortnightData.fortnightEnd}
      />
    </div>
  );
}
