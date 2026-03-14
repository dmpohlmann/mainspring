import { getSettings, getFlexBalance, getLeaveBalances } from "@/lib/queries/dashboard";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const [settings, flexBalance, leaveBalances] = await Promise.all([
    getSettings(),
    getFlexBalance(),
    getLeaveBalances(),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      <SettingsForm
        settings={settings}
        currentFlexMinutes={flexBalance}
        leaveBalances={leaveBalances}
      />
    </div>
  );
}
