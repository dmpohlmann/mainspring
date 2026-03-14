import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Plus } from "lucide-react";
import Link from "next/link";
import type { TimesheetEntry } from "@/lib/types/database";
import { formatTime, formatWorkedMinutes, formatFlexMinutes, entryTypeLabel } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface TodayStatusProps {
  entry: TimesheetEntry | null;
}

export function TodayStatus({ entry }: TodayStatusProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Today</CardTitle>
        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {entry ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{entryTypeLabel(entry.entry_type)}</span>
              <span
                className={cn(
                  "text-sm font-bold",
                  entry.flex_minutes > 0 && "text-green-600 dark:text-green-400",
                  entry.flex_minutes < 0 && "text-red-600 dark:text-red-400",
                  entry.flex_minutes === 0 && "text-muted-foreground"
                )}
              >
                {formatFlexMinutes(entry.flex_minutes)}
              </span>
            </div>
            {entry.entry_type === "work" && (
              <p className="text-sm text-muted-foreground">
                {formatTime(entry.start_time)} – {formatTime(entry.end_time)} · {formatWorkedMinutes(entry.worked_minutes)} worked
              </p>
            )}
            <Button variant="outline" size="sm" className="mt-2" render={<Link href={`/timesheet?date=${entry.date}`} />}>
              Edit entry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">No entry logged yet</p>
            <Button size="sm" render={<Link href="/timesheet" />}>
              <Plus className="mr-2 h-4 w-4" />
              Log today&apos;s hours
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
