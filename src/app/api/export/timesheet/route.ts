import { createClient } from "@/lib/supabase/server";
import { toCSV } from "@/lib/utils/csv";
import { formatDateAU, formatTime, formatWorkedMinutes, formatToilMinutes, entryTypeLabel } from "@/lib/utils/format";
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

  const { data: entries, error } = await supabase
    .from("timesheet_entries")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "Date",
    "Day",
    "Type",
    "Start",
    "End",
    "Lunch Start",
    "Lunch End",
    "Worked",
    "TOIL",
    "Notes",
  ];

  const rows = (entries || []).map((e) => [
    formatDateAU(e.date),
    new Date(e.date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short" }),
    entryTypeLabel(e.entry_type),
    formatTime(e.start_time),
    formatTime(e.end_time),
    formatTime(e.lunch_start),
    formatTime(e.lunch_end),
    formatWorkedMinutes(e.worked_minutes),
    formatToilMinutes(e.toil_minutes),
    e.note || "",
  ]);

  const csv = toCSV(headers, rows);
  const filename = `timesheet_${startDate}_to_${endDate}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
