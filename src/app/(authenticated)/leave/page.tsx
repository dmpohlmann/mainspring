import { getLeaveBalances, getToilBalance } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import { LeavePageClient } from "@/components/leave/leave-page-client";

export default async function LeavePage() {
  const supabase = await createClient();

  const [leaveBalances, toilBalance, transactionsResult] = await Promise.all([
    getLeaveBalances(),
    getToilBalance(),
    supabase
      .from("leave_transactions")
      .select("*")
      .order("date", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Leave Management</h2>
      <LeavePageClient
        leaveBalances={leaveBalances}
        toilBalance={toilBalance}
        transactions={transactionsResult.data || []}
      />
    </div>
  );
}
