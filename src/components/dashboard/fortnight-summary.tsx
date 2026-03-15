import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";
import type { TimesheetEntry } from "@/lib/types/database";
import { formatWorkedMinutes, formatToilMinutes, getDayName, addDays, entryTypeLabel, isWeekend, formatDateAU } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface FortnightSummaryProps {
  entries: TimesheetEntry[];
  start: string;
  end: string;
}

export function FortnightSummary({ entries, start, end }: FortnightSummaryProps) {
  const allDates = [];
  let current = start;
  while (current <= end) {
    allDates.push(current);
    current = addDays(current, 1);
  }

  const entryMap = new Map(entries.map((e) => [e.date, e]));
  const totalWorked = entries.reduce((sum, e) => sum + e.worked_minutes, 0);
  const totalToil = entries.reduce((sum, e) => sum + e.toil_minutes, 0);
  const today = new Date().toISOString().split("T")[0];

  const weekdayDates = allDates.filter((d) => !isWeekend(d));
  const week1 = weekdayDates.slice(0, 5);
  const week2 = weekdayDates.slice(5);

  function renderDay(date: string) {
    const entry = entryMap.get(date);
    const isFuture = date > today;
    const isMissing = !entry && !isFuture;

    return (
      <div
        key={date}
        className={cn(
          "flex items-center justify-between rounded px-1.5 py-0.5 text-xs",
          isMissing && "bg-amber-50 dark:bg-amber-950/30"
        )}
      >
        <span className={cn("w-16", isMissing && "text-amber-700 dark:text-amber-400")}>
          {getDayName(date)} {date.slice(8)}
        </span>
        {entry ? (
          <span
            className={cn(
              "font-medium",
              entry.toil_minutes > 0 && "text-green-600 dark:text-green-400",
              entry.toil_minutes < 0 && "text-red-600 dark:text-red-400",
              entry.toil_minutes === 0 && "text-muted-foreground"
            )}
          >
            {formatToilMinutes(entry.toil_minutes)}
          </span>
        ) : isMissing ? (
          <span className="text-amber-700 dark:text-amber-400">—</span>
        ) : null}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          This Pay Period
        </CardTitle>
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {formatDateAU(start)} – {formatDateAU(end)}
        </p>
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Week 1</h4>
            <div className="space-y-0.5">{week1.map(renderDay)}</div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Week 2</h4>
            <div className="space-y-0.5">{week2.map(renderDay)}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
          <span className="font-medium">{formatWorkedMinutes(totalWorked)}</span>
          <span
            className={cn(
              "font-bold",
              totalToil > 0 && "text-green-600 dark:text-green-400",
              totalToil < 0 && "text-red-600 dark:text-red-400",
              totalToil === 0 && "text-muted-foreground"
            )}
          >
            {formatToilMinutes(totalToil)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
