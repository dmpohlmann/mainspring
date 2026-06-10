import { CalendarPanel } from "@/components/panels/calendar-panel";
import { getEntriesInRange, getPublicHolidays } from "@/lib/queries/entries";
import { getSettings } from "@/lib/queries/settings";
import { appToday } from "@/lib/utils/today";
import { calendarView, stepCursor } from "@/lib/tui/calendar";
import { DEFAULT_ANCHOR_DATE, localDate } from "@/lib/utils/pay-fortnight";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; cursor?: string }>;
}) {
  const sp = await searchParams;
  const today = appToday();
  const view = sp.view ?? "month";
  const cursor = sp.cursor ?? today;

  const settings = await getSettings();
  const anchor = settings?.pay_fortnight_anchor_date
    ? localDate(settings.pay_fortnight_anchor_date)
    : DEFAULT_ANCHOR_DATE;

  const v = calendarView(view, cursor, anchor);
  const [entries, holidays] = await Promise.all([
    getEntriesInRange(v.rangeStart, v.rangeEnd),
    getPublicHolidays(settings?.state ?? "QLD", v.rangeStart, v.rangeEnd),
  ]);

  return (
    <CalendarPanel
      panelId="month"
      view={view}
      cursor={cursor}
      cells={v.cells}
      headers={v.headers}
      label={v.label}
      dimMonth={v.dimMonth}
      prevCursor={stepCursor(view, cursor, -1)}
      nextCursor={stepCursor(view, cursor, 1)}
      entries={entries}
      holidays={holidays}
      today={today}
    />
  );
}
