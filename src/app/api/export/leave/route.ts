import { createClient } from "@/lib/supabase/server";
import { toCSV } from "@/lib/utils/csv";
import { formatDateAU } from "@/lib/utils/format";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start") || "2020-01-01";
  const endDate = searchParams.get("end") || "2099-12-31";
  const leaveType = searchParams.get("type");

  let query = supabase
    .from("leave_transactions")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  if (leaveType) {
    query = query.eq("leave_type", leaveType);
  }

  const { data: transactions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = ["Date", "Leave Type", "Hours", "Description"];

  const rows = (transactions || []).map((t) => [
    formatDateAU(t.date),
    t.leave_type.charAt(0).toUpperCase() + t.leave_type.slice(1),
    String(t.hours),
    t.description,
  ]);

  const csv = toCSV(headers, rows);
  const filename = `leave_transactions_${startDate}_to_${endDate}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
