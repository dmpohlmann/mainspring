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

// Running FLEX balance = Σ every entry's cached flex_minutes + Σ manual flex
// adjustments (leave_transactions of type 'flex', incl. the opening balance).
export async function getFlexBalance(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("flex_minutes");
  if (error) throw error;
  const fromEntries = (data ?? []).reduce((a, e) => a + (e.flex_minutes ?? 0), 0);

  const { data: adj, error: adjErr } = await supabase
    .from("leave_transactions")
    .select("hours")
    .eq("leave_type", "flex");
  if (adjErr) throw adjErr;
  const fromAdjustments = (adj ?? []).reduce(
    (a, t) => a + Math.round(Number(t.hours) * 60),
    0
  );

  return fromEntries + fromAdjustments;
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
