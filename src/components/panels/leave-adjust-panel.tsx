"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TerminalFrame } from "@/components/tui/terminal-frame";
import { TokenSelect } from "@/components/tui/token-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShell } from "@/components/shell/shell-context";
import { typeCode, LEAVE_TYPE_SEGMENT } from "@/lib/tui/types";
import { adjustLeaveBalance } from "@/lib/actions/leave";
import type { LeaveType } from "@/lib/types/database";

const TYPE_OPTIONS = [
  { value: "annual", code: "REC", label: "recreation (annual) leave" },
  { value: "personal", code: "PRS", label: "personal leave" },
];

export function LeaveAdjustPanel({ panelId }: { panelId: string }) {
  const router = useRouter();
  const { activePanel } = useShell();
  const [type, setType] = useState<LeaveType>("annual");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    const h = parseFloat(hours);
    if (!Number.isFinite(h) || !reason.trim()) {
      toast.error("enter hours (e.g. +5 or -7.5) and a reason");
      return;
    }
    setSaving(true);
    try {
      await adjustLeaveBalance(type, h, reason.trim());
      toast.success(
        `${h >= 0 ? "+" : "−"}${Math.abs(h).toFixed(2)}h ${typeCode(
          LEAVE_TYPE_SEGMENT[type]
        )} — ${reason.trim()}`
      );
      router.refresh();
      setHours("");
      setReason("");
    } catch {
      toast.error("adjustment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TerminalFrame
      panelId={panelId}
      active={activePanel === panelId}
      title="mainspring — ~/leave/adjust"
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="w-16 uppercase text-muted-foreground">type</span>
          <TokenSelect
            value={type}
            options={TYPE_OPTIONS}
            onChange={(v) => setType(v as LeaveType)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 uppercase text-muted-foreground">hours</span>
          <Input
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="+5.0 or -7.5"
            inputMode="decimal"
            className="w-28"
          />
          <span className="text-muted-foreground">+ credit · − debit</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 uppercase text-muted-foreground">reason</span>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="initial balance, correction, cash-out…"
            className="flex-1"
          />
        </div>
        <Button size="sm" onClick={apply} disabled={saving}>
          apply adjustment
        </Button>
      </div>
    </TerminalFrame>
  );
}
