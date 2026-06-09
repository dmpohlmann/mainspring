"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  flexMinutes,
  workedMinutes,
  primaryType,
  leaveTakenByType,
} from "@/lib/utils/entry-calc";
import type { LeaveStatus, LeaveType, SegmentType } from "@/lib/types/database";

export interface SegmentInput {
  type: SegmentType;
  start_time: string;
  end_time: string;
}
export interface EntryInput {
  date: string;
  segments: SegmentInput[];
  note?: string | null;
  status?: LeaveStatus | null;
}

type DB = Awaited<ReturnType<typeof createClient>>;

const LEAVE_TYPES: LeaveType[] = ["annual", "personal"];
const segKeyFor: Record<LeaveType, string> = {
  annual: "annual_leave",
  personal: "personal_leave",
};

function revalidateAll() {
  for (const p of ["/dashboard", "/timesheet", "/calendar", "/leave"])
    revalidatePath(p);
}

async function requireUser(supabase: DB): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

export async function upsertEntry(input: EntryInput) {
  const supabase = await createClient();
  const userId = await requireUser(supabase);

  const { data: settings } = await supabase
    .from("settings")
    .select("standard_day_minutes")
    .maybeSingle();
  const std = settings?.standard_day_minutes ?? 450;

  const worked = workedMinutes(input.segments);
  const flex = flexMinutes(input.segments, std);
  const entry_type = primaryType(input.segments);

  const { data: entry, error: upErr } = await supabase
    .from("timesheet_entries")
    .upsert(
      {
        user_id: userId,
        date: input.date,
        entry_type,
        note: input.note ?? null,
        status: input.status ?? null,
        worked_minutes: worked,
        flex_minutes: flex,
      },
      { onConflict: "user_id,date" }
    )
    .select("id")
    .single();
  if (upErr) throw upErr;
  const entryId = entry.id as string;

  // Replace segments wholesale.
  await supabase.from("timesheet_segments").delete().eq("entry_id", entryId);
  if (input.segments.length) {
    const rows = input.segments.map((s, i) => ({
      entry_id: entryId,
      user_id: userId,
      seq: i,
      type: s.type,
      start_time: s.start_time,
      end_time: s.end_time,
    }));
    const { error: segErr } = await supabase
      .from("timesheet_segments")
      .insert(rows);
    if (segErr) throw segErr;
  }

  await reconcileLeave(
    supabase,
    userId,
    entryId,
    input.date,
    leaveTakenByType(input.segments)
  );

  revalidateAll();
  return { ok: true };
}

export async function deleteEntry(date: string) {
  const supabase = await createClient();
  const userId = await requireUser(supabase);

  const { data: entry } = await supabase
    .from("timesheet_entries")
    .select("id")
    .eq("date", date)
    .maybeSingle();

  if (entry) {
    // Reverse any leave this day debited, then delete (segments cascade).
    await reconcileLeave(supabase, userId, entry.id as string, date, {});
    await supabase.from("timesheet_entries").delete().eq("id", entry.id);
  }
  revalidateAll();
  return { ok: true };
}

// Reconcile a day's leave-balance debits: reverse the entry's prior linked
// transactions and apply the new leave taken (minutes per segment type).
async function reconcileLeave(
  supabase: DB,
  userId: string,
  entryId: string,
  date: string,
  leaveTakenMins: Record<string, number>
) {
  const { data: oldTx } = await supabase
    .from("leave_transactions")
    .select("leave_type, hours")
    .eq("linked_entry_id", entryId);

  for (const lt of LEAVE_TYPES) {
    const oldHours = (oldTx ?? [])
      .filter((t: { leave_type: LeaveType }) => t.leave_type === lt)
      .reduce((a: number, t: { hours: number }) => a + Number(t.hours), 0);
    const newHours = -((leaveTakenMins[segKeyFor[lt]] ?? 0) / 60); // debit (≤ 0)
    const delta = newHours - oldHours;
    if (delta === 0) continue;

    const { data: bal } = await supabase
      .from("leave_balances")
      .select("id, balance_hours")
      .eq("leave_type", lt)
      .maybeSingle();
    if (bal) {
      await supabase
        .from("leave_balances")
        .update({ balance_hours: Number(bal.balance_hours) + delta })
        .eq("id", bal.id);
    }
  }

  await supabase
    .from("leave_transactions")
    .delete()
    .eq("linked_entry_id", entryId);

  const newTx = LEAVE_TYPES.flatMap((lt) => {
    const mins = leaveTakenMins[segKeyFor[lt]] ?? 0;
    if (!mins) return [];
    return [
      {
        user_id: userId,
        leave_type: lt,
        date,
        hours: -(mins / 60),
        description: `${lt === "annual" ? "Annual" : "Personal"} leave taken`,
        linked_entry_id: entryId,
      },
    ];
  });
  if (newTx.length)
    await supabase.from("leave_transactions").insert(newTx);
}
