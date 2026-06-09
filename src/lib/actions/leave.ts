"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/utils/format";
import type { LeaveType } from "@/lib/types/database";

type DB = Awaited<ReturnType<typeof createClient>>;

const DEFAULT_RATE: Record<LeaveType, number> = { annual: 5.77, personal: 2.88 };

async function requireUser(supabase: DB): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// Manual credit (+) / debit (−) with a reason. Updates balance + logs a tx.
export async function adjustLeaveBalance(
  leaveType: LeaveType,
  hours: number,
  description: string
) {
  const supabase = await createClient();
  const userId = await requireUser(supabase);

  const { data: bal } = await supabase
    .from("leave_balances")
    .select("id, balance_hours")
    .eq("leave_type", leaveType)
    .maybeSingle();

  if (bal) {
    await supabase
      .from("leave_balances")
      .update({ balance_hours: Number(bal.balance_hours) + hours })
      .eq("id", bal.id);
  } else {
    await supabase.from("leave_balances").insert({
      user_id: userId,
      leave_type: leaveType,
      balance_hours: hours,
      accrual_rate_hours_per_fortnight: DEFAULT_RATE[leaveType],
    });
  }

  await supabase.from("leave_transactions").insert({
    user_id: userId,
    leave_type: leaveType,
    date: todayUTC(),
    hours,
    description,
  });

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Process fortnightly accruals for annual + personal up to today.
export async function processAccruals() {
  const supabase = await createClient();
  const userId = await requireUser(supabase);
  const today = todayUTC();

  const { data: balances } = await supabase
    .from("leave_balances")
    .select("*")
    .in("leave_type", ["annual", "personal"]);

  for (const b of balances ?? []) {
    const rate = Number(b.accrual_rate_hours_per_fortnight) || 0;
    if (!b.last_accrual_date) {
      await supabase
        .from("leave_balances")
        .update({ last_accrual_date: today })
        .eq("id", b.id);
      continue;
    }
    const days = Math.floor(
      (Date.parse(today + "T00:00:00Z") -
        Date.parse(b.last_accrual_date + "T00:00:00Z")) /
        86400000
    );
    const fortnights = Math.floor(days / 14);
    if (fortnights <= 0 || rate <= 0) continue;

    const accrued = rate * fortnights;
    const newLast = addDays(b.last_accrual_date, fortnights * 14);
    await supabase
      .from("leave_balances")
      .update({
        balance_hours: Number(b.balance_hours) + accrued,
        last_accrual_date: newLast,
      })
      .eq("id", b.id);
    await supabase.from("leave_transactions").insert({
      user_id: userId,
      leave_type: b.leave_type,
      date: newLast,
      hours: accrued,
      description: `Fortnightly accrual (${fortnights} × ${rate}h)`,
    });
  }

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { ok: true };
}
