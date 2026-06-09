import { BalancesPanel } from "@/components/panels/balances-panel";
import { WeekPanel } from "@/components/panels/week-panel";
import { getEntriesInRange, getFlexBalance } from "@/lib/queries/entries";
import { getLeaveBalances } from "@/lib/queries/leave";
import { getSettings } from "@/lib/queries/settings";
import { appToday } from "@/lib/utils/today";
import { addDays, weekStart } from "@/lib/utils/format";
import { dayDateLabel } from "@/lib/tui/format";

export default async function DashboardPage() {
  const today = appToday();
  const start = weekStart(today); // Sunday-start week
  const end = addDays(start, 6);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const [flexMinutes, balances, settings, entries] = await Promise.all([
    getFlexBalance(),
    getLeaveBalances(),
    getSettings(),
    getEntriesInRange(start, end),
  ]);

  const standardDayHours = (settings?.standard_day_minutes ?? 450) / 60;
  // Opening flex for this week = total balance minus what this week contributed.
  const weekFlex = entries.reduce((a, e) => a + e.flex_minutes, 0);
  const opening = flexMinutes - weekFlex;

  return (
    <>
      <BalancesPanel
        panelId="balances"
        flexMinutes={flexMinutes}
        balances={balances}
        standardDayHours={standardDayHours}
      />
      <WeekPanel
        panelId="thisweek"
        title={`mainspring — ~/dashboard/thisweek [${dayDateLabel(
          start
        )} – ${dayDateLabel(end)}]`}
        dates={dates}
        entries={entries}
        opening={opening}
        today={today}
      />
    </>
  );
}
