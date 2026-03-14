"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimesheetEntry } from "@/lib/types/database";
import {
  getDayName,
  formatDateAU,
  formatTime,
  formatWorkedMinutes,
  formatFlexMinutes,
  entryTypeLabel,
  isWeekend,
  addDays,
} from "@/lib/utils/format";

interface WeeklyViewProps {
  entries: TimesheetEntry[];
  startDate: string;
  view: "week" | "fortnight";
  payPeriodLabel?: string;
}

export function WeeklyView({ entries, startDate, view, payPeriodLabel }: WeeklyViewProps) {
  const router = useRouter();
  const days = view === "fortnight" ? 14 : 7;
  const allDates = Array.from({ length: days }, (_, i) => addDays(startDate, i));
  const entryMap = new Map(entries.map((e) => [e.date, e]));

  const totalWorked = entries.reduce((sum, e) => sum + e.worked_minutes, 0);
  const totalFlex = entries.reduce((sum, e) => sum + e.flex_minutes, 0);

  const navigate = (offset: number) => {
    const newStart = addDays(startDate, offset);
    router.push(`/timesheet/weekly?start=${newStart}&view=${view}`);
  };

  const toggleView = () => {
    const newView = view === "week" ? "fortnight" : "week";
    router.push(`/timesheet/weekly?start=${startDate}&view=${newView}`);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-days)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            {payPeriodLabel ? (
              <span className="text-sm font-semibold text-brand-navy dark:text-brand-navy">
                {payPeriodLabel}
              </span>
            ) : (
              <span className="text-sm font-medium">
                {formatDateAU(startDate)} – {formatDateAU(addDays(startDate, days - 1))}
              </span>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={() => navigate(days)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={toggleView}>
          {view === "week" ? "Fortnight" : "Week"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Day</TableHead>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Start</TableHead>
                  <TableHead className="hidden sm:table-cell">End</TableHead>
                  <TableHead>Worked</TableHead>
                  <TableHead>Flex</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDates.map((date) => {
                  const entry = entryMap.get(date);
                  const weekend = isWeekend(date);
                  const isMissing = !entry && !weekend && date <= today;
                  const isToday = date === today;

                  if (weekend && !entry) {
                    return (
                      <TableRow key={date} className="text-muted-foreground bg-muted/30">
                        <TableCell>{getDayName(date)}</TableCell>
                        <TableCell>{formatDateAU(date)}</TableCell>
                        <TableCell colSpan={5} className="text-xs">Weekend</TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow
                      key={date}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        isMissing && "bg-amber-50 dark:bg-amber-950/20",
                        isToday && "font-medium"
                      )}
                      onClick={() => router.push(`/timesheet?date=${date}`)}
                    >
                      <TableCell>{getDayName(date)}</TableCell>
                      <TableCell>{formatDateAU(date)}</TableCell>
                      <TableCell>
                        {entry ? entryTypeLabel(entry.entry_type) : isMissing ? (
                          <span className="text-amber-700 dark:text-amber-400 text-xs">Missing</span>
                        ) : ""}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{entry ? formatTime(entry.start_time) : ""}</TableCell>
                      <TableCell className="hidden sm:table-cell">{entry ? formatTime(entry.end_time) : ""}</TableCell>
                      <TableCell>{entry ? formatWorkedMinutes(entry.worked_minutes) : ""}</TableCell>
                      <TableCell>
                        {entry && (
                          <span className={cn(
                            entry.flex_minutes > 0 && "text-green-600 dark:text-green-400",
                            entry.flex_minutes < 0 && "text-red-600 dark:text-red-400",
                            entry.flex_minutes === 0 && "text-muted-foreground"
                          )}>
                            {formatFlexMinutes(entry.flex_minutes)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold">
                    {payPeriodLabel ? "Pay Period Totals" : "Totals"}
                  </TableCell>
                  <TableCell className="font-bold">{formatWorkedMinutes(totalWorked)}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "font-bold",
                      totalFlex > 0 && "text-green-600 dark:text-green-400",
                      totalFlex < 0 && "text-red-600 dark:text-red-400",
                    )}>
                      {formatFlexMinutes(totalFlex)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
