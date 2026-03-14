"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimesheetEntry, LeaveBalance } from "@/lib/types/database";

interface CalendarViewProps {
  entries: TimesheetEntry[];
  leaveBalances: LeaveBalance[];
  year: number;
  month: number;
}

const entryTypeColors: Record<string, string> = {
  work: "bg-primary/10 hover:bg-primary/20 text-foreground",
  annual_leave: "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300",
  personal_leave: "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-300",
  public_holiday: "bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-800 dark:text-green-300",
  flex_day: "bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-300",
  other: "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/30 dark:hover:bg-gray-800/50 text-gray-800 dark:text-gray-300",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarView({ entries, leaveBalances, year, month }: CalendarViewProps) {
  const router = useRouter();
  const entryMap = new Map(entries.map((e) => [e.date, e]));

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDay.getDate();

  const today = new Date().toISOString().split("T")[0];

  const navigate = (offset: number) => {
    let newMonth = month + offset;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    router.push(`/calendar?year=${newYear}&month=${newMonth}`);
  };

  const cells = [];
  for (let i = 0; i < startPad; i++) {
    cells.push(<div key={`pad-${i}`} className="min-h-[60px] sm:min-h-[80px]" />);
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const entry = entryMap.get(dateStr);
    const isToday = dateStr === today;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    cells.push(
      <button
        key={dateStr}
        onClick={() => router.push(`/timesheet?date=${dateStr}`)}
        className={cn(
          "min-h-[60px] sm:min-h-[80px] rounded-md border p-1 text-left transition-colors text-sm",
          isWeekend && !entry && "bg-muted/30",
          entry && entryTypeColors[entry.entry_type],
          !entry && !isWeekend && "hover:bg-muted/50",
          isToday && "ring-2 ring-primary"
        )}
      >
        <span className={cn("text-xs font-medium", isToday && "text-primary")}>
          {d}
        </span>
        {entry && (
          <span className="block text-[10px] sm:text-xs truncate mt-0.5">
            {entry.entry_type === "work" ? `${Math.floor(entry.worked_minutes / 60)}h` : entry.entry_type.replace("_", " ")}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <Button variant="outline" size="icon" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
            {cells}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-primary/20" /> Work</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-blue-200 dark:bg-blue-900/50" /> Annual</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-orange-200 dark:bg-orange-900/50" /> Personal</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900/50" /> Holiday</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-purple-200 dark:bg-purple-900/50" /> Flex</span>
      </div>

      {leaveBalances.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leave Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {leaveBalances.map((b) => (
              <div key={b.leave_type} className="flex justify-between text-sm">
                <span className="capitalize">{b.leave_type}</span>
                <span className="font-medium">{(Number(b.balance_hours) / 7.5).toFixed(1)} days</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
