import { createClient } from "@/lib/supabase/server";
import type {
  LeaveBalance,
  LeaveTransaction,
  LeaveType,
} from "@/lib/types/database";

export async function getLeaveBalances(): Promise<LeaveBalance[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_balances")
    .select("*")
    .order("leave_type");
  if (error) throw error;
  return data ?? [];
}

export async function getLeaveTransactions(opts?: {
  type?: LeaveType;
  limit?: number;
}): Promise<LeaveTransaction[]> {
  const supabase = await createClient();
  let q = supabase
    .from("leave_transactions")
    .select("*")
    .order("date", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.type) q = q.eq("leave_type", opts.type);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
