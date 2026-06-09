import { PanelStub } from "@/components/tui/panel-stub";

export default function TimesheetPage() {
  return (
    <>
      <PanelStub
        panelId="week1"
        title="mainspring — ~/timesheet/week1"
        note="week 1"
      />
      <PanelStub
        panelId="week2"
        title="mainspring — ~/timesheet/week2"
        note="week 2"
      />
      <PanelStub
        panelId="totals"
        title="mainspring — ~/timesheet/totals"
        note="fortnight totals"
      />
    </>
  );
}
