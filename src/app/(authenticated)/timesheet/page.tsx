import { Suspense } from "react";
import { TimesheetEntryPage } from "@/components/timesheet/timesheet-entry-page";

export default function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Timesheet Entry</h2>
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <TimesheetEntryPageWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TimesheetEntryPageWrapper({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  return <TimesheetEntryPage initialDate={params.date} />;
}
