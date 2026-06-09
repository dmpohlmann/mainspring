"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TerminalFrame } from "@/components/tui/terminal-frame";
import { TokenSelect } from "@/components/tui/token-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShell } from "@/components/shell/shell-context";
import { upsertSettings } from "@/lib/actions/settings";
import type { Settings } from "@/lib/types/database";

const WEEKDAYS = [
  { value: "0", code: "SUN", label: "Sunday" },
  { value: "1", code: "MON", label: "Monday" },
  { value: "2", code: "TUE", label: "Tuesday" },
  { value: "3", code: "WED", label: "Wednesday" },
  { value: "4", code: "THU", label: "Thursday" },
  { value: "5", code: "FRI", label: "Friday" },
  { value: "6", code: "SAT", label: "Saturday" },
];

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"].map((s) => ({
  value: s,
  code: s,
  label: s,
}));

// Defaults mirror the migration seed (7.5h day, 1h lunch, AU FY, Thu pay start).
const DEFAULTS = {
  standardDayHours: "7.5",
  lunchMinutes: "60",
  annualDays: "20",
  personalDays: "15",
  fyStartMonth: "7",
  anchorDate: "2026-01-15",
  ppStartDay: "4",
  state: "QLD",
};

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Label className="w-40 shrink-0 uppercase text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <span className="text-muted-foreground/60">{hint}</span>}
    </div>
  );
}

export function SettingsPanel({
  panelId,
  settings,
}: {
  panelId: string;
  settings: Settings | null;
}) {
  const router = useRouter();
  const { activePanel } = useShell();

  const [standardDayHours, setStandardDayHours] = useState(
    settings ? String(settings.standard_day_minutes / 60) : DEFAULTS.standardDayHours
  );
  const [lunchMinutes, setLunchMinutes] = useState(
    settings ? String(settings.default_lunch_duration_minutes) : DEFAULTS.lunchMinutes
  );
  const [annualDays, setAnnualDays] = useState(
    settings ? String(settings.annual_leave_days_per_year) : DEFAULTS.annualDays
  );
  const [personalDays, setPersonalDays] = useState(
    settings ? String(settings.personal_leave_days_per_year) : DEFAULTS.personalDays
  );
  const [fyStartMonth, setFyStartMonth] = useState(
    settings ? String(settings.financial_year_start_month) : DEFAULTS.fyStartMonth
  );
  const [anchorDate, setAnchorDate] = useState(
    settings?.pay_fortnight_anchor_date ?? DEFAULTS.anchorDate
  );
  const [ppStartDay, setPpStartDay] = useState(
    settings ? String(settings.pay_fortnight_start_day) : DEFAULTS.ppStartDay
  );
  const [state, setState] = useState(settings?.state ?? DEFAULTS.state);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const stdHours = parseFloat(standardDayHours);
    const lunch = parseInt(lunchMinutes, 10);
    const annual = parseFloat(annualDays);
    const personal = parseFloat(personalDays);
    const fyMonth = parseInt(fyStartMonth, 10);

    if (
      !Number.isFinite(stdHours) ||
      stdHours <= 0 ||
      !Number.isFinite(lunch) ||
      lunch < 0 ||
      !Number.isFinite(annual) ||
      !Number.isFinite(personal) ||
      !(fyMonth >= 1 && fyMonth <= 12) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)
    ) {
      toast.error("check the field values");
      return;
    }

    setSaving(true);
    try {
      await upsertSettings({
        standard_day_minutes: Math.round(stdHours * 60),
        default_lunch_duration_minutes: lunch,
        annual_leave_days_per_year: annual,
        personal_leave_days_per_year: personal,
        financial_year_start_month: fyMonth,
        pay_fortnight_anchor_date: anchorDate,
        pay_fortnight_start_day: parseInt(ppStartDay, 10),
        state,
      });
      toast.success("Settings saved");
      router.refresh();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TerminalFrame
      panelId={panelId}
      active={activePanel === panelId}
      title="mainspring — ~/settings"
    >
      <div className="space-y-3 text-sm">
        <Row label="standard day" hint="hours (e.g. 7.5)">
          <Input
            value={standardDayHours}
            onChange={(e) => setStandardDayHours(e.target.value)}
            inputMode="decimal"
            className="w-24"
          />
        </Row>
        <Row label="default lunch" hint="minutes">
          <Input
            value={lunchMinutes}
            onChange={(e) => setLunchMinutes(e.target.value)}
            inputMode="numeric"
            className="w-24"
          />
        </Row>
        <Row label="annual leave / yr" hint="days">
          <Input
            value={annualDays}
            onChange={(e) => setAnnualDays(e.target.value)}
            inputMode="decimal"
            className="w-24"
          />
        </Row>
        <Row label="personal leave / yr" hint="days">
          <Input
            value={personalDays}
            onChange={(e) => setPersonalDays(e.target.value)}
            inputMode="decimal"
            className="w-24"
          />
        </Row>
        <Row label="FY start month" hint="1–12 (7 = July, AU)">
          <Input
            value={fyStartMonth}
            onChange={(e) => setFyStartMonth(e.target.value)}
            inputMode="numeric"
            className="w-24"
          />
        </Row>
        <Row label="pay anchor date" hint="a known fortnight start (YYYY-MM-DD)">
          <Input
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-36"
          />
        </Row>
        <Row label="pay start day">
          <TokenSelect value={ppStartDay} options={WEEKDAYS} onChange={setPpStartDay} />
        </Row>
        <Row label="state">
          <TokenSelect value={state} options={STATES} onChange={setState} />
        </Row>

        <div className="border-t border-dashed border-border pt-3">
          <Button size="sm" onClick={save} disabled={saving}>
            save settings
          </Button>
        </div>
      </div>
    </TerminalFrame>
  );
}
