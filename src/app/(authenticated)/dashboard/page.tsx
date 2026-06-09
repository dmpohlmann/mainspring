import { PanelStub } from "@/components/tui/panel-stub";

export default function DashboardPage() {
  return (
    <>
      <PanelStub
        panelId="balances"
        title="mainspring — ~/dashboard/balances"
        note="balances"
      />
      <PanelStub
        panelId="thisweek"
        title="mainspring — ~/dashboard/thisweek"
        note="this week"
      />
    </>
  );
}
