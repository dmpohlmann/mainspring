import { getSettings, getToilBalance, getLeaveBalances } from "@/lib/queries/dashboard";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const [settings, toilBalance, leaveBalances] = await Promise.all([
    getSettings(),
    getToilBalance(),
    getLeaveBalances(),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      <SettingsForm
        settings={settings}
        currentToilMinutes={toilBalance}
        leaveBalances={leaveBalances}
      />
    </div>
  );
}
