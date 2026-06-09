import { createClient } from "@/lib/supabase/server";
import type { DayEntry, PublicHoliday } from "@/lib/types/database";

const ENTRY_WITH_SEGMENTS = "*, segments:timesheet_segments(*)";

function withSortedSegments(e: DayEntry): DayEntry {
  return {
    ...e,
    segments: [...(e.segments ?? [])].sort((a, b) => a.seq - b.seq),
  };
}

export async function getDayEntry(date: string): Promise<DayEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select(ENTRY_WITH_SEGMENTS)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? withSortedSegments(data as unknown as DayEntry) : null;
}

export async function getEntriesInRange(
  start: string,
  end: string
): Promise<DayEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select(ENTRY_WITH_SEGMENTS)
    .gte("date", start)
    .lte("date", end)
    .order("date");
  if (error) throw error;
  return (data ?? []).map((e) => withSortedSegments(e as unknown as DayEntry));
}

// Running FLEX balance = sum of every entry's cached flex_minutes.
export async function getFlexBalance(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("flex_minutes");
  if (error) throw error;
  return (data ?? []).reduce((a, e) => a + (e.flex_minutes ?? 0), 0);
}

export async function getPublicHolidays(
  state: string,
  start: string,
  end: string
): Promise<PublicHoliday[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_holidays")
    .select("*")
    .in("region", ["national", state])
    .gte("date", start)
    .lte("date", end)
    .order("date");
  if (error) throw error;
  return data ?? [];
}
