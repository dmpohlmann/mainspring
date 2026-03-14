import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import type { TimesheetEntry } from "@/lib/types/database";
import { formatWorkedMinutes, formatFlexMinutes, getDayName, addDays, entryTypeLabel } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface WeekSummaryProps {
  entries: TimesheetEntry[];
  weekStart: string;
}

export function WeekSummary({ entries, weekStart }: WeekSummaryProps) {
  const weekdays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const entryMap = new Map(entries.map((e) => [e.date, e]));
  const totalWorked = entries.reduce((sum, e) => sum + e.worked_minutes, 0);
  const totalFlex = entries.reduce((sum, e) => sum + e.flex_minutes, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">This Week</CardTitle>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {weekdays.map((date) => {
            const entry = entryMap.get(date);
            const today = new Date().toISOString().split("T")[0];
            const isFuture = date > today;
            const isMissing = !entry && !isFuture;

            return (
              <div
                key={date}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1 text-sm",
                  isMissing && "bg-amber-50 dark:bg-amber-950/30"
                )}
              >
                <span className={cn("w-10", isMissing && "text-amber-700 dark:text-amber-400")}>
                  {getDayName(date)}
                </span>
                <span className="flex-1 text-muted-foreground text-xs">
                  {entry ? entryTypeLabel(entry.entry_type) : isFuture ? "" : "Missing"}
                </span>
                {entry && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      entry.flex_minutes > 0 && "text-green-600 dark:text-green-400",
                      entry.flex_minutes < 0 && "text-red-600 dark:text-red-400",
                      entry.flex_minutes === 0 && "text-muted-foreground"
                    )}
                  >
                    {formatFlexMinutes(entry.flex_minutes)}
                  </span>
                )}
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
