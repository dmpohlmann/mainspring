import { createClient } from "@/lib/supabase/server";

export async function getEntriesByDateRange(startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  if (error) throw error;
  return data || [];
}

export async function getEntryByDate(date: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPreviousEntry(date: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("start_time")
    .lt("date", date)
    .eq("entry_type", "work")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getMonthEntries(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  return getEntriesByDateRange(startDate, endDateStr);
}
