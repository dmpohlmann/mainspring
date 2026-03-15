"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { upsertTimesheetEntry, deleteTimesheetEntry } from "@/app/(authenticated)/timesheet/actions";
import { ToilDisplay } from "./toil-display";
import { calculateWorkedMinutes, calculateToilMinutes, calculateLunchDuration } from "@/lib/utils/time-calculations";
import { formatWorkedMinutes } from "@/lib/utils/format";
import type { TimesheetEntry, EntryType } from "@/lib/types/database";

interface EntryFormProps {
  date: string;
  entry: TimesheetEntry | null;
  toilBalance: number;
  onSaved: () => void;
}

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: "work", label: "Work Day" },
  { value: "annual_leave", label: "Annual Leave" },
  { value: "personal_leave", label: "Personal Leave" },
  { value: "public_holiday", label: "Public Holiday" },
  { value: "toil_day", label: "TOIL Day" },
  { value: "other", label: "Other" },
];

export function EntryForm({ date, entry, toilBalance, onSaved }: EntryFormProps) {
  const [entryType, setEntryType] = useState<EntryType>(entry?.entry_type || "work");
  const [startTime, setStartTime] = useState(entry?.start_time?.slice(0, 5) || "08:00");
  const [lunchStart, setLunchStart] = useState(entry?.lunch_start?.slice(0, 5) || "12:00");
  const [lunchEnd, setLunchEnd] = useState(entry?.lunch_end?.slice(0, 5) || "12:30");
  const [endTime, setEndTime] = useState(entry?.end_time?.slice(0, 5) || "");
  const [note, setNote] = useState(entry?.note || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEntryType(entry?.entry_type || "work");
    setStartTime(entry?.start_time?.slice(0, 5) || "08:00");
    setLunchStart(entry?.lunch_start?.slice(0, 5) || "12:00");
    setLunchEnd(entry?.lunch_end?.slice(0, 5) || "12:30");
    setEndTime(entry?.end_time?.slice(0, 5) || "");
    setNote(entry?.note || "");
  }, [entry, date]);

  const isWorkDay = entryType === "work";
  const showTimeFields = isWorkDay || entryType === "other";

  // Live calculation
  let workedMinutes = 0;
  let toilMinutes = 0;
  let lunchDuration = 0;
  let canCalculate = false;

  if (showTimeFields && startTime && endTime && lunchStart && lunchEnd) {
    try {
      workedMinutes = calculateWorkedMinutes(startTime, endTime, lunchStart, lunchEnd);
      toilMinutes = calculateToilMinutes(workedMinutes);
      lunchDuration = calculateLunchDuration(lunchStart, lunchEnd);
      canCalculate = workedMinutes > 0;
    } catch {
      canCalculate = false;
    }
  }

  if (entryType === "toil_day") {
    toilMinutes = -450;
  }

  const projectedBalance = toilBalance - (entry?.toil_minutes || 0) + toilMinutes;

  const handleSubmit = async () => {
    // Validation for work days
    if (isWorkDay && !endTime) {
      toast.error("End time is required for work days");
      return;
    }

    setSaving(true);
    try {
      await upsertTimesheetEntry({
        date,
        entry_type: entryType,
        start_time: showTimeFields ? startTime : null,
        end_time: showTimeFields ? endTime : null,
        lunch_start: showTimeFields ? lunchStart : null,
        lunch_end: showTimeFields ? lunchEnd : null,
        note: note || null,
      });
      toast.success(entry ? "Entry updated" : "Entry saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteTimesheetEntry(date);
      toast.success("Entry deleted");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="entry-type">Entry Type</Label>
          <Select value={entryType} onValueChange={(v) => v && setEntryType(v as EntryType)}>
            <SelectTrigger id="entry-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTRY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showTimeFields && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lunch-start">Lunch Start</Label>
              <Input
                id="lunch-start"
                type="time"
                value={lunchStart}
                onChange={(e) => setLunchStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lunch-end">Lunch End</Label>
              <Input
                id="lunch-end"
                type="time"
                value={lunchEnd}
                onChange={(e) => setLunchEnd(e.target.value)}
              />
            </div>
          </div>
        )}

        {(showTimeFields && canCalculate) && (
          <div className="rounded-md border p-3 space-y-1" aria-live="polite">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Worked</span>
              <span className="font-medium">{formatWorkedMinutes(workedMinutes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lunch</span>
              <span className="font-medium">{formatWorkedMinutes(lunchDuration)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Day TOIL</span>
              <ToilDisplay minutes={toilMinutes} className="font-medium" />
            </div>
            <div className="flex justify-between text-sm border-t pt-1 mt-1">
              <span className="text-muted-foreground">Projected Balance</span>
              <ToilDisplay minutes={projectedBalance} className="font-bold" />
            </div>
          </div>
        )}

        {entryType === "toil_day" && (
          <div className="rounded-md border p-3 space-y-1" aria-live="polite">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Day TOIL</span>
              <ToilDisplay minutes={-450} className="font-medium" />
            </div>
            <div className="flex justify-between text-sm border-t pt-1 mt-1">
              <span className="text-muted-foreground">Projected Balance</span>
              <ToilDisplay minutes={projectedBalance} className="font-bold" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="note">Notes</Label>
          <Textarea
            id="note"
            placeholder="Optional notes..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? "Saving..." : entry ? "Update" : "Save"}
          </Button>
          {entry && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" disabled={saving} />}>
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the timesheet entry for this date.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
