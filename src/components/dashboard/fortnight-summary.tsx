import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";
import type { TimesheetEntry } from "@/lib/types/database";
import { formatWorkedMinutes, formatFlexMinutes, getDayName, addDays, entryTypeLabel, isWeekend, formatDateAU } from "@/lib/utils/format";
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
  const totalFlex = entries.reduce((sum, e) => sum + e.flex_minutes, 0);
  const today = new Date().toISOString().split("T")[0];

  const weekdayDates = allDates.filter((d) => !isWeekend(d));

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
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {weekdayDates.map((date) => {
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
                      entry.flex_minutes > 0 && "text-green-600 dark:text-green-400",
                      entry.flex_minutes < 0 && "text-red-600 dark:text-red-400",
                      entry.flex_minutes === 0 && "text-muted-foreground"
                    )}
                  >
                    {formatFlexMinutes(entry.flex_minutes)}
                  </span>
                ) : isMissing ? (
                  <span className="text-amber-700 dark:text-amber-400">—</span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
          <span className="font-medium">{formatWorkedMinutes(totalWorked)}</span>
          <span
            className={cn(
              "font-bold",
              totalFlex > 0 && "text-green-600 dark:text-green-400",
              totalFlex < 0 && "text-red-600 dark:text-red-400",
              totalFlex === 0 && "text-muted-foreground"
            )}
          >
            {formatFlexMinutes(totalFlex)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
