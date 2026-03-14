"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface TimesheetFormData {
  date: string;
  entry_type: string;
  start_time?: string | null;
  end_time?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  note?: string | null;
}

export async function upsertTimesheetEntry(data: TimesheetFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("timesheet_entries")
    .select("id")
    .eq("date", data.date)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("timesheet_entries")
      .update({
        entry_type: data.entry_type,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        lunch_start: data.lunch_start || null,
        lunch_end: data.lunch_end || null,
        note: data.note || null,
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("timesheet_entries").insert({
      user_id: user.id,
      date: data.date,
      entry_type: data.entry_type,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      lunch_start: data.lunch_start || null,
      lunch_end: data.lunch_end || null,
      note: data.note || null,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/timesheet");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteTimesheetEntry(date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("timesheet_entries")
    .delete()
    .eq("date", date)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/timesheet");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { success: true };
}
