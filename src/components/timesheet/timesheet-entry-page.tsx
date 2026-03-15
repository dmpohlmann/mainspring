"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { EntryForm } from "./entry-form";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimesheetEntry } from "@/lib/types/database";

interface TimesheetEntryPageProps {
  initialDate?: string;
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function TimesheetEntryPage({ initialDate }: TimesheetEntryPageProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate || toDateString(new Date()));
  const [entry, setEntry] = useState<TimesheetEntry | null>(null);
  const [toilBalance, setToilBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchEntry = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [entryResult, flexResult] = await Promise.all([
      supabase.from("timesheet_entries").select("*").eq("date", selectedDate).maybeSingle(),
      supabase.from("timesheet_entries").select("toil_minutes"),
    ]);

    setEntry(entryResult.data);
    const total = (flexResult.data || []).reduce((sum: number, e: { toil_minutes: number }) => sum + e.toil_minutes, 0);
    setToilBalance(total);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const navigateDay = (offset: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(toDateString(d));
  };

  const dateObj = new Date(selectedDate + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigateDay(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger render={<Button variant="outline" className="min-w-[240px] justify-start text-left font-normal" />}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formattedDate}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateObj}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(toDateString(date));
                  setCalendarOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" onClick={() => navigateDay(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedDate(toDateString(new Date()))}
        >
          Today
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <EntryForm
          date={selectedDate}
          entry={entry}
          toilBalance={toilBalance}
          onSaved={fetchEntry}
        />
      )}
    </div>
  );
}
