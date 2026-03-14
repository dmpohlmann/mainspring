"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function adjustLeaveBalance(
  leaveType: string,
  hours: number,
  description: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("leave_type", leaveType)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("leave_balances")
      .update({ balance_hours: Number(existing.balance_hours) + hours })
      .eq("id", existing.id);
  } else {
    await supabase.from("leave_balances").insert({
      user_id: user.id,
      leave_type: leaveType,
      balance_hours: hours,
      accrual_rate_hours_per_fortnight: 0,
    });
  }

  await supabase.from("leave_transactions").insert({
    user_id: user.id,
    leave_type: leaveType,
    date: new Date().toISOString().split("T")[0],
    hours,
    description,
  });

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function cashoutFlexToToil(hours: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = new Date().toISOString().split("T")[0];

  // Credit TOIL balance
  const { data: toilBalance } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("leave_type", "toil")
    .eq("user_id", user.id)
    .maybeSingle();

  if (toilBalance) {
    await supabase
      .from("leave_balances")
      .update({ balance_hours: Number(toilBalance.balance_hours) + hours })
      .eq("id", toilBalance.id);
  } else {
    await supabase.from("leave_balances").insert({
      user_id: user.id,
      leave_type: "toil",
      balance_hours: hours,
      accrual_rate_hours_per_fortnight: 0,
    });
  }

  // Create TOIL credit transaction
  await supabase.from("leave_transactions").insert({
    user_id: user.id,
    leave_type: "toil",
    date: today,
    hours: hours,
    description: `Flex cashout — ${hours}h to TOIL`,
  });

  // Debit flex via RPC, fallback to leave transaction
  const { error } = await supabase.rpc("insert_flex_cashout", {
    p_user_id: user.id,
    p_date: today,
    p_flex_minutes: -Math.round(hours * 60),
    p_note: `Flex cashout: ${hours}h converted to TOIL`,
  });

  if (error) {
    await supabase.from("leave_transactions").insert({
      user_id: user.id,
      leave_type: "toil",
      date: today,
      hours: -hours,
      description: `Flex debit — ${hours}h cashout to TOIL (flex adjustment)`,
    });
  }

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function processAccruals() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const leaveTypes = ["annual", "personal"];

  for (const leaveType of leaveTypes) {
    const { data: balance } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("leave_type", leaveType)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!balance) continue;

    const lastAccrual = balance.last_accrual_date
      ? new Date(balance.last_accrual_date)
      : new Date(today.getFullYear(), 6, 1);

    const daysSince = Math.floor(
      (today.getTime() - lastAccrual.getTime()) / (1000 * 60 * 60 * 24)
    );
    const fortnightsSince = Math.floor(daysSince / 14);

    if (fortnightsSince <= 0) continue;

    const accrualAmount =
      Number(balance.accrual_rate_hours_per_fortnight) * fortnightsSince;

    await supabase
      .from("leave_balances")
      .update({
        balance_hours: Number(balance.balance_hours) + accrualAmount,
        last_accrual_date: todayStr,
      })
      .eq("id", balance.id);

    await supabase.from("leave_transactions").insert({
      user_id: user.id,
      leave_type: leaveType,
      date: todayStr,
      hours: accrualAmount,
      description: `Fortnightly accrual (${fortnightsSince} fortnights × ${Number(balance.accrual_rate_hours_per_fortnight).toFixed(2)}h)`,
    });
  }

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { success: true };
}
