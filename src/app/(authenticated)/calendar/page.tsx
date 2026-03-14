import { CalendarView } from "@/components/calendar/calendar-view";
import { getMonthEntries } from "@/lib/queries/timesheet";
import { getLeaveBalances } from "@/lib/queries/dashboard";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;

  const [entries, leaveBalances] = await Promise.all([
    getMonthEntries(year, month),
    getLeaveBalances(),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Calendar</h2>
      <CalendarView
        entries={entries}
        leaveBalances={leaveBalances}
        year={year}
        month={month}
      />
    </div>
  );
}
