import { getEntriesByDateRange } from "@/lib/queries/timesheet";
import { getSettings } from "@/lib/queries/dashboard";
import { WeeklyView } from "@/components/timesheet/weekly-view";
import { getWeekStart, toDateString } from "@/lib/utils/format";
import { getPayFortnight, DEFAULT_ANCHOR_DATE, parseAnchorDate, toUTCDateString } from "@/lib/utils/pay-fortnight";

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "fortnight" ? "fortnight" : "week";

  let startDate: string;
  let endDateStr: string;
  let payPeriodLabel: string | undefined;

  if (view === "fortnight") {
    const settings = await getSettings();
    const anchor = settings?.pay_fortnight_anchor_date
      ? parseAnchorDate(settings.pay_fortnight_anchor_date)
      : DEFAULT_ANCHOR_DATE;

    const refDate = params.start
      ? new Date(params.start + "T00:00:00")
      : new Date();

    const { start, end } = getPayFortnight(refDate, anchor);
    startDate = toUTCDateString(start);
    endDateStr = toUTCDateString(end);

    const fmtStart = start.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
    const fmtEnd = end.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    payPeriodLabel = `PP: ${fmtStart} – ${fmtEnd}`;
  } else {
    startDate = params.start || toDateString(getWeekStart(new Date()));
    const endDate = new Date(startDate + "T00:00:00");
    endDate.setDate(endDate.getDate() + 6);
    endDateStr = toDateString(endDate);
  }

  const entries = await getEntriesByDateRange(startDate, endDateStr);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Timesheet</h2>
      <WeeklyView
        entries={entries}
        startDate={startDate}
        view={view}
        payPeriodLabel={payPeriodLabel}
      />
    </div>
  );
}
