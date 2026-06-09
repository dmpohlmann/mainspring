import { PanelStub } from "@/components/tui/panel-stub";

export default function LeavePage() {
  return (
    <>
      <PanelStub
        panelId="balances"
        title="mainspring — ~/leave/balances"
        note="leave balances"
      />
      <PanelStub
        panelId="transactions"
        title="mainspring — ~/leave/transactions"
        note="transactions"
      />
      <PanelStub
        panelId="adjust"
        title="mainspring — ~/leave/adjust"
        note="manual adjustment"
      />
    </>
  );
}
