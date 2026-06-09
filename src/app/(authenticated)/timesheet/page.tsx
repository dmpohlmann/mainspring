import { WeekPanel } from "@/components/panels/week-panel";
import { TotalsPanel, type TotalsColumn } from "@/components/panels/totals-panel";
import { getEntriesInRange, getFlexBalance } from "@/lib/queries/entries";
import { getSettings } from "@/lib/queries/settings";
import { appToday } from "@/lib/utils/today";
import { addDays } from "@/lib/utils/format";
import { segmentMinutes } from "@/lib/utils/entry-calc";
import { dayDateLabel } from "@/lib/tui/format";
import {
  DEFAULT_ANCHOR_DATE,
  getPayFortnight,
  toUTCDateString,
} from "@/lib/utils/pay-fortnight";
import type { DayEntry } from "@/lib/types/database";

const LEAVE_SEG_TYPES = ["annual_leave", "personal_leave", "public_holiday"];

// Build a YYYY-MM-DD with the intended calendar components (avoids the local-tz
// drift in getPayFortnight, which reads local date parts).
function localDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Aggregate worked/flex/leave-by-type over a set of dates from the fetched entries.
function columnFor(key: string, entries: DayEntry[], dates: string[]): TotalsColumn {
  const set = new Set(dates);
  const es = entries.filter((e) => set.has(e.date));
  const leave: Record<string, number> = {};
  for (const e of es) {
    for (const s of e.segments) {
      if (LEAVE_SEG_TYPES.includes(s.type))
        leave[s.type] = (leave[s.type] ?? 0) + segmentMinutes(s);
    }
  }
  return {
    key,
    worked: es.reduce((a, e) => a + e.worked_minutes, 0),
    flex: es.reduce((a, e) => a + e.flex_minutes, 0),
    leave,
  };
}

const sumFlex = (entries: DayEntry[], dates: string[]) => {
  const set = new Set(dates);
  return entries
    .filter((e) => set.has(e.date))
    .reduce((a, e) => a + e.flex_minutes, 0);
};

export default async function TimesheetPage() {
  const today = appToday();
  const settings = await getSettings();
  const anchor = settings?.pay_fortnight_anchor_date
    ? localDate(settings.pay_fortnight_anchor_date)
    : DEFAULT_ANCHOR_DATE;

  const { start } = getPayFortnight(localDate(today), anchor);
  const startStr = toUTCDateString(start);
  const fortnight = Array.from({ length: 14 }, (_, i) => addDays(startStr, i));
  const week1 = fortnight.slice(0, 7);
  const week2 = fortnight.slice(7, 14);

  const [entries, totalFlex] = await Promise.all([
    getEntriesInRange(fortnight[0], fortnight[13]),
    getFlexBalance(),
  ]);

  // Opening flex before this fortnight = total balance minus the fortnight's flex.
  const fortnightFlex = sumFlex(entries, fortnight);
  const opening = totalFlex - fortnightFlex;
  const week1Flex = sumFlex(entries, week1);

  const columns = [
    columnFor("WK1", entries, week1),
    columnFor("WK2", entries, week2),
    columnFor("PP", entries, fortnight),
  ];

  return (
    <>
      <WeekPanel
        panelId="week1"
        title={`mainspring — ~/timesheet/week1 [${dayDateLabel(
          week1[0]
        )} – ${dayDateLabel(week1[6])}]`}
        dates={week1}
        entries={entries}
        opening={opening}
        today={today}
      />
      <WeekPanel
        panelId="week2"
        title={`mainspring — ~/timesheet/week2 [${dayDateLabel(
          week2[0]
        )} – ${dayDateLabel(week2[6])}]`}
        dates={week2}
        entries={entries}
        opening={opening + week1Flex}
        today={today}
      />
      <TotalsPanel
        panelId="totals"
        title={`mainspring — ~/timesheet/totals [${dayDateLabel(
          fortnight[0]
        )} – ${dayDateLabel(fortnight[13])}]`}
        opening={opening}
        columns={columns}
      />
    </>
  );
}
