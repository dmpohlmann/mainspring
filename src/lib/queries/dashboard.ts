import { createClient } from "@/lib/supabase/server";
import { toDateString, getWeekStart } from "@/lib/utils/format";
import { getPayFortnight, DEFAULT_ANCHOR_DATE, parseAnchorDate, toUTCDateString } from "@/lib/utils/pay-fortnight";

export async function getToilBalance() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("toil_minutes");

  if (error) throw error;
  return (data || []).reduce((sum, e) => sum + e.toil_minutes, 0);
}

export async function getLeaveBalances() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_balances")
    .select("*")
    .order("leave_type");

  if (error) throw error;
  return data || [];
}

export async function getTodayEntry() {
  const supabase = await createClient();
  const today = toDateString(new Date());
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("*")
    .eq("date", today)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getWeekEntries(referenceDate?: Date) {
  const supabase = await createClient();
  const ref = referenceDate || new Date();
  const weekStart = getWeekStart(ref);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("*")
    .gte("date", toDateString(weekStart))
    .lte("date", toDateString(weekEnd))
    .order("date");

  if (error) throw error;
  return { entries: data || [], weekStart: toDateString(weekStart), weekEnd: toDateString(weekEnd) };
}

export async function getFortnightEntries(referenceDate?: Date) {
  const settings = await getSettings();
  const anchor = settings?.pay_fortnight_anchor_date
    ? parseAnchorDate(settings.pay_fortnight_anchor_date)
    : DEFAULT_ANCHOR_DATE;

  const ref = referenceDate || new Date();
  const { start, end } = getPayFortnight(ref, anchor);
  const startStr = toUTCDateString(start);
  const endStr = toUTCDateString(end);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("*")
    .gte("date", startStr)
    .lte("date", endStr)
    .order("date");

  if (error) throw error;
  return {
    entries: data || [],
    fortnightStart: startStr,
    fortnightEnd: endStr,
    payFortnightStartDate: start,
    payFortnightEndDate: end,
  };
}

export async function getSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}
