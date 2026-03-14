"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface SettingsData {
  standard_day_minutes: number;
  default_lunch_duration_minutes: number;
  annual_leave_days_per_year: number;
  personal_leave_days_per_year: number;
  financial_year_start_month: number;
  pay_fortnight_anchor_date: string;
}

export async function upsertSettings(data: SettingsData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("settings")
      .update(data)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("settings").insert({
      user_id: user.id,
      ...data,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function initializeBalances(balances: {
  annual_hours: number;
  personal_hours: number;
  toil_hours: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const leaveTypes = [
    { type: "annual", hours: balances.annual_hours, accrual: 5.77 },
    { type: "personal", hours: balances.personal_hours, accrual: 2.88 },
    { type: "toil", hours: balances.toil_hours, accrual: 0 },
  ];

  for (const lt of leaveTypes) {
    const { data: existing } = await supabase
      .from("leave_balances")
      .select("id")
      .eq("leave_type", lt.type)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("leave_balances")
        .update({
          balance_hours: lt.hours,
          accrual_rate_hours_per_fortnight: lt.accrual,
          last_accrual_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("leave_balances").insert({
        user_id: user.id,
        leave_type: lt.type,
        balance_hours: lt.hours,
        accrual_rate_hours_per_fortnight: lt.accrual,
        last_accrual_date: new Date().toISOString().split("T")[0],
      });
    }

    await supabase.from("leave_transactions").insert({
      user_id: user.id,
      leave_type: lt.type,
      date: new Date().toISOString().split("T")[0],
      hours: lt.hours,
      description: "Initial balance setup",
    });
  }

  revalidatePath("/settings");
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { success: true };
}
