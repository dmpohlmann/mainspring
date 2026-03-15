"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { upsertSettings, initializeBalances } from "@/app/(authenticated)/settings/actions";
import type { Settings, LeaveBalance } from "@/lib/types/database";

interface SettingsFormProps {
  settings: Settings | null;
  currentToilMinutes: number;
  leaveBalances: LeaveBalance[];
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [standardDayHours, setStandardDayHours] = useState(
    String(Math.floor((settings?.standard_day_minutes ?? 450) / 60))
  );
  const [standardDayMinutes, setStandardDayMinutes] = useState(
    String((settings?.standard_day_minutes ?? 450) % 60)
  );
  const [lunchDuration, setLunchDuration] = useState(
    String(settings?.default_lunch_duration_minutes ?? 30)
  );
  const [annualDays, setAnnualDays] = useState(
    String(settings?.annual_leave_days_per_year ?? 20)
  );
  const [personalDays, setPersonalDays] = useState(
    String(settings?.personal_leave_days_per_year ?? 10)
  );
  const [fyMonth, setFyMonth] = useState(
    String(settings?.financial_year_start_month ?? 7)
  );
  const [anchorDate, setAnchorDate] = useState(
    settings?.pay_fortnight_anchor_date ?? "2026-01-15"
  );

  const [annualHours, setAnnualHours] = useState("");
  const [personalHours, setPersonalHours] = useState("");
  const [toilHours, setToilHours] = useState("");

  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await upsertSettings({
        standard_day_minutes: parseInt(standardDayHours) * 60 + parseInt(standardDayMinutes || "0"),
        default_lunch_duration_minutes: parseInt(lunchDuration),
        annual_leave_days_per_year: parseFloat(annualDays),
        personal_leave_days_per_year: parseFloat(personalDays),
        financial_year_start_month: parseInt(fyMonth),
        pay_fortnight_anchor_date: anchorDate,
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleInitializeBalances = async () => {
    setSaving(true);
    try {
      await initializeBalances({
        annual_hours: parseFloat(annualHours || "0"),
        personal_hours: parseFloat(personalHours || "0"),
        toil_hours: parseFloat(toilHours || "0"),
      });
      toast.success("Balances initialized");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initialize");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Day Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Standard Day Length</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="12"
                value={standardDayHours}
                onChange={(e) => setStandardDayHours(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">hours</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={standardDayMinutes}
                onChange={(e) => setStandardDayMinutes(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default Lunch Duration (minutes)</Label>
            <Input
              type="number"
              min="0"
              max="120"
              value={lunchDuration}
              onChange={(e) => setLunchDuration(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Annual Leave (days/year)</Label>
            <Input
              type="number"
              step="0.5"
              value={annualDays}
              onChange={(e) => setAnnualDays(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Personal Leave (days/year)</Label>
            <Input
              type="number"
              step="0.5"
              value={personalDays}
              onChange={(e) => setPersonalDays(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Financial Year Start Month</Label>
            <Input
              type="number"
              min="1"
              max="12"
              value={fyMonth}
              onChange={(e) => setFyMonth(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">7 = July (Australian FY)</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Pay Fortnight Anchor Date</Label>
            <Input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A known pay period start date (Thursday). All pay period boundaries are calculated from this anchor.
              Default: 15 January 2026.
            </p>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Initialize Balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set starting balances when first setting up the app. This will create
            initial balance records and audit trail transactions.
          </p>

          <div className="space-y-2">
            <Label>Annual Leave (hours)</Label>
            <Input
              type="number"
              step="0.25"
              value={annualHours}
              onChange={(e) => setAnnualHours(e.target.value)}
              placeholder="e.g. 112.5"
            />
          </div>

          <div className="space-y-2">
            <Label>Personal Leave (hours)</Label>
            <Input
              type="number"
              step="0.25"
              value={personalHours}
              onChange={(e) => setPersonalHours(e.target.value)}
              placeholder="e.g. 56.25"
            />
          </div>

          <div className="space-y-2">
            <Label>TOIL (hours)</Label>
            <Input
              type="number"
              step="0.25"
              value={toilHours}
              onChange={(e) => setToilHours(e.target.value)}
              placeholder="e.g. 0"
            />
          </div>

          <Button onClick={handleInitializeBalances} disabled={saving} variant="outline">
            {saving ? "Saving..." : "Initialize Balances"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
