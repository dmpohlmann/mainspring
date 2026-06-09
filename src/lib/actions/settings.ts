"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SettingsInput {
  standard_day_minutes?: number;
  default_lunch_duration_minutes?: number;
  annual_leave_days_per_year?: number;
  personal_leave_days_per_year?: number;
  financial_year_start_month?: number;
  pay_fortnight_anchor_date?: string;
  pay_fortnight_start_day?: number;
  state?: string;
}

type DB = Awaited<ReturnType<typeof createClient>>;

async function requireUser(supabase: DB): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

export async function upsertSettings(input: SettingsInput) {
  const supabase = await createClient();
  const userId = await requireUser(supabase);
  await supabase
    .from("settings")
    .upsert({ user_id: userId, ...input }, { onConflict: "user_id" });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Seed opening leave balances (for first-time setup mid-year).
export async function initializeBalances(input: {
  annual: number;
  personal: number;
}) {
  const supabase = await createClient();
  const userId = await requireUser(supabase);
  const today = new Date().toISOString().slice(0, 10);

  await supabase.from("leave_balances").upsert(
    [
      {
        user_id: userId,
        leave_type: "annual",
        balance_hours: input.annual,
        accrual_rate_hours_per_fortnight: 5.77,
        last_accrual_date: today,
      },
      {
        user_id: userId,
        leave_type: "personal",
        balance_hours: input.personal,
        accrual_rate_hours_per_fortnight: 2.88,
        last_accrual_date: today,
      },
    ],
    { onConflict: "user_id,leave_type" }
  );

  await supabase.from("leave_transactions").insert([
    {
      user_id: userId,
      leave_type: "annual",
      date: today,
      hours: input.annual,
      description: "Opening balance",
    },
    {
      user_id: userId,
      leave_type: "personal",
      date: today,
      hours: input.personal,
      description: "Opening balance",
    },
  ]);

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { ok: true };
}
