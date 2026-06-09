import { SettingsPanel } from "@/components/panels/settings-panel";
import { getSettings } from "@/lib/queries/settings";

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsPanel panelId="form" settings={settings} />;
}
